// Daily recertification job: revokes expired certifications and downgrades drivers' current_level.
import { svc, corsHeaders } from "../_shared/academy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = svc();
  const now = new Date().toISOString();

  // 1. Mark expired certs as revoked
  const { data: expired, error: e1 } = await sb
    .from("academy_certifications")
    .update({ revoked: true, revoked_reason: "expired" })
    .lt("expires_at", now)
    .eq("revoked", false)
    .select("driver_id, level_key");

  if (e1) {
    console.error("[recert] expire error", e1);
    return new Response(JSON.stringify({ ok: false, error: e1.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  // 2. For each affected driver, recompute their highest active cert
  const driverIds = Array.from(new Set((expired || []).map((r: any) => r.driver_id)));
  const ladder = ["CD", "AO", "EO"];
  let downgraded = 0;

  for (const did of driverIds) {
    const { data: active } = await sb
      .from("academy_certifications")
      .select("level_key")
      .eq("driver_id", did)
      .eq("revoked", false)
      .gt("expires_at", now);

    let highest = "none";
    for (const lvl of ladder) {
      if ((active || []).some((a: any) => a.level_key === lvl)) highest = lvl;
    }

    await sb.from("academy_drivers").update({ current_level: highest, updated_at: now }).eq("id", did);
    downgraded++;
  }

  return new Response(
    JSON.stringify({ ok: true, expired_count: (expired || []).length, drivers_downgraded: downgraded }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
