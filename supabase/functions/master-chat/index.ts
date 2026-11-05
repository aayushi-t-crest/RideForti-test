import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
import { directAiChat } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "x-chat-id",
};

const ALL_DEPARTMENTS = ["support", "sales", "ops", "marketing", "development", "admin"] as const;
type Dept = typeof ALL_DEPARTMENTS[number];

interface Attachment {
  name: string;
  type: string; // MIME
  size?: number;
  path: string; // storage path inside nova-uploads
  signedUrl?: string; // for images (vision)
}

const buildSystemPrompt = (allowedDepts: Dept[], isAdmin: boolean, hasKnowledgeAccess: boolean) => {
  const scope = isAdmin
    ? "You have full visibility across every department: Support, Sales, Ops, Marketing, Development, and Admin."
    : allowedDepts.length > 0
      ? `You ONLY have visibility into the following departments for this user: ${allowedDepts.join(", ")}${hasKnowledgeAccess ? ", plus the shared knowledge base" : ""}. You MUST refuse to answer questions about departments outside this list. If asked about a restricted department, respond exactly: "You don't have access to [department] data. Please reach out to an admin to upgrade your account for that information." Do not reveal data from restricted departments under any circumstances.`
      : hasKnowledgeAccess
        ? `This user only has access to the shared knowledge base — no department/operational data. Answer KB questions naturally, but for anything about tickets, tasks, OKRs, events, or waitlist, respond exactly: "You don't have access to that yet. Reach out to an admin to upgrade your account."`
        : `This user has NO access. For any question, respond exactly: "You don't have access to any data yet. Please reach out to an admin to upgrade your account."`;


  return `You're Nova — part of the Forti ops crew. Forti is a luxury rideshare and personal protection platform, and you sit inside the admin portal helping the team think through what's happening across the company. Talk to people like a smart coworker who's already up to speed, not like a chatbot reading a script.

${scope}

How you talk:
- Real conversation, not status reports. Lead with a thought or a take, then back it up with the data.
- Match the user's energy. If they send one line, send one line back. If they want detail, go deeper.
- Use contractions, casual openers ("Yeah, so…", "Honestly,", "Quick read:", "Not a ton today —"), and the occasional aside. Dry wit is fine when it fits.
- Skip the corporate filler: no "I'd be happy to assist", no "Certainly!", no "As an AI". You're Nova, full stop.
- React to what the user actually said before pivoting to data. If something's interesting or weird in the numbers, say so.
- Ask a follow-up only when you genuinely need one or it'd unlock a better answer — not as a polite tic.
- No emojis. No bullet walls. Prose first; lists only when the user wants a rundown or it's truly clearer.
- Vary how you open replies. Don't start every message the same way.

What to ground in:
- Every claim comes from the data injected below (KB, tickets, tasks, OKRs, events, waitlist) and only from departments this user can see.
- Drop specifics in naturally — "ticket #1423 from this morning", "the Vegas pickup tomorrow at 6" — instead of dumping a list.
- If there's nothing notable, just say that and suggest a useful next move.
- For attachments: actually read them. Reference real details from the file, not generic summaries.`;
};

// Extract text from a document attachment (PDF/DOCX/TXT/CSV/MD/JSON)
async function extractDocText(att: Attachment, signedUrl: string): Promise<string | null> {
  try {
    const resp = await fetch(signedUrl);
    if (!resp.ok) return null;
    const type = att.type.toLowerCase();
    const isText =
      type.startsWith("text/") ||
      type === "application/json" ||
      type === "application/csv" ||
      att.name.match(/\.(txt|md|csv|json|log)$/i);

    if (isText) {
      const txt = await resp.text();
      return txt.slice(0, 60_000); // cap to ~60KB per file
    }

    if (type === "application/pdf" || att.name.toLowerCase().endsWith(".pdf")) {
      const buf = new Uint8Array(await resp.arrayBuffer());
      // Lightweight text extraction by stripping non-printable bytes
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      const text = decoded.replace(/[^\x20-\x7E\n\r\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
      return text.slice(0, 60_000) || "[PDF received but text could not be extracted reliably. Tell the user it looks like a scanned/image PDF and ask for a text version if details matter.]";
    }

    if (
      att.name.toLowerCase().endsWith(".docx") ||
      type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // DOCX is a zip; do a best-effort string scan for readable text
      const buf = new Uint8Array(await resp.arrayBuffer());
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      const text = decoded.replace(/[^\x20-\x7E\n\r\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
      return text.slice(0, 60_000) || "[DOCX received but text could not be extracted. Ask for a plain-text version.]";
    }

    return `[Attachment ${att.name} of type ${att.type} could not be read directly.]`;
  } catch (e) {
    console.error("extractDocText error", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { messages, chat_id, attachments } = body as {
      messages: Array<{ role: string; content: string }>;
      chat_id?: string;
      attachments?: Attachment[];
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email || "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Permissions
    const PRIMARY_ADMIN_EMAIL = "tori@rideforti.com";
    const isPrimaryAdmin = userEmail.toLowerCase() === PRIMARY_ADMIN_EMAIL;
    const { data: roleRows } = await supabase
      .from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = isPrimaryAdmin || (roleRows || []).some((r) => r.role === "admin");

    // Pull module-level permissions to scope non-admin users
    const { data: modulePerms } = await supabase
      .from("user_module_permissions")
      .select("module_name, access_level")
      .eq("user_id", userId);
    const modules = new Set((modulePerms || []).map((p: any) => String(p.module_name).toLowerCase()));

    // Map module access → department visibility for Nova's context
    // Modules: waitlist, tickets, okr, users, knowledge, content
    let allowedDepts: Dept[];
    if (isAdmin) {
      allowedDepts = [...ALL_DEPARTMENTS];
    } else {
      const set = new Set<Dept>();
      if (modules.has("tickets")) set.add("support");
      if (modules.has("okr")) { set.add("ops"); set.add("sales"); set.add("development"); }
      if (modules.has("content")) set.add("marketing");
      if (modules.has("waitlist") || modules.has("users")) set.add("admin");
      allowedDepts = Array.from(set);
    }
    const hasKnowledgeAccess = isAdmin || modules.has("knowledge");

    // ─── Ensure / verify chat ownership ───
    let activeChatId = chat_id;
    if (activeChatId) {
      const { data: chatRow } = await supabase
        .from("nova_chats").select("id, user_id").eq("id", activeChatId).maybeSingle();
      if (!chatRow || chatRow.user_id !== userId) {
        activeChatId = undefined;
      }
    }
    if (!activeChatId) {
      const firstUserMsg = messages.find((m) => m.role === "user")?.content || "New chat";
      const initialTitle = firstUserMsg.slice(0, 60);
      const { data: created, error: createErr } = await supabase
        .from("nova_chats")
        .insert({ user_id: userId, title: initialTitle })
        .select("id")
        .single();
      if (createErr) throw createErr;
      activeChatId = created.id;
    }

    // Persist the latest user message (with attachments metadata)
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      await supabase.from("nova_messages").insert({
        chat_id: activeChatId,
        role: "user",
        content: lastUserMsg.content,
        attachments: (attachments || []) as any,
      });
      await supabase
        .from("nova_chats")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", activeChatId);
    }

    // ─── Operational context (same as before) ───
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let context = "";
    if (allowedDepts.length > 0 || hasKnowledgeAccess) {
      const [knowledgeRes, ticketsRes, tasksRes, eventsRes, okrRes, waitlistRes] = await Promise.all([
        hasKnowledgeAccess
          ? supabase.from("knowledge_articles").select("title, content, category").eq("is_active", true)
          : Promise.resolve({ data: [] as any[] }),
        allowedDepts.includes("support")
          ? supabase.from("support_tickets").select("id, subject, status, first_name, last_name, human_requested, needs_staff_attention, created_at").order("created_at", { ascending: false }).limit(25)
          : Promise.resolve({ data: [] as any[] }),
        allowedDepts.length > 0
          ? supabase.from("tasks").select("id, title, status, priority, due_date, department, assigned_to").neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(100)
          : Promise.resolve({ data: [] as any[] }),
        allowedDepts.length > 0
          ? supabase.from("department_events").select("title, event_date, event_time, department, location").gte("event_date", todayIso).lte("event_date", weekFromNow).order("event_date", { ascending: true }).limit(60)
          : Promise.resolve({ data: [] as any[] }),
        allowedDepts.length > 0
          ? supabase.from("okr_objectives").select("title, department, time_period, progress, status").neq("status", "completed").limit(40)
          : Promise.resolve({ data: [] as any[] }),
        allowedDepts.includes("admin")
          ? supabase.from("waitlist").select("id", { count: "exact", head: true })
          : Promise.resolve({ count: null as number | null }),
      ]);

      if (knowledgeRes.data?.length) {
        context += "\n\n--- KNOWLEDGE BASE ---\n";
        for (const a of knowledgeRes.data) context += `\n[${a.category}] ${a.title}\n${a.content}\n`;
      }
      if (ticketsRes.data?.length) {
        context += "\n\n--- RECENT SUPPORT TICKETS (department: support) ---\n";
        for (const t of ticketsRes.data) {
          const flags = [];
          if (t.human_requested) flags.push("HUMAN REQUESTED");
          if (t.needs_staff_attention) flags.push("NEEDS ATTENTION");
          context += `#${t.id.slice(0, 8)} | ${t.subject} | ${t.status} | ${t.first_name} ${t.last_name}${flags.length ? " | " + flags.join(", ") : ""}\n`;
        }
      }
      const allowedSet = new Set<string>(allowedDepts);
      const filterDept = (d: string | null | undefined) => {
        const key = (d || "general").toLowerCase();
        if (key === "general" || key === "all") return allowedDepts.length > 0;
        return allowedSet.has(key);
      };
      const filteredTasks = (tasksRes.data || []).filter((t) => filterDept(t.department));
      if (filteredTasks.length) {
        context += "\n\n--- OPEN TASKS ---\n";
        for (const t of filteredTasks) {
          context += `[${t.department || "general"}] ${t.title} | ${t.status} | priority: ${t.priority}${t.due_date ? ` | due: ${t.due_date}` : ""}${t.assigned_to ? ` | assigned: ${t.assigned_to}` : ""}\n`;
        }
      }
      const filteredEvents = (eventsRes.data || []).filter((e) => filterDept(e.department));
      if (filteredEvents.length) {
        context += "\n\n--- UPCOMING EVENTS (next 7 days) ---\n";
        for (const e of filteredEvents) {
          context += `${e.event_date}${e.event_time ? " " + e.event_time : ""} | [${e.department}] ${e.title}${e.location ? " @ " + e.location : ""}\n`;
        }
      }
      const filteredOkrs = (okrRes.data || []).filter((o) => filterDept(o.department));
      if (filteredOkrs.length) {
        context += "\n\n--- ACTIVE OKR OBJECTIVES ---\n";
        for (const o of filteredOkrs) {
          context += `[${o.department}] ${o.title} | ${o.time_period} | ${o.progress}% | ${o.status}\n`;
        }
      }
      if (typeof waitlistRes.count === "number") {
        context += `\n\n--- WAITLIST (department: admin) ---\nTotal signups: ${waitlistRes.count}\n`;
      }
    }
    context += `\n\n--- TODAY ---\n${todayIso}\n`;
    context += `\n\n--- USER ACCESS ---\nallowed_departments: ${allowedDepts.length ? allowedDepts.join(", ") : "none"} | knowledge_base: ${hasKnowledgeAccess ? "yes" : "no"}\n`;

    // ─── Process attachments: fetch signed URLs, extract docs, build vision parts ───
    const imageParts: Array<{ type: "image_url"; image_url: { url: string } }> = [];
    if (attachments && attachments.length > 0) {
      context += "\n\n--- USER ATTACHMENTS ---\n";
      for (const att of attachments) {
        // Generate fresh signed URL (server-side, service role)
        const { data: signed } = await supabase.storage
          .from("nova-uploads")
          .createSignedUrl(att.path, 60 * 30); // 30 minutes
        const url = signed?.signedUrl;
        if (!url) {
          context += `\n[${att.name}] could not be retrieved.\n`;
          continue;
        }
        const isImage = att.type.startsWith("image/");
        if (isImage) {
          imageParts.push({ type: "image_url", image_url: { url } });
          context += `\n[Image: ${att.name}] (passed to vision)\n`;
        } else {
          const text = await extractDocText(att, url);
          context += `\n=== File: ${att.name} (${att.type}) ===\n${text || "[Unreadable]"}\n=== End of ${att.name} ===\n`;
        }
      }
    }

    const systemPrompt = buildSystemPrompt(allowedDepts, isAdmin, hasKnowledgeAccess) + context;

    // Build final messages: if images attached, last user message becomes multipart
    const finalMessages: any[] = [{ role: "system", content: systemPrompt }];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const isLastUser = i === messages.length - 1 && m.role === "user" && imageParts.length > 0;
      if (isLastUser) {
        finalMessages.push({
          role: "user",
          content: [{ type: "text", text: m.content || "Please analyze the attached image(s)." }, ...imageParts],
        });
      } else {
        finalMessages.push(m);
      }
    }

    const response = await directAiChat({
      messages: finalMessages,
      stream: false,
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await response.json();
    const assistantContent = aiJson.choices?.[0]?.message?.content || "";

    if (assistantContent && activeChatId) {
      try {
        await supabase.from("nova_messages").insert({
          chat_id: activeChatId,
          role: "assistant",
          content: assistantContent,
        });
        await supabase
          .from("nova_chats")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", activeChatId);
      } catch (e) {
        console.error("capture error", e);
      }
    }

    return new Response(JSON.stringify(aiJson), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Chat-Id": activeChatId,
      },
    });
  } catch (e) {
    console.error("master-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
