// Forti Ambassador Academy — auth endpoints (invite, register, login, otp-verify, me, logout, update-profile)
import {
  corsHeaders, svc, hashPassword, verifyPassword, makeToken, makeOtp,
  sendSms, sendEmail, getAmbassadorFromSession,
} from "../_shared/ambassador.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const action = url.searchParams.get("action") || body.action;
    const db = svc();

    // ---- ADMIN: create invite ----
    if (action === "create-invite") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) return json({ error: "unauthorized" }, 401);
      const userClient = (await import("https://esm.sh/@supabase/supabase-js@2.45.0")).createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: u } = await userClient.auth.getUser();
      if (!u?.user) return json({ error: "unauthorized" }, 401);
      const { data: roleRow } = await db.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (!roleRow) return json({ error: "forbidden" }, 403);

      const { first_name, last_name, email, phone, track } = body;
      if (!email || !phone) return json({ error: "email and phone required" }, 400);
      const token = makeToken(24);
      const { data: inv, error } = await db.from("ambassador_invites").insert({
        token, first_name, last_name, email, phone,
        track: track || "open", created_by: u.user.id,
      }).select().single();
      if (error) return json({ error: error.message }, 500);

      const baseLink = body.base_url ? `${body.base_url}/academy/invite/${token}` : `/academy/invite/${token}`;
      await sendSms(phone, `Forti Ambassador Academy: Complete your signup here: ${baseLink}`);
      await sendEmail(email, "Forti Ambassador Academy — Complete your signup",
        `<p>Hi ${first_name || ""},</p><p>You've been invited to join the Forti Ambassador Academy.</p><p><a href="${baseLink}">Click here to complete your signup</a>. Link expires in 14 days.</p>`);
      return json({ ok: true, invite: inv, link: baseLink });
    }

    // ---- ADMIN: resend invite ----
    if (action === "resend-invite") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) return json({ error: "unauthorized" }, 401);
      const userClient = (await import("https://esm.sh/@supabase/supabase-js@2.45.0")).createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: u } = await userClient.auth.getUser();
      if (!u?.user) return json({ error: "unauthorized" }, 401);
      const { data: roleRow } = await db.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (!roleRow) return json({ error: "forbidden" }, 403);

      const { invite_id } = body;
      if (!invite_id) return json({ error: "invite_id required" }, 400);
      const { data: inv } = await db.from("ambassador_invites").select("*").eq("id", invite_id).maybeSingle();
      if (!inv) return json({ error: "invite not found" }, 404);
      if (inv.status !== "pending") return json({ error: "invite already used or revoked" }, 400);

      // Extend expiration by 14 days from now
      const newExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      await db.from("ambassador_invites").update({ expires_at: newExpiry }).eq("id", inv.id);

      const baseLink = body.base_url ? `${body.base_url}/academy/invite/${inv.token}` : `/academy/invite/${inv.token}`;
      await sendSms(inv.phone, `Forti Ambassador Academy: Complete your signup here: ${baseLink}`);
      await sendEmail(inv.email, "Forti Ambassador Academy — Reminder: Complete your signup",
        `<p>Hi ${inv.first_name || ""},</p><p>This is a reminder to complete your Forti Ambassador Academy signup.</p><p><a href="${baseLink}">Click here to complete your signup</a>. Link expires in 14 days.</p>`);
      return json({ ok: true, link: baseLink });
    }

    // ---- PUBLIC: get invite by token ----
    if (action === "get-invite") {
      const { token } = body;
      const { data } = await db.from("ambassador_invites")
        .select("id, first_name, last_name, email, phone, track, status, expires_at")
        .eq("token", token).maybeSingle();
      if (!data) return json({ error: "invalid invite" }, 404);
      if (data.status !== "pending") return json({ error: "invite already used or revoked" }, 400);
      if (new Date(data.expires_at) < new Date()) return json({ error: "invite expired" }, 400);
      return json({ invite: data });
    }

    // ---- PUBLIC: register ambassador from invite ----
    if (action === "register") {
      const { token, first_name, last_name, phone, password, instagram_handle, tiktok_handle, city } = body;
      if (!password || password.length < 8) return json({ error: "password must be 8+ chars" }, 400);
      const { data: inv } = await db.from("ambassador_invites").select("*").eq("token", token).maybeSingle();
      if (!inv || inv.status !== "pending" || new Date(inv.expires_at) < new Date()) {
        return json({ error: "invalid or expired invite" }, 400);
      }
      const { data: existing } = await db.from("ambassador_drivers").select("id").eq("email", inv.email).maybeSingle();
      if (existing) return json({ error: "account already exists" }, 400);

      const password_hash = await hashPassword(password);
      const { data: created, error } = await db.from("ambassador_drivers").insert({
        first_name: first_name || inv.first_name,
        last_name: last_name || inv.last_name,
        email: inv.email,
        phone: phone || inv.phone,
        password_hash,
        track: inv.track,
        invite_id: inv.id,
        instagram_handle: instagram_handle || null,
        tiktok_handle: tiktok_handle || null,
        city: city || null,
      }).select("id, qr_code").single();
      if (error) return json({ error: error.message }, 500);

      // Generate referral_link from base_url + qr_code
      const referral = body.base_url ? `${body.base_url}/download?ref=${created.qr_code}` : null;
      if (referral) {
        await db.from("ambassador_drivers").update({ referral_link: referral }).eq("id", created.id);
      }
      await db.from("ambassador_invites").update({ status: "used", used_at: new Date().toISOString() }).eq("id", inv.id);
      return json({ ok: true, ambassador_id: created.id });
    }

    // ---- PUBLIC: login (email + password) → trigger SMS OTP ----
    if (action === "login") {
      const { email, password } = body;
      const { data: row } = await db.from("ambassador_drivers")
        .select("id, password_hash, phone, first_name, status").eq("email", email?.toLowerCase().trim()).maybeSingle();
      if (!row || row.status !== "active") return json({ error: "invalid credentials" }, 401);
      const ok = await verifyPassword(password, row.password_hash);
      if (!ok) return json({ error: "invalid credentials" }, 401);

      await db.from("ambassador_otp_codes").update({ used: true }).eq("ambassador_id", row.id).eq("used", false);
      const code = makeOtp();
      await db.from("ambassador_otp_codes").insert({ ambassador_id: row.id, code });
      await sendSms(row.phone, `Forti Ambassador login code: ${code} (expires in 10 min)`);
      return json({ ok: true, otp_required: true, masked_phone: maskPhone(row.phone) });
    }

    // ---- PUBLIC: verify OTP → issue session ----
    if (action === "verify-otp") {
      const { email, code } = body;
      const { data: row } = await db.from("ambassador_drivers")
        .select("id, status").eq("email", email?.toLowerCase().trim()).maybeSingle();
      if (!row || row.status !== "active") return json({ error: "invalid" }, 401);
      const { data: otp } = await db.from("ambassador_otp_codes")
        .select("id, expires_at").eq("ambassador_id", row.id).eq("code", code).eq("used", false)
        .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).maybeSingle();
      if (!otp) return json({ error: "invalid or expired code" }, 401);
      await db.from("ambassador_otp_codes").update({ used: true }).eq("id", otp.id);

      const session_token = makeToken(32);
      await db.from("ambassador_sessions").insert({
        ambassador_id: row.id, session_token,
        ip: req.headers.get("x-forwarded-for") || null,
        user_agent: req.headers.get("user-agent") || null,
      });
      await db.from("ambassador_drivers").update({ last_login_at: new Date().toISOString() }).eq("id", row.id);
      return json({ ok: true, session_token });
    }

    // ---- AUTH: me ----
    if (action === "me") {
      const u = await getAmbassadorFromSession(req);
      if (!u) return json({ error: "unauthorized" }, 401);
      const { data } = await db.from("ambassador_drivers").select(
        "id, first_name, last_name, email, phone, track, current_level, forti_score, status, instagram_handle, tiktok_handle, city, qr_code, referral_link, created_at"
      ).eq("id", u.id).single();
      return json({ ambassador: data });
    }

    // ---- AUTH: update-profile (social handles, city) ----
    if (action === "update-profile") {
      const u = await getAmbassadorFromSession(req);
      if (!u) return json({ error: "unauthorized" }, 401);
      const { instagram_handle, tiktok_handle, city } = body;
      await db.from("ambassador_drivers").update({
        instagram_handle: instagram_handle ?? null,
        tiktok_handle: tiktok_handle ?? null,
        city: city ?? null,
      }).eq("id", u.id);
      return json({ ok: true });
    }

    // ---- AUTH: logout ----
    if (action === "logout") {
      const token = req.headers.get("x-ambassador-session");
      if (token) await db.from("ambassador_sessions").delete().eq("session_token", token);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("ambassador-auth error", e);
    return json({ error: String((e as Error).message) }, 500);
  }
});

function maskPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.length < 4) return "***";
  return `***-***-${d.slice(-4)}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
