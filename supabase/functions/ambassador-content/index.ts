// Forti Ambassador Academy — content & progress (modules, lessons, complete, certs)
import { corsHeaders, svc, getAmbassadorFromSession } from "../_shared/ambassador.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const u = await getAmbassadorFromSession(req);
    if (!u) return json({ error: "unauthorized" }, 401);
    const body = await req.json();
    const action = body.action;
    const db = svc();

    if (action === "modules") {
      const { data: modules } = await db.from("ambassador_modules")
        .select("id, key, title, summary, level_key, group_key, display_order")
        .eq("is_active", true).order("display_order");
      const { data: lessons } = await db.from("ambassador_lessons")
        .select("id, module_id, title, content, takeaways, scenario, display_order").order("display_order");
      const { data: progress } = await db.from("ambassador_lesson_progress")
        .select("lesson_id").eq("ambassador_id", u.id);
      const completedSet = new Set((progress || []).map((p) => p.lesson_id));
      return json({
        modules: (modules || []).map((m) => ({
          ...m,
          lessons: (lessons || []).filter((l) => l.module_id === m.id).map((l) => ({
            ...l, completed: completedSet.has(l.id),
          })),
        })),
      });
    }

    if (action === "complete-lesson") {
      const { lesson_id } = body;
      await db.from("ambassador_lesson_progress").upsert(
        { ambassador_id: u.id, lesson_id }, { onConflict: "ambassador_id,lesson_id" }
      );
      return json({ ok: true });
    }

    if (action === "certifications") {
      const { data } = await db.from("ambassador_certifications")
        .select("id, level_key, issued_at, expires_at, revoked")
        .eq("ambassador_id", u.id).eq("revoked", false).order("issued_at", { ascending: false });
      return json({ certifications: data || [] });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("ambassador-content", e);
    return json({ error: String((e as Error).message) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
