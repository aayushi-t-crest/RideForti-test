// Cron-driven support ticket escalation notifier.
// Sends SMS + Email alerts to tagged escalation contacts when an open ticket
// crosses a response-time or ticket-age threshold.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendDirectSms } from "../_shared/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIER_RANK: Record<string, number> = {
  urgent: 1,
  critical: 2,
  imminent: 3,
  catastrophic: 4,
};

type Tier = "urgent" | "critical" | "imminent" | "catastrophic";
type Kind = "response" | "age";

interface Settings {
  response_urgent_min: number;
  response_critical_min: number;
  response_imminent_min: number;
  response_catastrophic_min: number;
  age_urgent_min: number;
  age_critical_min: number;
  age_imminent_min: number;
  age_catastrophic_min: number;
}

interface Contact {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  min_tier: string;
  notify_sms: boolean;
  notify_email: boolean;
}

interface Ticket {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  status: string;
  created_at: string;
  last_user_message_at: string | null;
}

function tierForElapsed(elapsedMin: number, t: { urgent: number; critical: number; imminent: number; catastrophic: number }): Tier | null {
  if (elapsedMin >= t.catastrophic) return "catastrophic";
  if (elapsedMin >= t.imminent) return "imminent";
  if (elapsedMin >= t.critical) return "critical";
  if (elapsedMin >= t.urgent) return "urgent";
  return null;
}

async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const res = await sendDirectSms({ to, body });
  return { ok: res.success, error: res.error };
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return { ok: false, error: "Resend not configured" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Forti Support <support@rideforti.com>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const summary = { processed: 0, alertsSent: 0, errors: [] as string[] };

  try {
    const { data: settingsRow } = await supabase
      .from("support_escalation_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settingsRow) {
      return new Response(JSON.stringify({ error: "No escalation settings configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const settings = settingsRow as Settings;

    const { data: contactsData } = await supabase
      .from("support_escalation_contacts")
      .select("*");
    const contacts = (contactsData ?? []) as Contact[];

    if (contacts.length === 0) {
      return new Response(JSON.stringify({ ok: true, summary, note: "No escalation contacts configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ticketsData } = await supabase
      .from("support_tickets")
      .select("id, first_name, last_name, email, subject, status, created_at, last_user_message_at")
      .neq("status", "closed")
      .neq("status", "resolved");
    const tickets = (ticketsData ?? []) as Ticket[];

    const now = Date.now();

    for (const ticket of tickets) {
      summary.processed++;

      const ageMin = (now - new Date(ticket.created_at).getTime()) / 60000;
      const responseAnchor = ticket.last_user_message_at ?? ticket.created_at;
      const responseMin = (now - new Date(responseAnchor).getTime()) / 60000;

      const ageTier = tierForElapsed(ageMin, {
        urgent: settings.age_urgent_min,
        critical: settings.age_critical_min,
        imminent: settings.age_imminent_min,
        catastrophic: settings.age_catastrophic_min,
      });
      const respTier = tierForElapsed(responseMin, {
        urgent: settings.response_urgent_min,
        critical: settings.response_critical_min,
        imminent: settings.response_imminent_min,
        catastrophic: settings.response_catastrophic_min,
      });

      const buckets: Array<{ kind: Kind; tier: Tier; elapsedMin: number }> = [];
      if (ageTier) buckets.push({ kind: "age", tier: ageTier, elapsedMin: Math.floor(ageMin) });
      if (respTier) buckets.push({ kind: "response", tier: respTier, elapsedMin: Math.floor(responseMin) });

      for (const bucket of buckets) {
        const eligible = contacts.filter(
          (c) => TIER_RANK[bucket.tier] >= (TIER_RANK[c.min_tier] ?? 99)
        );
        for (const contact of eligible) {
          const { data: existing } = await supabase
            .from("support_escalation_log")
            .select("id")
            .eq("ticket_id", ticket.id)
            .eq("contact_id", contact.id)
            .eq("tier", bucket.tier)
            .eq("kind", bucket.kind)
            .maybeSingle();
          if (existing) continue;

          const channels: string[] = [];
          const tierLabel = bucket.tier.toUpperCase();
          const kindLabel = bucket.kind === "response" ? "no response" : "ticket open";
          const customerName = `${ticket.first_name} ${ticket.last_name}`.trim();
          const smsBody =
            `[Forti Support – ${tierLabel}] Ticket from ${customerName} (${ticket.email}): "${ticket.subject}". ` +
            `${kindLabel} for ${bucket.elapsedMin}m. Open the admin inbox to respond.`;

          if (contact.notify_sms && contact.phone) {
            const r = await sendSms(contact.phone, smsBody);
            if (r.ok) {
              channels.push("sms");
              summary.alertsSent++;
            } else {
              summary.errors.push(`sms ${contact.id}: ${r.error}`);
            }
          }
          if (contact.notify_email && contact.email) {
            const subject = `[${tierLabel}] Forti Support — "${ticket.subject}"`;
            const html = `
              <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0a0a0a;color:#fff;">
                <h2 style="color:#d4af37;margin:0 0 8px;">Escalation: ${tierLabel}</h2>
                <p style="margin:0 0 16px;color:#ccc;">A support ticket has crossed the <strong>${tierLabel}</strong> ${bucket.kind === "response" ? "response-time" : "ticket-age"} threshold.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:6px 0;color:#888;">Customer</td><td style="padding:6px 0;">${customerName}</td></tr>
                  <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;">${ticket.email}</td></tr>
                  <tr><td style="padding:6px 0;color:#888;">Subject</td><td style="padding:6px 0;">${ticket.subject}</td></tr>
                  <tr><td style="padding:6px 0;color:#888;">${kindLabel}</td><td style="padding:6px 0;">${bucket.elapsedMin} min</td></tr>
                </table>
                <p style="margin:24px 0 0;">
                  <a href="https://rideforti.com/admin" style="background:#d4af37;color:#000;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">Open Admin Inbox</a>
                </p>
              </div>`;
            const r = await sendEmail(contact.email, subject, html);
            if (r.ok) {
              channels.push("email");
              summary.alertsSent++;
            } else {
              summary.errors.push(`email ${contact.id}: ${r.error}`);
            }
          }

          if (channels.length > 0) {
            await supabase.from("support_escalation_log").insert({
              ticket_id: ticket.id,
              contact_id: contact.id,
              tier: bucket.tier,
              kind: bucket.kind,
              channels,
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("escalate-tickets error", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
