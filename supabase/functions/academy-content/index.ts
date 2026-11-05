// Forti Driver Academy — content & progress (modules, lessons, complete, certs, firearm)
import { corsHeaders, svc, getDriverFromSession } from "../_shared/academy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const drv = await getDriverFromSession(req);
    if (!drv) return json({ error: "unauthorized" }, 401);
    const body = await req.json();
    const action = body.action;
    const db = svc();

    if (action === "modules") {
      const { data: modules } = await db.from("academy_modules")
        .select("id, key, title, summary, level_key, display_order, is_firearm")
        .eq("is_active", true).order("display_order");
      const { data: lessons } = await db.from("academy_lessons")
        .select("id, module_id, title, content, takeaways, scenario, display_order").order("display_order");
      const { data: progress } = await db.from("academy_lesson_progress")
        .select("lesson_id").eq("driver_id", drv.id);
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
      await db.from("academy_lesson_progress").upsert(
        { driver_id: drv.id, lesson_id }, { onConflict: "driver_id,lesson_id" }
      );
      return json({ ok: true });
    }

    if (action === "certifications") {
      const { data } = await db.from("academy_certifications")
        .select("id, level_key, issued_at, expires_at, revoked")
        .eq("driver_id", drv.id).eq("revoked", false).order("issued_at", { ascending: false });
      return json({ certifications: data || [] });
    }

    if (action === "firearm-get") {
      const { data } = await db.from("academy_firearm_compliance").select("*").eq("driver_id", drv.id).maybeSingle();
      return json({ compliance: data });
    }

    if (action === "firearm-save") {
      const { permit_state, permit_number, permit_expires, external_cert_provider,
        acknowledged_disclosure, acknowledged_storage, acknowledged_legal } = body;
      const payload = {
        driver_id: drv.id, permit_state, permit_number, permit_expires,
        external_cert_provider,
        acknowledged_disclosure: !!acknowledged_disclosure,
        acknowledged_storage: !!acknowledged_storage,
        acknowledged_legal: !!acknowledged_legal,
        review_status: "pending",
      };
      await db.from("academy_firearm_compliance").upsert(payload, { onConflict: "driver_id" });
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("academy-content", e);
    return json({ error: String((e as Error).message) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
