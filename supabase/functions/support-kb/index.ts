// Support AI Knowledge Base
// Actions: list, get, create, update, delete, ingest-file, search-agent,
//          feedback, add-correction, list-corrections, ingest-faq,
//          ingest-chat, ingest-from-modules, list-files, delete-file,
//          approve, deny
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { directAiEmbeddings, directAiChat } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getCallerAndCheckAccess(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { user: null, isAdmin: false, isSupervisor: false };
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const set = new Set((roles || []).map((r: any) => r.role));
  return { user, isAdmin: set.has("admin"), isSupervisor: set.has("supervisor") };
}

async function embed(text: string): Promise<number[] | null> {
  if (!text || !text.trim()) return null;
  try {
    const embeddings = await directAiEmbeddings(text.slice(0, 8000));
    return embeddings[0] || null;
  } catch (e) {
    console.error("embed error", e);
    return null;
  }
}

async function summarize(content: string): Promise<{ title: string; summary: string; tags: string[] } | null> {
  try {
    const r = await directAiChat({
      messages: [
        { role: "system", content: "You distill support knowledge. Return a concise title (<60 chars), a 1-2 sentence summary, and 3-6 short tags in JSON with keys: title, summary, tags." },
        { role: "user", content: content.slice(0, 6000) },
      ],
    });
    if (!r.ok) return null;
    const j = await r.json();
    const raw = j?.choices?.[0]?.message?.content || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return {
      title: content.slice(0, 50),
      summary: content.slice(0, 150),
      tags: ["support", "knowledge"],
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "";
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Public-ish actions called from other edge functions (system) — protected by service auth header
    const systemSecret = req.headers.get("x-system-secret");
    const isSystem = systemSecret === SERVICE_KEY;
    // Cron / scheduled trigger from pg_cron (uses anon Bearer + custom header)
    const isCron = req.headers.get("x-cron-trigger") !== null;

    // For all user actions, check role
    let caller: Awaited<ReturnType<typeof getCallerAndCheckAccess>> | null = null;
    if (!isSystem && !isCron) {
      caller = await getCallerAndCheckAccess(req);
      if (!caller.user) return json({ error: "Unauthorized" }, 401);
      const allowed = caller.isAdmin || caller.isSupervisor;
      // search-agent and feedback are allowed for any authenticated staff
      const openToStaff = ["search-agent", "feedback"];
      if (!allowed && !openToStaff.includes(action)) {
        return json({ error: "You don't have access to the AI Knowledge Base." }, 403);
      }
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // ---------------- list entries ----------------
    if (action === "list") {
      const source = body.source_type as string | undefined;
      const search = (body.search as string | undefined)?.trim();
      const reviewStatus = body.review_status as string | undefined;
      let q = admin
        .from("support_kb_entries")
        .select("id,title,summary,source_type,source_ref,category,tags,reinforcement_score,upvotes,downvotes,is_active,review_status,denied_reason,created_by_name,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (source && source !== "all") q = q.eq("source_type", source);
      if (reviewStatus && reviewStatus !== "all") q = q.eq("review_status", reviewStatus);
      if (search) q = q.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);

      // Counts per status for tab badges
      const { data: counts } = await admin
        .from("support_kb_entries")
        .select("review_status");
      const stats = { pending: 0, approved: 0, denied: 0 };
      for (const row of counts || []) {
        const s = (row as any).review_status as keyof typeof stats;
        if (s in stats) stats[s]++;
      }
      return json({ entries: data || [], counts: stats });
    }

    // ---------------- get one entry with corrections + feedback ----------------
    if (action === "get") {
      const { id } = body;
      if (!id) return json({ error: "id required" }, 400);
      const [{ data: entry }, { data: corrections }, { data: feedback }] = await Promise.all([
        admin.from("support_kb_entries").select("*").eq("id", id).maybeSingle(),
        admin.from("support_kb_corrections").select("*").eq("entry_id", id).order("created_at", { ascending: false }),
        admin.from("support_kb_feedback").select("*").eq("entry_id", id).order("created_at", { ascending: false }).limit(50),
      ]);
      if (!entry) return json({ error: "not found" }, 404);
      return json({ entry, corrections: corrections || [], feedback: feedback || [] });
    }

    // ---------------- create / update ----------------
    if (action === "create" || action === "update") {
      const { id, title, content, category, tags, source_type, source_ref, source_url, is_active } = body;
      if (!content || !content.trim()) return json({ error: "content required" }, 400);

      let finalTitle = title?.trim();
      let summary: string | null = null;
      let finalTags: string[] = Array.isArray(tags) ? tags : [];
      if (!finalTitle || finalTags.length === 0) {
        const meta = await summarize(content);
        if (meta) {
          if (!finalTitle) finalTitle = meta.title;
          if (finalTags.length === 0) finalTags = meta.tags;
          summary = meta.summary;
        }
      }
      if (!finalTitle) finalTitle = content.slice(0, 60);

      const embedding = await embed(`${finalTitle}\n\n${content}`);

      const payload: any = {
        title: finalTitle,
        content,
        summary,
        category: category ?? null,
        tags: finalTags,
        source_type: source_type || "manual",
        source_ref: source_ref ?? null,
        source_url: source_url ?? null,
        embedding,
        is_active: is_active ?? true,
      };

      if (action === "create" && caller?.user) {
        payload.created_by = caller.user.id;
        const { data: dir } = await admin
          .from("admin_users_directory")
          .select("full_name,email")
          .eq("user_id", caller.user.id)
          .maybeSingle();
        payload.created_by_name = dir?.full_name || dir?.email || caller.user.email;
      }

      if (action === "update") {
        if (!id) return json({ error: "id required" }, 400);
        const { data, error } = await admin
          .from("support_kb_entries")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ entry: data });
      } else {
        const { data, error } = await admin
          .from("support_kb_entries")
          .insert(payload)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ entry: data });
      }
    }

    // ---------------- delete ----------------
    if (action === "delete") {
      if (!caller?.isAdmin) return json({ error: "Admin only" }, 403);
      const { id } = body;
      const { error } = await admin.from("support_kb_entries").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // ---------------- approve / deny pending entry ----------------
    if (action === "approve" || action === "deny") {
      const { id, reason } = body;
      if (!id) return json({ error: "id required" }, 400);
      if (action === "deny" && (!reason || !String(reason).trim())) {
        return json({ error: "reason required to deny" }, 400);
      }

      const { data: dir } = caller?.user
        ? await admin
            .from("admin_users_directory")
            .select("full_name,email")
            .eq("user_id", caller.user.id)
            .maybeSingle()
        : { data: null };
      const reviewerName = dir?.full_name || dir?.email || caller?.user?.email || "Reviewer";

      const updates: Record<string, unknown> = {
        review_status: action === "approve" ? "approved" : "denied",
        denied_reason: action === "deny" ? String(reason).trim() : null,
        reviewed_by: caller?.user?.id ?? null,
        reviewed_by_name: reviewerName,
        reviewed_at: new Date().toISOString(),
        is_active: action === "approve",
      };

      const { data: entry, error } = await admin
        .from("support_kb_entries")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);

      // Denial reason becomes a reinforcement correction so the AI learns what NOT to say
      if (action === "deny") {
        await admin.from("support_kb_corrections").insert({
          entry_id: id,
          rule: `Do not use the entry titled "${entry.title}" — it was denied by review.`,
          reason: String(reason).trim(),
          applies_globally: false,
          created_by: caller?.user?.id ?? null,
          created_by_name: reviewerName,
        });
      }

      return json({ entry });
    }

    // ---------------- upload file (already uploaded to storage by client) ----------------
    if (action === "ingest-file") {
      const { file_path, file_name, mime_type, file_size, text_content } = body;
      if (!text_content || !text_content.trim()) return json({ error: "text_content required" }, 400);

      const { data: fileRow } = await admin
        .from("support_kb_files")
        .insert({
          file_name,
          file_path,
          file_size: file_size ?? null,
          mime_type: mime_type ?? null,
          ingest_status: "processing",
          uploaded_by: caller?.user?.id ?? null,
          uploaded_by_name: caller?.user?.email ?? null,
        })
        .select()
        .single();

      // Chunk content into ~3000-char pieces
      const chunks: string[] = [];
      const text = text_content as string;
      const chunkSize = 3000;
      for (let i = 0; i < text.length; i += chunkSize) chunks.push(text.slice(i, i + chunkSize));

      const entryIds: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const meta = await summarize(chunk);
        const finalTitle = meta?.title || `${file_name} — part ${i + 1}`;
        const embedding = await embed(`${finalTitle}\n\n${chunk}`);
        const { data: e } = await admin
          .from("support_kb_entries")
          .insert({
            title: finalTitle,
            content: chunk,
            summary: meta?.summary ?? null,
            tags: meta?.tags ?? [],
            source_type: "file",
            source_ref: file_name,
            embedding,
            created_by: caller?.user?.id ?? null,
            created_by_name: caller?.user?.email ?? null,
          })
          .select("id")
          .single();
        if (e?.id) entryIds.push(e.id);
      }

      if (fileRow?.id) {
        await admin
          .from("support_kb_files")
          .update({ entry_ids: entryIds, ingest_status: "done" })
          .eq("id", fileRow.id);
      }

      return json({ entry_ids: entryIds, file_id: fileRow?.id });
    }

    // ---------------- list-files ----------------
    if (action === "list-files") {
      const { data, error } = await admin
        .from("support_kb_files")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return json({ error: error.message }, 500);
      return json({ files: data || [] });
    }

    if (action === "delete-file") {
      if (!caller?.isAdmin) return json({ error: "Admin only" }, 403);
      const { id } = body;
      const { data: f } = await admin.from("support_kb_files").select("file_path,entry_ids").eq("id", id).maybeSingle();
      if (f?.entry_ids?.length) {
        await admin.from("support_kb_entries").delete().in("id", f.entry_ids);
      }
      if (f?.file_path) {
        await admin.storage.from("support-kb-files").remove([f.file_path]);
      }
      await admin.from("support_kb_files").delete().eq("id", id);
      return json({ ok: true });
    }

    // ---------------- agent search (semantic) ----------------
    if (action === "search-agent") {
      const { query, limit } = body;
      if (!query || !query.trim()) return json({ matches: [] });
      const e = await embed(query);
      if (!e) return json({ matches: [], error: "embedding_failed" });
      const { data, error } = await admin.rpc("match_support_kb", {
        query_embedding: e,
        match_count: Math.min(Number(limit) || 8, 20),
        min_score: 0.4,
      });
      if (error) return json({ error: error.message }, 500);

      // Also pull global corrections
      const { data: globalCorr } = await admin
        .from("support_kb_corrections")
        .select("rule,reason")
        .eq("applies_globally", true)
        .order("created_at", { ascending: false })
        .limit(20);

      return json({ matches: data || [], global_corrections: globalCorr || [] });
    }

    // ---------------- feedback ----------------
    if (action === "feedback") {
      const { entry_id, rating, context, ticket_id } = body;
      if (!entry_id || ![1, -1].includes(Number(rating))) return json({ error: "entry_id + rating(±1) required" }, 400);
      const r = Number(rating);
      const { data: dir } = await admin
        .from("admin_users_directory")
        .select("full_name,email")
        .eq("user_id", caller!.user!.id)
        .maybeSingle();
      await admin.from("support_kb_feedback").insert({
        entry_id,
        rating: r,
        context: context ?? null,
        ticket_id: ticket_id ?? null,
        rated_by: caller!.user!.id,
        rated_by_name: dir?.full_name || dir?.email || caller!.user!.email,
      });
      // bump counters and reinforcement score
      const col = r === 1 ? "upvotes" : "downvotes";
      const { data: cur } = await admin.from("support_kb_entries").select(`${col},reinforcement_score`).eq("id", entry_id).maybeSingle();
      if (cur) {
        await admin
          .from("support_kb_entries")
          .update({
            [col]: ((cur as any)[col] || 0) + 1,
            reinforcement_score: (cur.reinforcement_score || 0) + r,
          })
          .eq("id", entry_id);
      }
      return json({ ok: true });
    }

    // ---------------- corrections ----------------
    if (action === "add-correction") {
      const { entry_id, rule, reason, applies_globally } = body;
      if (!rule) return json({ error: "rule required" }, 400);
      const { data: dir } = await admin
        .from("admin_users_directory")
        .select("full_name,email")
        .eq("user_id", caller!.user!.id)
        .maybeSingle();
      const { data, error } = await admin
        .from("support_kb_corrections")
        .insert({
          entry_id: entry_id ?? null,
          rule,
          reason: reason ?? null,
          applies_globally: !!applies_globally,
          created_by: caller!.user!.id,
          created_by_name: dir?.full_name || dir?.email || caller!.user!.email,
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ correction: data });
    }

    if (action === "list-corrections") {
      const { entry_id, only_global } = body;
      let q = admin.from("support_kb_corrections").select("*").order("created_at", { ascending: false });
      if (entry_id) q = q.eq("entry_id", entry_id);
      if (only_global) q = q.eq("applies_globally", true);
      const { data, error } = await q.limit(200);
      if (error) return json({ error: error.message }, 500);
      return json({ corrections: data || [] });
    }

    if (action === "delete-correction") {
      if (!caller?.isAdmin) return json({ error: "Admin only" }, 403);
      const { id } = body;
      await admin.from("support_kb_corrections").delete().eq("id", id);
      return json({ ok: true });
    }

    // ---------------- ingest from FAQ answer (called by support-faq) ----------------
    if (action === "ingest-faq") {
      const { question, answer, ticket_number, ticket_id, answered_by_name } = body;
      if (!question || !answer) return json({ error: "question + answer required" }, 400);
      const content = `Q: ${question}\n\nA: ${answer}`;
      const meta = await summarize(content);
      const embedding = await embed(`${meta?.title || question}\n\n${content}`);
      const { data, error } = await admin
        .from("support_kb_entries")
        .insert({
          title: meta?.title || question.slice(0, 60),
          content,
          summary: meta?.summary || null,
          tags: meta?.tags || [],
          source_type: "faq",
          source_ref: ticket_number || ticket_id || null,
          embedding,
          created_by_name: answered_by_name || "FAQ auto-ingest",
          review_status: "pending",
          is_active: false,
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ entry: data });
    }

    // ---------------- ingest closed chat transcript ----------------
    if (action === "ingest-chat") {
      const { transcript, ticket_id, ticket_number } = body;
      if (!transcript) return json({ error: "transcript required" }, 400);
      const meta = await summarize(transcript);
      const embedding = await embed(`${meta?.title || "Chat session"}\n\n${transcript}`);
      const { data, error } = await admin
        .from("support_kb_entries")
        .insert({
          title: meta?.title || `Chat session ${ticket_number || ""}`.trim(),
          content: transcript.slice(0, 12000),
          summary: meta?.summary || null,
          tags: meta?.tags || [],
          source_type: "chat",
          source_ref: ticket_number || ticket_id || null,
          embedding,
          created_by_name: "Chat auto-ingest",
          review_status: "pending",
          is_active: false,
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ entry: data });
    }

    // ---------------- bulk pull from other modules ----------------
    if (action === "ingest-from-modules") {
      const sources = (body.sources as string[]) || ["knowledge_articles", "faq_patterns", "academy_lessons"];
      // Cron + auto-ingests land as pending; manual sync from UI defaults to approved
      const asPending = body.as_pending === true || isCron;
      const created: any[] = [];

      const upsertEntry = async (
        sourceType: string,
        ref: string,
        title: string,
        content: string,
        category?: string | null,
      ) => {
        const { data: existing } = await admin
          .from("support_kb_entries")
          .select("id")
          .eq("source_type", sourceType)
          .eq("source_ref", ref)
          .maybeSingle();
        const embedding = await embed(`${title}\n\n${content}`);
        if (existing?.id) {
          await admin
            .from("support_kb_entries")
            .update({ title, content, embedding, category: category || null })
            .eq("id", existing.id);
          created.push({ id: existing.id, source: sourceType, action: "updated" });
        } else {
          const meta = await summarize(content);
          const { data } = await admin
            .from("support_kb_entries")
            .insert({
              title,
              content,
              summary: meta?.summary || null,
              tags: meta?.tags || [],
              category: category || null,
              source_type: sourceType,
              source_ref: ref,
              embedding,
              created_by_name: asPending ? "Daily auto-sync" : "Module sync",
              review_status: asPending ? "pending" : "approved",
              is_active: !asPending,
            })
            .select("id")
            .single();
          if (data) created.push({ id: data.id, source: sourceType, action: "created" });
        }
      };

      if (sources.includes("knowledge_articles")) {
        const { data } = await admin.from("knowledge_articles").select("id,title,content,category").eq("is_active", true);
        for (const a of data || []) {
          await upsertEntry("module:knowledge_articles", a.id, a.title, a.content, a.category);
        }
      }
      if (sources.includes("faq_patterns")) {
        const { data } = await admin.from("faq_patterns").select("id,question,answer,category").eq("approved", true);
        for (const f of data || []) {
          await upsertEntry("module:faq_patterns", f.id, f.question, `Q: ${f.question}\n\nA: ${f.answer}`, f.category);
        }
      }
      if (sources.includes("academy_lessons")) {
        const { data } = await admin.from("academy_lessons").select("id,title,content").limit(500);
        for (const l of data || []) {
          await upsertEntry("module:academy_lessons", l.id, l.title, l.content);
        }
      }

      return json({ count: created.length, results: created, as_pending: asPending });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("support-kb error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
