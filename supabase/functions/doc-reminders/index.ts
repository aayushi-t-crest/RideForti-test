import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { sendDirectEmail } from "../_shared/resend.ts";
import { sendDirectSms } from "../_shared/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CADENCE_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  biweekly: 14 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  quarterly: 90 * 24 * 60 * 60 * 1000,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const { data: due, error } = await supabase
      .from("doc_reminders")
      .select("*")
      .lte("next_due_at", now.toISOString());
    if (error) throw error;

    if (!due || due.length === 0) {
      return new Response(JSON.stringify({ message: "Nothing due", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: dir } = await supabase
      .from("admin_users_directory")
      .select("email, phone, full_name");
    const byEmail = new Map<string, { phone: string | null; name: string | null }>();
    (dir || []).forEach((u: any) => byEmail.set(u.email, { phone: u.phone, name: u.full_name }));

    let sent = 0;
    for (const r of due) {
      const assignees: string[] = r.assignees || [];
      if (assignees.length === 0) continue;

      for (const email of assignees) {
        const info = byEmail.get(email);
        const name = info?.name || email.split("@")[0];

        if (r.notify_email) {
          await sendDirectEmail({
            to: email,
            from: "Forti <notifications@rideforti.com>",
            subject: `📚 Documentation Update Reminder: ${r.module_label}`,
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
                <h2 style="color:#1a1a1a;margin-bottom:12px;">Documentation Reminder</h2>
                <p style="color:#444;">Hi ${name}, it's time to review and update:</p>
                <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:12px 0;">
                  <h3 style="margin:0 0 8px;">${r.module_label}</h3>
                  ${r.note ? `<p style="color:#666;margin:0;font-size:14px;">${r.note}</p>` : ""}
                  <p style="color:#888;margin:8px 0 0;font-size:12px;">Cadence: ${r.cadence}</p>
                </div>
                <p style="color:#999;font-size:12px;margin-top:16px;">— Forti Admin · App Documentation</p>
              </div>`,
          });
        }

        if (r.notify_sms) {
          const phone = info?.phone;
          if (phone) {
            await sendDirectSms({
              to: phone,
              body: `📚 Forti Docs: time to update "${r.module_label}" (${r.cadence}).`,
            });
          }
        }
      }

      const interval = CADENCE_MS[r.cadence] || CADENCE_MS.weekly;
      const nextDue = new Date(now.getTime() + interval).toISOString();
      await supabase
        .from("doc_reminders")
        .update({ last_sent_at: now.toISOString(), next_due_at: nextDue })
        .eq("id", r.id);
      sent++;
    }

    return new Response(JSON.stringify({ message: `Processed ${sent} reminders`, count: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
