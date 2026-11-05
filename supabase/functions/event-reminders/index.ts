import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { sendDirectEmail } from "../_shared/resend.ts";
import { sendDirectSms } from "../_shared/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Reminder windows: minutes before event start. Negative or zero = at start.
// We match within a +/- 5 min window so a per-minute cron catches each one once.
const REMINDERS: { key: string; minutesBefore: number; label: string }[] = [
  { key: "3day", minutesBefore: 3 * 24 * 60, label: "3 days away" },
  { key: "1day", minutesBefore: 1 * 24 * 60, label: "tomorrow" },
  { key: "1hour", minutesBefore: 60, label: "in 1 hour" },
  { key: "30min", minutesBefore: 30, label: "in 30 minutes" },
  { key: "started", minutesBefore: 0, label: "starting now" },
];

const WINDOW_MIN = 5; // tolerance window in minutes

async function sendEmail(to: string, subject: string, html: string) {
  return sendDirectEmail({
    to,
    subject,
    html,
    from: "Forti <notifications@rideforti.com>",
  });
}

async function sendSms(to: string, body: string) {
  const phone = (to || "").match(/\+?\d{10,}/)?.[0];
  if (!phone) return;
  return sendDirectSms({
    to: phone,
    body,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();

    // Look at events from now to ~4 days out (covers the 3-day window).
    const fromDate = new Date(now.getTime() - 10 * 60 * 1000).toISOString().slice(0, 10);
    const toDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: events } = await supabase
      .from("department_events")
      .select("id, title, event_date, event_time, location, department")
      .gte("event_date", fromDate)
      .lte("event_date", toDate);

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;

    for (const ev of events) {
      const timePart = ev.event_time ? ev.event_time : "09:00:00";
      // Treat event_date + event_time as local time; build ISO with Z is wrong for true tz,
      // but we do not have user tz. Use UTC reading consistent with how it was inserted.
      const eventStart = new Date(`${ev.event_date}T${timePart}`);
      const minutesUntil = (eventStart.getTime() - now.getTime()) / 60000;

      // Find the matching reminder window (if any)
      const due = REMINDERS.find(
        (r) => Math.abs(minutesUntil - r.minutesBefore) <= WINDOW_MIN
      );
      if (!due) continue;

      // Get accepted/pending assignments
      const { data: assignments } = await supabase
        .from("event_staff_assignments")
        .select("*")
        .eq("event_id", ev.id)
        .in("status", ["pending", "accepted"]);

      if (!assignments || assignments.length === 0) continue;

      const dateStr = new Date(ev.event_date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const timeStr = ev.event_time ? ` at ${ev.event_time.slice(0, 5)}` : "";
      const deptParam = ev.department && ev.department !== "all" ? ev.department : "ops";
      const deepLink = `https://rideforti.com/admin?dept=${deptParam}&module=calendar&event=${ev.id}`;

      for (const a of assignments) {
        const sent: string[] = Array.isArray(a.reminders_sent) ? a.reminders_sent : [];
        if (sent.includes(due.key)) continue;

        const subject = `Reminder: ${ev.title} ${due.label}`;
        const html = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
            <h2 style="color:#1a1a1a;margin:0 0 16px;">Event reminder — ${due.label}</h2>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin-bottom:16px;">
              <h3 style="margin:0 0 8px;">${ev.title}</h3>
              <p style="margin:0 0 4px;color:#666;font-size:14px;"><strong>Role:</strong> ${a.role_tag}</p>
              <p style="margin:0 0 4px;color:#666;font-size:14px;"><strong>When:</strong> ${dateStr}${timeStr}</p>
              ${ev.location ? `<p style="margin:0 0 4px;color:#666;font-size:14px;"><strong>Location:</strong> ${ev.location}</p>` : ""}
            </div>
            <a href="${deepLink}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px;">View Event</a>
            <p style="color:#999;font-size:12px;margin-top:24px;">— Forti Operations</p>
          </div>`;
        const sms = `Forti reminder: "${ev.title}" ${due.label} (${dateStr}${timeStr}). Role: ${a.role_tag}. ${deepLink}`;

        if (a.notify_email && a.user_email) await sendEmail(a.user_email, subject, html);
        if (a.notify_sms && a.user_phone) await sendSms(a.user_phone, sms);

        await supabase.from("calendar_notifications").insert({
          recipient_id: a.user_id,
          type: `reminder_${due.key}`,
          title: `Reminder: ${ev.title}`,
          body: `${due.label} — ${dateStr}${timeStr}`,
          event_id: ev.id,
          assignment_id: a.id,
        });

        await supabase
          .from("event_staff_assignments")
          .update({ reminders_sent: [...sent, due.key] })
          .eq("id", a.id);

        totalSent++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: totalSent }), {
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
