import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { sendDirectEmail } from "../_shared/resend.ts";
import { sendDirectSms } from "../_shared/twilio.ts";
import { directAiChat } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  return sendDirectEmail({
    to,
    subject,
    html,
    from: "Forti Support <notify@rideforti.com>",
  });
}

async function sendSms(to: string, body: string) {
  return sendDirectSms({ to, body });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Verify user is admin OR has tickets module access
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    let allowed = isAdmin;
    if (!allowed) {
      const { data: perms } = await admin.from("user_module_permissions").select("module_name").eq("user_id", user.id).eq("module_name", "tickets");
      allowed = (perms ?? []).length > 0;
    }
    if (!allowed) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const { ticket_id } = body;
      const { data, error } = await admin
        .from("support_internal_notes")
        .select("*, support_internal_note_attachments(*)")
        .eq("ticket_id", ticket_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ notes: data ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list_mentionable") {
      // admins + supervisors + users with tickets module access
      const [{ data: dirAll }, { data: rolesAll }, { data: perms }] = await Promise.all([
        admin.from("admin_users_directory").select("user_id, email, full_name").eq("active", true),
        admin.from("user_roles").select("user_id, role"),
        admin.from("user_module_permissions").select("user_id").eq("module_name", "tickets"),
      ]);
      const adminIds = new Set((rolesAll ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));
      const permIds = new Set((perms ?? []).map((p: any) => p.user_id));
      const { data: supDir } = await admin.from("admin_users_directory").select("user_id").eq("is_supervisor", true);
      const supIds = new Set((supDir ?? []).map((s: any) => s.user_id));
      const out = (dirAll ?? []).filter((u: any) =>
        adminIds.has(u.user_id) || supIds.has(u.user_id) || permIds.has(u.user_id)
      );
      return new Response(JSON.stringify({ users: out }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create") {
      const { ticket_id, content, mentions = [], attachments = [], is_ai = false } = body;
      if (!ticket_id || !content) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: dir } = await admin.from("admin_users_directory").select("full_name, email").eq("user_id", user.id).maybeSingle();
      const author_name = is_ai ? "AI Assistant" : (dir?.full_name || dir?.email || user.email || "Staff");
      const author_email = dir?.email || user.email || null;

      const { data: note, error } = await admin
        .from("support_internal_notes")
        .insert({
          ticket_id,
          author_id: is_ai ? null : user.id,
          author_name,
          author_email,
          content,
          mentions,
          is_ai,
        })
        .select()
        .single();
      if (error) throw error;

      // Attachments
      if (Array.isArray(attachments) && attachments.length > 0) {
        const rows = attachments.map((a: any) => ({
          note_id: note.id,
          file_name: a.file_name,
          file_url: a.file_url,
          file_size: a.file_size ?? null,
          file_type: a.file_type ?? null,
        }));
        await admin.from("support_internal_note_attachments").insert(rows);
      }

      // Notify mentioned users
      if (Array.isArray(mentions) && mentions.length > 0) {
        const ids = mentions.map((m: any) => m.user_id).filter(Boolean);
        if (ids.length > 0) {
          const { data: targets } = await admin.from("admin_users_directory").select("user_id, email, full_name, phone").in("user_id", ids);
          const { data: ticket } = await admin.from("support_tickets").select("id, first_name, last_name, subject").eq("id", ticket_id).maybeSingle();
          const ticketLabel = ticket ? `#${ticket.id.slice(0, 8).toUpperCase()} — ${ticket.first_name} ${ticket.last_name}` : ticket_id;
          for (const t of targets ?? []) {
            const subject = `${author_name} mentioned you on ticket ${ticketLabel}`;
            const html = `<p><strong>${author_name}</strong> mentioned you in an internal note on <strong>${ticketLabel}</strong>.</p><blockquote style="border-left:3px solid #888;padding-left:12px;color:#444;">${content.replace(/</g,"&lt;").slice(0, 800)}</blockquote><p><a href="https://rideforti.com/admin">Open the ticket</a></p>`;
            if (t.email) await sendEmail(t.email, subject, html);
            if (t.phone) await sendSms(t.phone, `Forti Support: ${author_name} mentioned you on ticket ${ticketLabel}`);
          }
        }
      }

      return new Response(JSON.stringify({ note }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "ai_scan") {
      const { ticket_id } = body;
      const { data: msgs } = await admin
        .from("support_chat_messages")
        .select("role, content, staff_name, created_at")
        .eq("session_id", (await admin.from("support_chat_sessions").select("id").eq("contact_id", (await admin.from("support_tickets").select("email").eq("id", ticket_id).maybeSingle()).data?.email || "").maybeSingle()).data?.id || "")
        .order("created_at", { ascending: true })
        .limit(200);

      // Simpler: fetch via ticket->contact->session
      const { data: ticket } = await admin.from("support_tickets").select("email, subject, description").eq("id", ticket_id).maybeSingle();
      let messages = msgs ?? [];
      if (!messages.length && ticket) {
        const { data: contact } = await admin.from("support_contacts").select("id").eq("email", ticket.email).maybeSingle();
        if (contact) {
          const { data: session } = await admin.from("support_chat_sessions").select("id").eq("contact_id", contact.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (session) {
            const { data: m2 } = await admin.from("support_chat_messages").select("role, content, staff_name, created_at").eq("session_id", session.id).order("created_at", { ascending: true }).limit(200);
            messages = m2 ?? [];
          }
        }
      }

      const transcript = messages.map((m: any) => `[${m.role}${m.staff_name ? `:${m.staff_name}` : ""}] ${m.content}`).join("\n");

      const aiResp = await directAiChat({
        messages: [
          { role: "system", content: "You are an internal support analyst. Write a concise internal note (<=180 words) summarizing key points, blockers, customer intent, and any action items. Plain text only — no markdown headings." },
          { role: "user", content: `Ticket subject: ${ticket?.subject ?? ""}\n\nConversation:\n${transcript || "(no messages)"}` },
        ],
      });

      if (!aiResp.ok) {
        const t = await aiResp.text();
        return new Response(JSON.stringify({ error: "AI failed", detail: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const aiJson = await aiResp.json();
      const summary = aiJson.choices?.[0]?.message?.content?.trim() || "(no summary)";

      const { data: note, error } = await admin.from("support_internal_notes").insert({
        ticket_id,
        author_id: null,
        author_name: "AI Assistant",
        author_email: null,
        content: summary,
        mentions: [],
        is_ai: true,
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ note }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("support-internal-notes error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
