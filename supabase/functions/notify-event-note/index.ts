import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { sendDirectEmail } from "../_shared/resend.ts";
import { sendDirectSms } from "../_shared/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  email?: string;
  phone?: string;
  name?: string;
  notify_email?: boolean;
  notify_sms?: boolean;
}

async function sendEmail(to: string, subject: string, html: string) {
  return sendDirectEmail({
    to,
    subject,
    html,
    from: "Forti Calendar <notify@rideforti.com>",
  });
}

async function sendSms(to: string, body: string) {
  return sendDirectSms({ to, body });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { noteId } = await req.json();
    if (!noteId) {
      return new Response(JSON.stringify({ error: "noteId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load note + event + mentions
    const { data: note } = await supabase
      .from("event_notes")
      .select("*")
      .eq("id", noteId)
      .maybeSingle();
    if (!note) {
      return new Response(JSON.stringify({ error: "note not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: event } = await supabase
      .from("department_events")
      .select("id, title, event_date, event_time")
      .eq("id", note.event_id)
      .maybeSingle();

    const { data: mentions } = await supabase
      .from("event_note_mentions")
      .select("*")
      .eq("note_id", noteId);

    const eventTitle = event?.title || "an event";
    const eventDate = event?.event_date || "";
    const author = note.author_name || note.author_email || "A staff member";
    const preview = (note.content || "").slice(0, 280);

    // Notify all admins (master admin notification)
    const { data: admins } = await supabase
      .from("admin_users_directory")
      .select("email, phone, full_name")
      .eq("active", true);

    const adminSubject = `New note on ${eventTitle} (${eventDate})`;
    const adminHtml = `
      <div style="font-family:system-ui,sans-serif;color:#111">
        <h2 style="margin:0 0 12px">New event note</h2>
        <p><strong>${author}</strong> left a note on <strong>${eventTitle}</strong> on ${eventDate}.</p>
        <blockquote style="border-left:3px solid #c9a96a;padding:8px 12px;background:#f7f4ec;margin:12px 0">${preview}</blockquote>
        <p>Open the calendar to view, reply, or download attachments.</p>
      </div>`;
    const adminSms = `Forti: ${author} left a note on "${eventTitle}" (${eventDate}). Check the calendar.`;

    for (const admin of admins || []) {
      if (admin.email) await sendEmail(admin.email, adminSubject, adminHtml);
      if (admin.phone) await sendSms(admin.phone, adminSms);

      // In-app notification for each admin
      await supabase.from("calendar_notifications").insert({
        recipient_id: (await supabase
          .from("admin_users_directory")
          .select("user_id")
          .eq("email", admin.email)
          .maybeSingle()).data?.user_id,
        type: "note_added",
        title: `New note on ${eventTitle}`,
        body: `${author}: ${preview}`,
        event_id: note.event_id,
      });
    }

    // Notify mentioned staff
    for (const mention of mentions || []) {
      const tagSubject = `You were tagged on ${eventTitle} (${eventDate})`;
      const tagHtml = `
        <div style="font-family:system-ui,sans-serif;color:#111">
          <h2 style="margin:0 0 12px">You were tagged in a note</h2>
          <p><strong>${author}</strong> tagged you on <strong>${eventTitle}</strong> on ${eventDate}.</p>
          <blockquote style="border-left:3px solid #c9a96a;padding:8px 12px;background:#f7f4ec;margin:12px 0">${preview}</blockquote>
          <p>Log in and check the calendar to view the note and reply.</p>
        </div>`;
      const tagSms = `Forti: You were tagged by ${author} on "${eventTitle}" (${eventDate}). Check the calendar.`;

      if (mention.mentioned_user_email) await sendEmail(mention.mentioned_user_email, tagSubject, tagHtml);

      // Lookup phone from directory
      const { data: dir } = await supabase
        .from("admin_users_directory")
        .select("phone")
        .eq("user_id", mention.mentioned_user_id)
        .maybeSingle();
      if (dir?.phone) await sendSms(dir.phone, tagSms);

      await supabase.from("calendar_notifications").insert({
        recipient_id: mention.mentioned_user_id,
        type: "note_mention",
        title: `Tagged on ${eventTitle}`,
        body: `${author}: ${preview}`,
        event_id: note.event_id,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
