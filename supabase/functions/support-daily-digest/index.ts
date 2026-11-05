// Daily 9am digest for support assignments.
// Sends per-supervisor digest of their open assigned tickets + FAQ questions,
// and a single admin summary with the total count of unanswered tickets.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendDirectSms } from "../_shared/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ type: "ticket_assignment", email: to, firstName: "", subject, messageBody: html }),
    });
  } catch (e) {
    console.error("digest email failed", e);
  }
}

async function sendSms(to: string | null, body: string) {
  if (!to) return;
  return sendDirectSms({ to, body });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const today = new Date().toISOString().slice(0, 10);

  const results: any = { supervisors: [], admin: null, skipped: [] };

  try {
    // ---- SUPERVISOR DIGESTS ----
    const { data: supervisorDir } = await admin
      .from("admin_users_directory")
      .select("user_id, email, full_name, phone")
      .eq("is_supervisor", true)
      .eq("active", true);

    for (const sup of supervisorDir || []) {
      // Skip if already sent today
      const { data: already } = await admin
        .from("support_digest_log")
        .select("id")
        .eq("recipient_user_id", sup.user_id)
        .eq("digest_kind", "supervisor")
        .eq("sent_for_date", today)
        .maybeSingle();
      if (already) {
        results.skipped.push({ user: sup.email, reason: "already_sent" });
        continue;
      }

      const { data: tickets } = await admin
        .from("support_tickets")
        .select("id, subject, first_name, last_name, status, created_at, last_user_message_at")
        .eq("assigned_to_user_id", sup.user_id)
        .neq("status", "closed")
        .order("created_at", { ascending: true });

      const { data: faqs } = await admin
        .from("support_faq_questions")
        .select("id, question, ticket_number, status, created_at")
        .eq("assigned_to", sup.email)
        .eq("status", "pending");

      const ticketCount = tickets?.length || 0;
      const faqCount = faqs?.length || 0;
      if (ticketCount === 0 && faqCount === 0) {
        // still log so we don't repeatedly check
        await admin.from("support_digest_log").insert({
          recipient_user_id: sup.user_id,
          digest_kind: "supervisor",
          sent_for_date: today,
          ticket_count: 0,
          faq_count: 0,
        });
        continue;
      }

      const ticketRows = (tickets || [])
        .map((t) => {
          const ageH = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 3600000);
          return `<li>#${t.id.slice(0, 8).toUpperCase()} — ${(t.subject || "Support ticket").slice(0, 80)} (${t.first_name || ""} ${t.last_name || ""}) · open ${ageH}h</li>`;
        })
        .join("");

      const faqRows = (faqs || [])
        .map((q) => `<li>${q.ticket_number ? `Ticket #${q.ticket_number} — ` : ""}${(q.question || "").slice(0, 100)}</li>`)
        .join("");

      const html = `
        <h2>Your support digest — ${today}</h2>
        <p>Hi ${sup.full_name || sup.email}, here is your assigned workload still open:</p>
        ${ticketCount > 0 ? `<h3>Open tickets (${ticketCount})</h3><ul>${ticketRows}</ul>` : ""}
        ${faqCount > 0 ? `<h3>Pending FAQ questions (${faqCount})</h3><ul>${faqRows}</ul>` : ""}
        <p>Open the admin dashboard to action these.</p>
      `;

      await sendEmail(sup.email, `Daily support digest — ${ticketCount} ticket${ticketCount === 1 ? "" : "s"}, ${faqCount} FAQ${faqCount === 1 ? "" : "s"}`, html);
      await sendSms(sup.phone, `Forti support digest: ${ticketCount} open ticket${ticketCount === 1 ? "" : "s"}, ${faqCount} FAQ. Check the admin dashboard.`);

      await admin.from("support_digest_log").insert({
        recipient_user_id: sup.user_id,
        digest_kind: "supervisor",
        sent_for_date: today,
        ticket_count: ticketCount,
        faq_count: faqCount,
      });

      results.supervisors.push({ user: sup.email, tickets: ticketCount, faqs: faqCount });
    }

    // ---- ADMIN SUMMARY ----
    const { data: adminRoles } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (adminRoles || []).map((r: any) => r.user_id);

    if (adminIds.length > 0) {
      const { data: { users: allUsers } } = await admin.auth.admin.listUsers();
      const adminUsers = (allUsers || []).filter((u: any) => adminIds.includes(u.id));

      // Total unanswered (open + in_progress) across all tickets
      const { count: openCount } = await admin
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .neq("status", "closed");
      const { count: faqPendingCount } = await admin
        .from("support_faq_questions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      const totalTickets = openCount || 0;
      const totalFaqs = faqPendingCount || 0;

      for (const a of adminUsers) {
        const { data: already } = await admin
          .from("support_digest_log")
          .select("id")
          .eq("recipient_user_id", a.id)
          .eq("digest_kind", "admin")
          .eq("sent_for_date", today)
          .maybeSingle();
        if (already) continue;

        const phone = a.user_metadata?.phone || a.phone || null;
        const html = `
          <h2>Daily support summary — ${today}</h2>
          <p>${totalTickets} unanswered ticket${totalTickets === 1 ? "" : "s"} and ${totalFaqs} pending FAQ question${totalFaqs === 1 ? "" : "s"} across the platform.</p>
          <p>Open the admin dashboard to triage.</p>
        `;
        await sendEmail(a.email!, `Forti support summary — ${totalTickets} open`, html);
        await sendSms(phone, `Forti support summary: ${totalTickets} open ticket${totalTickets === 1 ? "" : "s"}, ${totalFaqs} pending FAQ.`);

        await admin.from("support_digest_log").insert({
          recipient_user_id: a.id,
          digest_kind: "admin",
          sent_for_date: today,
          ticket_count: totalTickets,
          faq_count: totalFaqs,
        });

        results.admin = { tickets: totalTickets, faqs: totalFaqs, recipients: adminUsers.length };
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("digest error", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
