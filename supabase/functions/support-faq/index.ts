// Support FAQ Peer-Escalation Edge Function
// Actions: list-mine, list-pending, list-unread-answers, mark-read, create, answer, reassign, list-staff
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { sendDirectEmail } from "../_shared/resend.ts";
import { sendDirectSms } from "../_shared/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const shortTicketNumber = (id: string | null | undefined) =>
  id ? `#${id.slice(0, 8).toUpperCase()}` : "#UNKNOWN";

async function sendEmail(to: string, subject: string, html: string) {
  if (!to) return;
  return sendDirectEmail({
    to,
    subject,
    html,
    from: "Forti Support <support@rideforti.com>",
  });
}

async function sendSms(to: string, body: string) {
  if (!to) return;
  return sendDirectSms({ to, body });
}

async function notifyAssignment(params: {
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  submitterName: string;
  ticketNumber: string;
  question: string;
  level: string;
}) {
  const { recipientName, recipientEmail, recipientPhone, submitterName, ticketNumber, question, level } = params;
  const truncated = question.length > 80 ? question.slice(0, 80) + "..." : question;
  const subject = `New FAQ question (${level}) on ticket ${ticketNumber}`;
  const html = `
    <p>Hi ${recipientName || "there"},</p>
    <p><strong>${submitterName}</strong> escalated a question to you on ticket <strong>${ticketNumber}</strong>:</p>
    <blockquote style="border-left:3px solid #d4a017;padding:8px 12px;background:#fafafa;">${question}</blockquote>
    <p>Open the Support module in admin to respond.</p>
  `;
  const sms = `Forti FAQ: New question from ${submitterName} on ticket ${ticketNumber}: "${truncated}". Log in to Support to answer.`;
  await Promise.allSettled([
    recipientEmail ? sendEmail(recipientEmail, subject, html) : null,
    recipientPhone ? sendSms(recipientPhone, sms) : null,
  ]);
}

async function notifyAnswered(params: {
  recipients: Array<{ name?: string | null; email?: string | null; phone?: string | null }>;
  answererName: string;
  ticketNumber: string;
  question: string;
  answer: string;
}) {
  const { recipients, answererName, ticketNumber, question, answer } = params;
  const subject = `FAQ answered for ticket ${ticketNumber}`;
  const html = `
    <p>${answererName} answered the FAQ question on ticket <strong>${ticketNumber}</strong>.</p>
    <p><strong>Question:</strong> ${question}</p>
    <p><strong>Answer:</strong></p>
    <blockquote style="border-left:3px solid #6366f1;padding:8px 12px;background:#fafafa;">${answer}</blockquote>
  `;
  const sms = `Forti FAQ: Question on ticket ${ticketNumber} answered by ${answererName}. Open Support to view.`;
  const tasks: Promise<unknown>[] = [];
  for (const r of recipients) {
    if (r.email) tasks.push(sendEmail(r.email, subject, html));
    if (r.phone) tasks.push(sendSms(r.phone, sms));
  }
  await Promise.allSettled(tasks);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Not authenticated" }, 401);
    const me = userData.user;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "";
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // ---------- list-staff ----------
    if (action === "list-staff") {
      // Return admins + supervisors as candidate assignees
      const { data: roles } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "supervisor"]);

      const userIds = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (userIds.length === 0) return json({ staff: [] });

      const { data: dir } = await admin
        .from("admin_users_directory")
        .select("user_id, email, full_name, phone")
        .in("user_id", userIds)
        .eq("active", true);

      const rolesByUser = new Map<string, string[]>();
      for (const r of roles ?? []) {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesByUser.set(r.user_id, arr);
      }

      const staff = (dir ?? [])
        .filter((u) => u.user_id !== me.id)
        .map((u) => ({
          id: u.user_id,
          email: u.email,
          name: u.full_name || u.email,
          phone: u.phone,
          roles: rolesByUser.get(u.user_id) ?? [],
        }));
      return json({ staff });
    }

    // ---------- list-mine ----------
    if (action === "list-mine") {
      const { data, error } = await admin
        .from("support_faq_questions")
        .select("*")
        .or(`submitted_by.eq.${me.id},assigned_to.eq.${me.id}`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return json({ error: error.message }, 400);
      return json({ questions: data ?? [] });
    }

    // ---------- list-pending (assigned to me, awaiting answer) ----------
    if (action === "list-pending") {
      const { data, error } = await admin
        .from("support_faq_questions")
        .select("*")
        .eq("assigned_to", me.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ questions: data ?? [] });
    }

    // ---------- list-unread-answers (answered, I submitted, unread) ----------
    if (action === "list-unread-answers") {
      const { data, error } = await admin
        .from("support_faq_questions")
        .select("*")
        .eq("submitted_by", me.id)
        .eq("status", "answered")
        .is("read_at", null)
        .order("answered_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ questions: data ?? [] });
    }

    // ---------- list-by-ticket ----------
    if (action === "list-by-ticket") {
      const ticketId = url.searchParams.get("ticket_id") || body?.ticket_id;
      if (!ticketId) return json({ error: "ticket_id required" }, 400);
      const { data, error } = await admin
        .from("support_faq_questions")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ questions: data ?? [] });
    }

    // ---------- mark-read ----------
    if (action === "mark-read") {
      const { error } = await admin
        .from("support_faq_questions")
        .update({ read_at: new Date().toISOString() })
        .eq("submitted_by", me.id)
        .eq("status", "answered")
        .is("read_at", null);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ---------- create ----------
    if (action === "create") {
      const { ticket_id, question, assigned_to, escalation_level } = body;
      if (!question || !assigned_to) return json({ error: "question and assigned_to required" }, 400);

      // Get my profile
      const { data: myDir } = await admin
        .from("admin_users_directory")
        .select("full_name, email, phone")
        .eq("user_id", me.id)
        .maybeSingle();

      // Get assignee profile
      const { data: assigneeDir } = await admin
        .from("admin_users_directory")
        .select("full_name, email, phone")
        .eq("user_id", assigned_to)
        .maybeSingle();

      const ticketNumber = shortTicketNumber(ticket_id);
      const submitterName = myDir?.full_name || myDir?.email || me.email || "A support agent";

      const { data: inserted, error } = await admin
        .from("support_faq_questions")
        .insert({
          ticket_id: ticket_id || null,
          ticket_number: ticketNumber,
          question,
          submitted_by: me.id,
          submitted_by_name: submitterName,
          submitted_by_email: myDir?.email || me.email,
          assigned_to,
          assigned_to_name: assigneeDir?.full_name || assigneeDir?.email,
          assigned_to_email: assigneeDir?.email,
          escalation_level: escalation_level || "supervisor",
          notification_recipients: [me.id],
        })
        .select()
        .single();

      if (error) return json({ error: error.message }, 400);

      // Fire notifications (don't await)
      notifyAssignment({
        recipientName: assigneeDir?.full_name,
        recipientEmail: assigneeDir?.email,
        recipientPhone: assigneeDir?.phone,
        submitterName,
        ticketNumber,
        question,
        level: escalation_level || "supervisor",
      }).catch((e) => console.error("notify failed:", e));

      return json({ question: inserted });
    }

    // ---------- answer ----------
    if (action === "answer") {
      const { id, answer } = body;
      if (!id || !answer) return json({ error: "id and answer required" }, 400);

      const { data: existing, error: fetchErr } = await admin
        .from("support_faq_questions")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr || !existing) return json({ error: "Question not found" }, 404);
      if (existing.assigned_to !== me.id && !(await isAdmin(admin, me.id))) {
        return json({ error: "Not authorized" }, 403);
      }

      const { data: myDir } = await admin
        .from("admin_users_directory")
        .select("full_name, email, phone")
        .eq("user_id", me.id)
        .maybeSingle();
      const answererName = myDir?.full_name || myDir?.email || me.email || "Staff";

      const { data: updated, error } = await admin
        .from("support_faq_questions")
        .update({
          answer,
          status: "answered",
          answered_by: me.id,
          answered_by_name: answererName,
          answered_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 400);

      // Notify submitter + everyone in notification_recipients
      const recipientIds = new Set<string>([
        existing.submitted_by,
        ...((existing.notification_recipients as string[]) ?? []),
      ]);
      recipientIds.delete(me.id);

      const { data: recDir } = await admin
        .from("admin_users_directory")
        .select("user_id, full_name, email, phone")
        .in("user_id", Array.from(recipientIds));

      notifyAnswered({
        recipients: (recDir ?? []).map((r) => ({ name: r.full_name, email: r.email, phone: r.phone })),
        answererName,
        ticketNumber: existing.ticket_number || shortTicketNumber(existing.ticket_id),
        question: existing.question,
        answer,
      }).catch((e) => console.error("notify failed:", e));

      // Harvest into faq_patterns
      try {
        const { data: existingPattern } = await admin
          .from("faq_patterns")
          .select("id, frequency, sample_ticket_ids, source_question_ids")
          .ilike("question", existing.question)
          .maybeSingle();

        if (existingPattern) {
          const sampleIds = new Set<string>(existingPattern.sample_ticket_ids ?? []);
          if (existing.ticket_id) sampleIds.add(existing.ticket_id);
          const srcIds = new Set<string>(existingPattern.source_question_ids ?? []);
          srcIds.add(existing.id);
          await admin
            .from("faq_patterns")
            .update({
              answer,
              frequency: (existingPattern.frequency ?? 0) + 1,
              last_asked_at: new Date().toISOString(),
              sample_ticket_ids: Array.from(sampleIds),
              source_question_ids: Array.from(srcIds),
            })
            .eq("id", existingPattern.id);
        } else {
          await admin.from("faq_patterns").insert({
            question: existing.question,
            answer,
            category: "support",
            frequency: 1,
            answer_source: "human",
            sample_ticket_ids: existing.ticket_id ? [existing.ticket_id] : [],
            source_question_ids: [existing.id],
          });
        }
        await admin
          .from("support_faq_questions")
          .update({ synced_to_faq: true })
          .eq("id", id);
      } catch (e) {
        console.error("FAQ harvest failed:", e);
      }

      // Fire-and-forget: send to AI Knowledge Base
      try {
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/support-kb?action=ingest-faq`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-system-secret": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
          },
          body: JSON.stringify({
            question: existing.question,
            answer,
            ticket_id: existing.ticket_id,
            ticket_number: existing.ticket_number,
            answered_by_name: answererName,
          }),
        }).catch((e) => console.error("KB ingest-faq failed:", e));
      } catch (e) {
        console.error("KB ingest dispatch failed:", e);
      }

      return json({ question: updated });
    }

    // ---------- reassign ----------
    if (action === "reassign") {
      const { id, new_assignee, escalation_level } = body;
      if (!id || !new_assignee) return json({ error: "id and new_assignee required" }, 400);

      const { data: existing, error: fetchErr } = await admin
        .from("support_faq_questions")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr || !existing) return json({ error: "Question not found" }, 404);
      if (existing.assigned_to !== me.id && !(await isAdmin(admin, me.id))) {
        return json({ error: "Not authorized" }, 403);
      }

      const { data: newDir } = await admin
        .from("admin_users_directory")
        .select("full_name, email, phone")
        .eq("user_id", new_assignee)
        .maybeSingle();

      const recipients = new Set<string>(
        ((existing.notification_recipients as string[]) ?? []).concat([me.id, existing.submitted_by]),
      );

      const { data: updated, error } = await admin
        .from("support_faq_questions")
        .update({
          assigned_to: new_assignee,
          assigned_to_name: newDir?.full_name || newDir?.email,
          assigned_to_email: newDir?.email,
          escalation_level: escalation_level || "admin",
          status: "pending",
          reassigned_from: me.id,
          notification_recipients: Array.from(recipients),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 400);

      notifyAssignment({
        recipientName: newDir?.full_name,
        recipientEmail: newDir?.email,
        recipientPhone: newDir?.phone,
        submitterName: existing.submitted_by_name || "A support agent",
        ticketNumber: existing.ticket_number || shortTicketNumber(existing.ticket_id),
        question: existing.question,
        level: escalation_level || "admin",
      }).catch((e) => console.error("notify failed:", e));

      return json({ question: updated });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("support-faq error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function isAdmin(admin: ReturnType<typeof createClient>, userId: string) {
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}
