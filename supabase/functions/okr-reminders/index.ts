import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { sendDirectEmail } from "../_shared/resend.ts";
import { sendDirectSms } from "../_shared/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREQ_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER");

    const now = new Date();
    const nowIso = now.toISOString();

    // Pull all open tasks that have either a recurring frequency OR a one-shot reminder_at
    const { data: tasks, error } = await adminClient
      .from("okr_tasks")
      .select("*")
      .neq("status", "done");
    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: "No open tasks", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build phone lookup once
    const { data: dir } = await adminClient
      .from("admin_users_directory")
      .select("email, phone, full_name");
    const phoneByEmail = new Map<string, { phone: string | null; name: string | null }>();
    (dir || []).forEach((u: any) => phoneByEmail.set(u.email, { phone: u.phone, name: u.full_name }));

    let sent = 0;

    for (const task of tasks) {
      const assignees: string[] = (task.assignees && task.assignees.length > 0)
        ? task.assignees
        : (task.assigned_to ? [task.assigned_to] : []);
      if (assignees.length === 0) continue;

      // Determine if this iteration should fire
      let shouldFire = false;
      if (task.reminder_frequency && FREQ_MS[task.reminder_frequency]) {
        const interval = FREQ_MS[task.reminder_frequency];
        const last = task.reminder_last_sent_at ? new Date(task.reminder_last_sent_at).getTime() : 0;
        if (now.getTime() - last >= interval) shouldFire = true;
      } else if (!task.reminder_sent && task.reminder_at && new Date(task.reminder_at) <= now) {
        // Legacy one-shot
        shouldFire = true;
      }
      if (!shouldFire) continue;

      const dueLabel = task.due_date
        ? new Date(task.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : null;

      for (const email of assignees) {
        // Email
        if (task.notify_email) {
          await sendDirectEmail({
            to: email,
            from: "Forti <notifications@rideforti.com>",
            subject: `⏰ Task Reminder: ${task.title}`,
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
                <h2 style="color:#1a1a1a;margin-bottom:12px;">Task Reminder</h2>
                <div style="background:#f5f5f5;border-radius:8px;padding:16px;">
                  <h3 style="margin:0 0 8px;">${task.title}</h3>
                  ${task.description ? `<p style="color:#666;margin:0 0 8px;font-size:14px;">${task.description}</p>` : ""}
                  ${dueLabel ? `<p style="color:#666;margin:0;font-size:13px;">Due: ${dueLabel}</p>` : ""}
                  <p style="color:#666;margin:4px 0 0;font-size:13px;">Priority: ${task.priority}</p>
                  ${task.reminder_frequency ? `<p style="color:#666;margin:6px 0 0;font-size:12px;">Cadence: ${task.reminder_frequency}</p>` : ""}
                </div>
                <p style="color:#999;font-size:12px;margin-top:16px;">— Forti Admin</p>
              </div>`,
          });
        }

        // SMS
        if (task.notify_sms) {
          const phone = phoneByEmail.get(email)?.phone;
          if (phone) {
            await sendDirectSms({
              to: phone,
              body: `⏰ Forti Task Reminder: "${task.title}"${dueLabel ? ` — Due: ${dueLabel}` : ""}.`,
            });
          }
        }
      }

      // Update tracking
      const upd: Record<string, any> = { reminder_last_sent_at: nowIso };
      if (!task.reminder_frequency) upd.reminder_sent = true; // legacy one-shot
      await adminClient.from("okr_tasks").update(upd).eq("id", task.id);
      sent++;
    }

    return new Response(JSON.stringify({ message: `Processed ${sent} reminders`, count: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
