// Forti Driver Academy — adaptive quiz engine
import { corsHeaders, svc, getDriverFromSession } from "../_shared/academy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const drv = await getDriverFromSession(req);
    if (!drv) return json({ error: "unauthorized" }, 401);
    const body = await req.json();
    const action = body.action;
    const db = svc();

    // Start a new quiz attempt for a level
    if (action === "start") {
      const level_key = body.level_key || "CD";
      const { data: existing } = await db.from("academy_quiz_attempts")
        .select("id").eq("driver_id", drv.id).eq("level_key", level_key).eq("status", "in_progress").maybeSingle();
      if (existing) return json({ ok: true, attempt_id: existing.id });
      const { data, error } = await db.from("academy_quiz_attempts").insert({
        driver_id: drv.id, level_key, current_difficulty: "easy",
      }).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, attempt_id: data.id });
    }

    // Get next question (adaptive)
    if (action === "next") {
      const { attempt_id } = body;
      const { data: attempt } = await db.from("academy_quiz_attempts").select("*").eq("id", attempt_id).eq("driver_id", drv.id).maybeSingle();
      if (!attempt) return json({ error: "attempt not found" }, 404);
      if (attempt.status !== "in_progress") return json({ error: "attempt already finished", status: attempt.status, attempt }, 400);

      if (attempt.questions_served >= 30) {
        return await finalize(db, attempt);
      }

      const { data: answered } = await db.from("academy_attempt_answers")
        .select("question_id").eq("attempt_id", attempt_id);
      const answeredIds = (answered || []).map((a) => a.question_id);

      // Pull a question at current difficulty
      let q = await pickQuestion(db, attempt.current_difficulty, attempt.level_key, answeredIds);
      // fallback: any difficulty for that level
      if (!q) q = await pickQuestion(db, null, attempt.level_key, answeredIds);
      // fallback: any level
      if (!q) q = await pickQuestion(db, null, null, answeredIds);
      if (!q) return json({ error: "no questions available" }, 500);

      return json({
        ok: true,
        question: {
          id: q.id, prompt: q.prompt, options: q.options,
          difficulty: q.difficulty, is_scenario: q.is_scenario,
          module_key: q.module_key,
        },
        progress: { served: attempt.questions_served, total: 30, correct: attempt.correct_count },
      });
    }

    // Submit answer for current question
    if (action === "answer") {
      const { attempt_id, question_id, selected_index } = body;
      const { data: attempt } = await db.from("academy_quiz_attempts").select("*").eq("id", attempt_id).eq("driver_id", drv.id).maybeSingle();
      if (!attempt || attempt.status !== "in_progress") return json({ error: "invalid attempt" }, 400);
      const { data: q } = await db.from("academy_questions").select("*").eq("id", question_id).maybeSingle();
      if (!q) return json({ error: "invalid question" }, 400);

      const is_correct = q.correct_index === selected_index;
      await db.from("academy_attempt_answers").insert({
        attempt_id, question_id,
        difficulty_served: q.difficulty,
        selected_index, is_correct,
      });

      // Adaptive: correct → harder, incorrect → easier/hold
      const next_difficulty = adapt(attempt.current_difficulty, is_correct);
      const new_served = attempt.questions_served + 1;
      const new_correct = attempt.correct_count + (is_correct ? 1 : 0);

      const updates: Record<string, unknown> = {
        questions_served: new_served,
        correct_count: new_correct,
        current_difficulty: next_difficulty,
      };

      if (new_served >= 30) {
        const score = Math.round((new_correct / 30) * 100);
        const { data: level } = await db.from("academy_levels").select("pass_threshold").eq("key", attempt.level_key).maybeSingle();
        const threshold = level?.pass_threshold ?? 85;
        const passed = score >= threshold;
        updates.status = "completed";
        updates.score = score;
        updates.passed = passed;
        updates.completed_at = new Date().toISOString();
        await db.from("academy_quiz_attempts").update(updates).eq("id", attempt_id);

        if (passed) {
          // Issue/refresh certification
          await db.from("academy_certifications").insert({
            driver_id: drv.id, level_key: attempt.level_key, attempt_id,
          });
          // Bump driver level if higher rank
          await maybeBumpLevel(db, drv.id, attempt.level_key);
          await recomputeFortiScore(db, drv.id);
        }

        return json({
          ok: true, is_correct, explanation: q.explanation,
          done: true, score, passed, threshold,
        });
      }

      await db.from("academy_quiz_attempts").update(updates).eq("id", attempt_id);
      return json({ ok: true, is_correct, explanation: q.explanation, done: false });
    }

    // Get attempt history
    if (action === "history") {
      const { data } = await db.from("academy_quiz_attempts")
        .select("id, level_key, status, score, passed, started_at, completed_at, questions_served, correct_count")
        .eq("driver_id", drv.id).order("started_at", { ascending: false }).limit(20);
      return json({ attempts: data || [] });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("academy-quiz", e);
    return json({ error: String((e as Error).message) }, 500);
  }
});

function adapt(current: string, correct: boolean): string {
  const ladder = ["easy", "medium", "hard"];
  const idx = ladder.indexOf(current);
  if (correct) return ladder[Math.min(idx + 1, 2)];
  return ladder[Math.max(idx - 1, 0)];
}

async function pickQuestion(db: ReturnType<typeof svc>, difficulty: string | null, level_key: string | null, exclude: string[]) {
  let q = db.from("academy_questions").select("*").eq("is_active", true);
  if (difficulty) q = q.eq("difficulty", difficulty);
  if (level_key) q = q.eq("level_key", level_key);
  if (exclude.length) q = q.not("id", "in", `(${exclude.map((id) => `"${id}"`).join(",")})`);
  const { data } = await q.limit(20);
  if (!data?.length) return null;
  return data[Math.floor(Math.random() * data.length)];
}

async function finalize(db: ReturnType<typeof svc>, attempt: any) {
  const score = Math.round((attempt.correct_count / 30) * 100);
  const { data: level } = await db.from("academy_levels").select("pass_threshold").eq("key", attempt.level_key).maybeSingle();
  const passed = score >= (level?.pass_threshold ?? 85);
  await db.from("academy_quiz_attempts").update({
    status: "completed", score, passed, completed_at: new Date().toISOString(),
  }).eq("id", attempt.id);
  return json({ ok: true, done: true, score, passed });
}

async function maybeBumpLevel(db: ReturnType<typeof svc>, driver_id: string, new_level: string) {
  const rank: Record<string, number> = { none: 0, CD: 1, AO: 2, EO: 3 };
  const { data: drv } = await db.from("academy_drivers").select("current_level").eq("id", driver_id).single();
  if (!drv) return;
  if (rank[new_level] > rank[drv.current_level]) {
    await db.from("academy_drivers").update({ current_level: new_level }).eq("id", driver_id);
  }
}

async function recomputeFortiScore(db: ReturnType<typeof svc>, driver_id: string) {
  // Forti Score: training 30% + performance 30% (placeholder 80) + reliability 20% (placeholder 80) + tier 20%
  const { data: drv } = await db.from("academy_drivers").select("current_level").eq("id", driver_id).single();
  const { data: attempts } = await db.from("academy_quiz_attempts")
    .select("score, passed, level_key").eq("driver_id", driver_id).eq("status", "completed");
  const passedAttempts = (attempts || []).filter((a) => a.passed);
  const trainingPct = Math.min(100, passedAttempts.length * 33);
  const tierMap: Record<string, number> = { none: 0, CD: 33, AO: 66, EO: 100 };
  const tierPct = tierMap[drv?.current_level ?? "none"] || 0;
  const performancePct = 80;
  const reliabilityPct = 80;
  const score = Math.round(trainingPct * 0.3 + performancePct * 0.3 + reliabilityPct * 0.2 + tierPct * 0.2);
  await db.from("academy_drivers").update({ forti_score: score }).eq("id", driver_id);
  await db.from("academy_forti_score_history").insert({
    driver_id, score,
    training_pct: trainingPct, performance_pct: performancePct,
    reliability_pct: reliabilityPct, tier_pct: tierPct,
    reason: "quiz completion",
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
