import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendDirectEmail } from "../_shared/resend.ts";
import { sendDirectSms } from "../_shared/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  return sendDirectEmail({
    to,
    subject,
    html,
    from: "Forti <noreply@rideforti.com>",
  });
}

async function sendSms(to: string, body: string) {
  return sendDirectSms({ to, body });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { ideaId, event } = await req.json();
    if (!ideaId || !event) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: idea } = await supabase
      .from("team_ideas")
      .select("*")
      .eq("id", ideaId)
      .maybeSingle();

    if (!idea) {
      return new Response(JSON.stringify({ error: "idea not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const link = `https://rideforti.com/admin?dept=ops&module=team-ideas`;

    if (event === "submitted") {
      // Notify all admins + supervisors
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const adminIds = (admins ?? []).map((r: any) => r.user_id);

      const { data: directory } = await supabase
        .from("admin_users_directory")
        .select("user_id, email, phone, full_name, is_supervisor")
        .eq("active", true);

      const recipients = (directory ?? []).filter(
        (d: any) => d.is_supervisor || adminIds.includes(d.user_id)
      );

      const subject = `New team idea: ${idea.title}`;
      const html = `
        <h2>New Team Idea Submitted</h2>
        <p><strong>${idea.title}</strong></p>
        <p>${(idea.description || "").replace(/\n/g, "<br/>")}</p>
        <p>Submitted by: ${idea.submitter_name || idea.submitter_email}</p>
        <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Review in Ops</a></p>
      `;
      const sms = `Forti: New team idea "${idea.title}" from ${idea.submitter_name || idea.submitter_email}. Review: ${link}`;

      await Promise.all(
        recipients.map(async (r: any) => {
          if (r.email) await sendEmail(r.email, subject, html);
          if (r.phone) await sendSms(r.phone, sms);
        })
      );
    } else if (event === "approved" || event === "rejected") {
      const subject = `Your idea was ${event}: ${idea.title}`;
      const html = `
        <h2>Your idea was ${event}</h2>
        <p><strong>${idea.title}</strong></p>
        ${idea.decision_reason ? `<p><em>Reviewer note:</em> ${idea.decision_reason}</p>` : ""}
        <p>Reviewed by: ${idea.reviewed_by_name || "Admin"}</p>
        <p><a href="${link}">View in portal</a></p>
      `;
      const sms = `Forti: Your idea "${idea.title}" was ${event}. ${idea.decision_reason ? `Note: ${idea.decision_reason}` : ""}`;

      if (idea.submitter_email) await sendEmail(idea.submitter_email, subject, html);
      if (idea.submitter_phone) await sendSms(idea.submitter_phone, sms);
    }

    return new Response(JSON.stringify({ ok: true }), {
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
