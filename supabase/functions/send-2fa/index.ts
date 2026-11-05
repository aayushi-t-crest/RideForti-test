import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendDirectSms } from "../_shared/twilio.ts";
import { sendDirectEmail } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { action } = body;

    // ── send_code ──────────────────────────────────────────
    if (action === "send_code") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401);

      const channel: "email" | "sms" = body.channel === "sms" ? "sms" : "email";

      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
      if (userErr || !user) return json({ error: "Unauthorized" }, 401);

      const userId = user.id;
      const email = user.email!;
      let phone =
        (body.phone as string | undefined) ||
        (user.user_metadata?.phone as string | undefined) ||
        (user.user_metadata?.phone_number as string | undefined) ||
        user.phone ||
        "";

      // Fallback: look up via admin API (covers cases where the user JWT is stale)
      if (!phone && channel === "sms") {
        const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        phone =
          (adminUser?.user?.phone as string | undefined) ||
          (adminUser?.user?.user_metadata?.phone as string | undefined) ||
          (adminUser?.user?.user_metadata?.phone_number as string | undefined) ||
          "";
      }

      // Rate limit: max 5 codes per user per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from("login_2fa_codes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", oneHourAgo);

      if ((count ?? 0) >= 5) {
        return json({ error: "Too many codes requested. Try again later." }, 429);
      }

      // Generate 6-digit code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      await supabaseAdmin.from("login_2fa_codes").insert({
        user_id: userId,
        code,
        expires_at: expiresAt,
      });

      // Send via chosen channel
      if (channel === "sms") {
        if (!phone) {
          return json({ error: "No phone number on file. Use email instead." }, 400);
        }

        const smsRes = await sendDirectSms({
          to: phone,
          body: `Your Forti admin verification code is ${code}. Expires in 10 minutes.`,
        });

        if (!smsRes.success) {
          console.error("SMS send error:", smsRes.error);
          return json({ error: "Failed to send SMS" }, 500);
        }

        return json({
          success: true,
          message: smsRes.isMock
            ? `Code simulated in Dev Mode: ${code}`
            : "Code sent via SMS",
          channel: "sms",
        });
      }

      // Default: email via direct Resend helper (with zero-key dev fallback)
      const emailRes = await sendDirectEmail({
        to: email,
        from: "Forti Security <no-reply@rideforti.com>",
        subject: "Your Forti Login Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; color: #111; margin-bottom: 8px;">Verification Code</h1>
            <p style="color: #555; font-size: 14px; margin-bottom: 24px;">Enter the code below to complete your login to the Forti admin panel.</p>
            <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111;">${code}</span>
            </div>
            <p style="color: #999; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
          </div>
        `,
      });

      if (!emailRes.success) {
        console.error("Email send error:", emailRes.error);
        return json({ error: "Failed to send verification email" }, 500);
      }

      return json({
        success: true,
        message: emailRes.isMock
          ? `Code simulated in Dev Mode: ${code}`
          : "Code sent",
        channel: "email",
      });
    }

    // ── verify_code ────────────────────────────────────────
    if (action === "verify_code") {
      const { user_id, code, remember_me } = body;
      if (!user_id || !code) return json({ error: "Missing fields" }, 400);

      const now = new Date().toISOString();

      const { data: codeRow } = await supabaseAdmin
        .from("login_2fa_codes")
        .select("*")
        .eq("user_id", user_id)
        .eq("code", code)
        .eq("used", false)
        .gte("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!codeRow) {
        return json({ error: "Invalid or expired code" }, 401);
      }

      // Mark used
      await supabaseAdmin
        .from("login_2fa_codes")
        .update({ used: true })
        .eq("id", codeRow.id);

      let device_token: string | null = null;

      if (remember_me) {
        device_token = crypto.randomUUID();
        const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabaseAdmin.from("trusted_devices").insert({
          user_id,
          device_token,
          expires_at: sevenDays,
        });
      }

      return json({ success: true, device_token });
    }

    // ── check_trust ────────────────────────────────────────
    if (action === "check_trust") {
      const { user_id, device_token } = body;
      if (!user_id || !device_token) return json({ trusted: false });

      const now = new Date().toISOString();
      const { data } = await supabaseAdmin
        .from("trusted_devices")
        .select("id")
        .eq("user_id", user_id)
        .eq("device_token", device_token)
        .gte("expires_at", now)
        .maybeSingle();

      return json({ trusted: !!data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("send-2fa error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
