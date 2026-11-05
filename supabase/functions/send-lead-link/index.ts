// Sends a /download or /swimweek referral link to an outbound call lead via
// SMS (Twilio) + Email (Resend), and logs a 'link_sent' event in
// qr_page_visits so it shows in the Download Tracker.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { sendDirectSms } from "../_shared/twilio.ts";
import { sendDirectEmail } from "../_shared/resend.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = "https://www.rideforti.com";

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return null;
  if (raw.trim().startsWith("+")) return "+" + digits;
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return "+" + digits;
}

async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const res = await sendDirectSms({ to, body });
  return { ok: res.success, error: res.error };
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const res = await sendDirectEmail({
    to,
    subject,
    html,
    from: "Forti <noreply@rideforti.com>",
  });
  return { ok: res.success, error: res.error };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  try {
    const auth = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { contact_id, source_page } = body || {};
    if (!contact_id || (source_page !== "download" && source_page !== "swimweek")) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_payload" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: contact, error: cErr } = await db
      .from("outbound_call_contacts")
      .select("id, name, first_name, last_name, phone, email")
      .eq("id", contact_id)
      .maybeSingle();
    if (cErr || !contact) {
      return new Response(JSON.stringify({ ok: false, error: "contact_not_found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const path = source_page === "swimweek" ? "/swimweek" : "/download";
    const link = `${SITE_URL}${path}?ref=${userId}&utm_source=sms`;
    const greetName = (contact.first_name || contact.name || "there").toString().split(" ")[0];
    const isSwim = source_page === "swimweek";
    const eventLabel = isSwim ? "Swim Week" : "the event";
    const subject = isSwim
      ? "Forti — Official Ride & Transportation for Swim Week (limited rides)"
      : "Forti — Your Official Ride & Transportation Partner (limited rides)";
    const smsBody = isSwim
      ? `Hi ${greetName}, it's Forti — the official ride & transportation partner for Swim Week. Parking will be extremely limited, and rides are capped. Reserve your ride now, spots are limited: ${link}`
      : `Hi ${greetName}, it's Forti — your official ride & transportation partner. Parking will be limited at the venue and rides are capped. Lock yours in: ${link}`;
    const ctaLabel = isSwim ? "Reserve Your Ride" : "Download the App";
    const intro = isSwim
      ? `We're proud to be the <strong>official ride share and transportation partner for Swim Week</strong>. Parking at the venues will be extremely limited this year, so we're encouraging guests to book in advance — rides are capped and going quickly.`
      : `We're proud to be your <strong>official ride share and transportation partner</strong>. Parking at the venue will be limited, so we're encouraging guests to book in advance — rides are capped and going quickly.`;
    const previewText = isSwim
      ? "Official ride & transportation for Swim Week — rides are limited."
      : "Your official ride & transportation partner — rides are limited.";
    const heroTitle = isSwim ? "Official Ride Partner — Swim Week" : "Your Official Ride Partner";
    const ctaSubline = isSwim
      ? "Reserve your Forti ride for Swim Week before availability runs out."
      : "Download Forti and secure your ride before availability runs out.";

    const htmlBody = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark only" />
    <meta name="supported-color-schemes" content="dark only" />
    <title>Forti</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e8e6e1;-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0a0a0a;">${previewText}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#111111;border:1px solid rgba(212,176,106,0.18);border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.32em;font-weight:300;background:linear-gradient(180deg,#f5e8c8 0%,#d4b06a 50%,#a8864a 100%);-webkit-background-clip:text;background-clip:text;color:#d4b06a;text-transform:uppercase;">FORTI</div>
                <div style="height:1px;background:linear-gradient(90deg,rgba(212,176,106,0) 0%,rgba(212,176,106,0.45) 50%,rgba(212,176,106,0) 100%);margin:20px 0 0 0;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#8a8579;margin-bottom:14px;">${isSwim ? "Swim Week · Miami" : "Private Mobility"}</div>
                <h1 style="margin:0 0 18px 0;font-weight:300;font-size:26px;line-height:1.25;letter-spacing:0.01em;color:#f5f1e6;">${heroTitle}</h1>
                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#bdb9ae;">Hi ${greetName},</p>
                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#bdb9ae;">${intro}</p>
                <p style="margin:0 0 28px 0;font-size:15px;line-height:1.7;color:#bdb9ae;">${ctaSubline}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px 8px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="border-radius:10px;background:linear-gradient(180deg,#f0e0bd 0%,#d4b06a 55%,#a8864a 100%);box-shadow:0 8px 24px rgba(212,176,106,0.18);">
                      <a href="${link}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#0a0a0a;text-decoration:none;border-radius:10px;">${ctaLabel}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:14px 32px 28px 32px;">
                <a href="${link}" style="font-size:11px;color:#6e6a60;text-decoration:none;word-break:break-all;letter-spacing:0.02em;">${link}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <div style="height:1px;background:linear-gradient(90deg,rgba(212,176,106,0) 0%,rgba(212,176,106,0.25) 50%,rgba(212,176,106,0) 100%);"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 28px 32px;" align="center">
                <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#6e6a60;">Security-First Private Mobility</div>
                <div style="margin-top:6px;font-size:11px;color:#56524a;letter-spacing:0.04em;">rideforti.com</div>
              </td>
            </tr>
          </table>
          <div style="max-width:560px;margin:18px auto 0;font-size:10px;color:#3f3c36;letter-spacing:0.08em;text-align:center;">© ${new Date().getFullYear()} Forti. All rights reserved.</div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const toPhone = normalizePhone(contact.phone);

    if (!toPhone) {
      return new Response(
        JSON.stringify({ ok: false, error: "no_phone" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const smsRes = await sendSms(toPhone, smsBody);
    const emailRes = { ok: false, error: "skipped" as const };

    if (!smsRes.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: "send_failed", sms: smsRes }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Log to qr_page_visits so the Download Tracker can reflect this send.
    await db.from("qr_page_visits").insert({
      ambassador_id: userId,
      device_type: "lead_outreach",
      source_page,
      event_type: "link_sent",
      attribution_source: "sms",
      referrer: contact.id,
    });

    // Add an automatic note on the lead for traceability.
    await db.from("outbound_call_contact_notes").insert({
      contact_id: contact.id,
      author_id: userId,
      body: `Sent ${path} link via SMS: ${link}`,
    });

    return new Response(
      JSON.stringify({ ok: true, sms: smsRes, email: emailRes, link }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("send-lead-link error", e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? "unknown" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
