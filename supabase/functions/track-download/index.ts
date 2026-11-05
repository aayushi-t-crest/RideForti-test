// Anti-abuse download tracker: hashes client IP server-side and dedupes per ambassador.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function pickIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      ambassador_id = null,
      device_type = "unknown",
      platform = null,
      referrer = null,
      user_agent = null,
      screen_width = null,
      screen_height = null,
      source_page = null,        // 'download' | 'swimweek'
      event_type = "download",   // 'download' | 'page_view'
      store = null,              // 'apple' | 'google'
      attribution_source = null, // 'ambassador' | 'other' | 'email_sms'
    } = body || {};

    // Server-side validation — reject malformed payloads with 400 so bad data
    // never lands in the table.
    const validEvent = event_type === "download" || event_type === "page_view";
    const validSource = source_page === null || source_page === "download" || source_page === "swimweek";
    const validStore = store === null || store === "apple" || store === "google";
    const validAttr =
      attribution_source === null ||
      attribution_source === "ambassador" ||
      attribution_source === "other" ||
      attribution_source === "email_sms";
    if (!validEvent || !validSource || !validStore || !validAttr) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "invalid payload",
          details: { validEvent, validSource, validStore, validAttr },
        }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const ip = pickIp(req);
    const salt = Deno.env.get("DOWNLOAD_IP_SALT") || "forti-download-tracker-v1";
    const ip_hash = await sha256(`${salt}:${ip}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Page views: dedupe by (ip_hash, source_page). One row per visitor per page.
    if (event_type === "page_view") {
      if (source_page && ip_hash) {
        const { data: existingPv } = await db
          .from("qr_page_visits")
          .select("id")
          .eq("event_type", "page_view")
          .eq("source_page", source_page)
          .eq("ip_hash", ip_hash)
          .maybeSingle();
        if (existingPv) {
          return new Response(
            JSON.stringify({ ok: true, deduped: true }),
            { headers: { ...cors, "Content-Type": "application/json" } },
          );
        }
      }
    } else if (ambassador_id) {
      // Download attributed to an ambassador: dedupe by (ambassador_id, ip_hash).
      const { data: existing } = await db
        .from("qr_page_visits")
        .select("id")
        .eq("ambassador_id", ambassador_id)
        .eq("ip_hash", ip_hash)
        .eq("event_type", "download")
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ ok: true, deduped: true }),
          { headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
    }

    const { error } = await db.from("qr_page_visits").insert({
      ambassador_id,
      device_type,
      platform,
      referrer,
      user_agent,
      screen_width,
      screen_height,
      ip_hash,
      source_page,
      event_type,
      store,
      attribution_source,
    });

    if (error) {
      // Unique violation = already counted; treat as dedupe success.
      if ((error as any).code === "23505") {
        return new Response(
          JSON.stringify({ ok: true, deduped: true }),
          { headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      console.error("track-download insert error:", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, deduped: false }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("track-download error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? "unknown" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
