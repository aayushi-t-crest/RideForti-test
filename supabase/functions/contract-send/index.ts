import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendDirectEmail } from "../_shared/resend.ts";
import { sendDirectSms } from "../_shared/twilio.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { contractId } = await req.json();
    if (!contractId) {
      return new Response(JSON.stringify({ error: "contractId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: contract, error: cErr } = await admin
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .maybeSingle();
    if (cErr || !contract) {
      return new Response(JSON.stringify({ error: "Contract not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const origin = req.headers.get("origin") || "https://rideforti.com";
    const signUrl = `${origin}/contract/${contract.sign_token}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0a0a0a;color:#fff;">
        <h2 style="color:#d4af37;">Forti — Contract for your signature</h2>
        <p>Hi ${contract.recipient_name},</p>
        <p>You have a new contract titled <strong>${contract.title}</strong> awaiting your signature.</p>
        ${contract.description ? `<p style="color:#aaa;">${contract.description}</p>` : ""}
        ${contract.expires_at ? `<p style="color:#aaa;font-size:13px;">Please sign by ${new Date(contract.expires_at).toLocaleDateString()}.</p>` : ""}
        <p style="margin:32px 0;">
          <a href="${signUrl}" style="background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
            Review &amp; Sign Contract
          </a>
        </p>
        <p style="font-size:12px;color:#777;">If the button does not work, copy this link: ${signUrl}</p>
      </div>`;

    // SEND EMAIL via direct Resend helper
    let emailOk = false;
    if (contract.recipient_email) {
      const emailRes = await sendDirectEmail({
        to: contract.recipient_email,
        from: "Forti Contracts <contracts@rideforti.com>",
        subject: `Contract for signature: ${contract.title}`,
        html,
      });
      emailOk = emailRes.success;
    }

    // SEND SMS via direct Twilio helper
    let smsOk = false;
    if (contract.recipient_phone) {
      const body = `Forti: You have a contract "${contract.title}" to sign. Review & sign here: ${signUrl}`;
      const smsRes = await sendDirectSms({
        to: contract.recipient_phone,
        body,
      });
      smsOk = smsRes.success;
    }

    await admin
      .from("contracts")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_via_email: emailOk,
        sent_via_sms: smsOk,
      })
      .eq("id", contractId);

    await admin.from("contract_events").insert({
      contract_id: contractId,
      event_type: "sent",
      metadata: { email: emailOk, sms: smsOk },
    });

    return new Response(JSON.stringify({ success: true, emailOk, smsOk, signUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("contract-send error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
