import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { sendDirectEmail } from "../_shared/resend.ts";
import { sendDirectSms } from "../_shared/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    const body = await req.json();
    const { assignment_id, kind } = body as {
      assignment_id: string;
      kind: "request" | "accepted" | "denied";
    };
    if (!assignment_id || !kind) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load assignment + event
    const { data: assignment, error: aErr } = await admin
      .from("event_staff_assignments")
      .select("*")
      .eq("id", assignment_id)
      .maybeSingle();
    if (aErr || !assignment) throw new Error(aErr?.message || "Assignment not found");

    const { data: event } = await admin
      .from("department_events")
      .select("*")
      .eq("id", assignment.event_id)
      .maybeSingle();
    if (!event) throw new Error("Event not found");

    const dateStr = new Date(event.event_date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = event.event_time ? ` at ${event.event_time.slice(0, 5)}` : "";

    const sendEmail = async (to: string, subject: string, html: string) => {
      await sendDirectEmail({
        to,
        subject,
        html,
        from: "Forti <notifications@rideforti.com>",
      });
    };

    const sendSms = async (to: string, body: string) => {
      const phone = (to || "").match(/\+?\d{10,}/)?.[0];
      if (!phone) return;
      await sendDirectSms({
        to: phone,
        body,
      });
    };

    // Build deep link to the event in the admin calendar
    const deptParam = event.department && event.department !== "all" ? event.department : "ops";
    const deepLink = `https://rideforti.com/admin?dept=${deptParam}&module=calendar&event=${event.id}`;

    if (kind === "request") {
      // Notify assigned staff
      const subject = `${assignment.role_tag} needed — ${event.title}`;
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#1a1a1a;margin:0 0 16px;">You've been tagged on an event</h2>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin-bottom:16px;">
            <h3 style="margin:0 0 8px;">${event.title}</h3>
            <p style="margin:0 0 4px;color:#666;font-size:14px;"><strong>Role:</strong> ${assignment.role_tag}</p>
            <p style="margin:0 0 4px;color:#666;font-size:14px;"><strong>When:</strong> ${dateStr}${timeStr}</p>
            ${event.location ? `<p style="margin:0 0 4px;color:#666;font-size:14px;"><strong>Location:</strong> ${event.location}</p>` : ""}
          </div>
          <p style="font-size:14px;color:#444;">Tap the button below to log in and review the event. It will open directly for you.</p>
          <a href="${deepLink}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px;">View Event</a>
          <p style="color:#999;font-size:12px;margin-top:24px;">— Forti Operations</p>
        </div>`;
      if (assignment.notify_email) await sendEmail(assignment.user_email, subject, html);
      if (assignment.notify_sms && assignment.user_phone) {
        await sendSms(
          assignment.user_phone,
          `Forti: You've been tagged as ${assignment.role_tag} for "${event.title}" on ${dateStr}${timeStr}. View: ${deepLink}`
        );
      }

      // Bell notification for the assignee
      await admin.from("calendar_notifications").insert({
        recipient_id: assignment.user_id,
        type: "assignment_request",
        title: `${assignment.role_tag} needed`,
        body: `${event.title} — ${dateStr}${timeStr}`,
        event_id: event.id,
        assignment_id: assignment.id,
      });

      // Mark the immediate "request" notification as sent for the checklist
      const sentArr: string[] = Array.isArray(assignment.reminders_sent) ? assignment.reminders_sent : [];
      if (!sentArr.includes("request")) {
        await admin
          .from("event_staff_assignments")
          .update({ reminders_sent: [...sentArr, "request"] })
          .eq("id", assignment.id);
      }
    } else {
      // Notify all admins (master admins) of accept/deny
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      const { data: { users: allAuthUsers } } = await admin.auth.admin.listUsers();

      const adminIds = (admins || []).map((r: any) => r.user_id);
      const adminUsers = (allAuthUsers || []).filter((u: any) => adminIds.includes(u.id));

      const verb = kind === "accepted" ? "accepted" : "denied";
      const subject = `${assignment.user_name || assignment.user_email} ${verb} — ${event.title}`;
      const reasonLine = assignment.response_reason
        ? `<p style="margin:0 0 4px;color:#666;font-size:14px;"><strong>Reason:</strong> ${assignment.response_reason}</p>`
        : "";
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#1a1a1a;margin:0 0 16px;">Assignment ${verb}</h2>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin-bottom:16px;">
            <p style="margin:0 0 4px;font-size:14px;"><strong>${assignment.user_name || assignment.user_email}</strong> ${verb} the assignment.</p>
            <p style="margin:0 0 4px;color:#666;font-size:14px;"><strong>Event:</strong> ${event.title}</p>
            <p style="margin:0 0 4px;color:#666;font-size:14px;"><strong>Role:</strong> ${assignment.role_tag}</p>
            <p style="margin:0 0 4px;color:#666;font-size:14px;"><strong>When:</strong> ${dateStr}${timeStr}</p>
            ${reasonLine}
          </div>
          <p style="color:#999;font-size:12px;">— Forti Operations</p>
        </div>`;

      for (const a of adminUsers) {
        if (a.email) await sendEmail(a.email, subject, html);
        const phone = (a.phone as string) || (a.user_metadata?.phone as string);
        if (phone) {
          await sendSms(
            phone,
            `Forti: ${assignment.user_name || assignment.user_email} ${verb} "${assignment.role_tag}" for ${event.title} (${dateStr}).${assignment.response_reason ? " Reason: " + assignment.response_reason : ""}`
          );
        }
        await admin.from("calendar_notifications").insert({
          recipient_id: a.id,
          type: kind === "accepted" ? "assignment_accepted" : "assignment_denied",
          title: `${assignment.user_name || assignment.user_email} ${verb}`,
          body: `${event.title} — ${assignment.role_tag}${assignment.response_reason ? " — " + assignment.response_reason : ""}`,
          event_id: event.id,
          assignment_id: assignment.id,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("notify-assignment error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
