// Resilient download/page-view tracker.
// Tries (in order): fetch+keepalive → sendBeacon → supabase.functions.invoke.
// keepalive lets the request survive page navigation (critical when redirecting to the App Store).
import { supabase } from "@/integrations/supabase/client";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-download`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type TrackPayload = {
  event_type: "download" | "page_view";
  source_page: "download" | "swimweek";
  store?: "apple" | "google" | null;
  attribution_source?: "ambassador" | "email_sms" | "other" | null;
  ambassador_id?: string | null;
  device_type?: string;
  platform?: string | null;
  referrer?: string | null;
  user_agent?: string | null;
  screen_width?: number | null;
  screen_height?: number | null;
};

function validate(p: TrackPayload): string | null {
  if (p.event_type !== "download" && p.event_type !== "page_view") return "invalid event_type";
  if (p.source_page !== "download" && p.source_page !== "swimweek") return "invalid source_page";
  if (p.event_type === "download") {
    if (p.store && p.store !== "apple" && p.store !== "google") return "invalid store";
    if (
      p.attribution_source &&
      !["ambassador", "email_sms", "other"].includes(p.attribution_source)
    ) {
      return "invalid attribution_source";
    }
    if (p.attribution_source === "ambassador" && !p.ambassador_id) {
      return "ambassador_id required when attribution_source=ambassador";
    }
  }
  return null;
}

export async function trackDownload(payload: TrackPayload): Promise<{ ok: boolean; via: string; error?: string }> {
  const err = validate(payload);
  if (err) {
    console.error("[trackDownload] validation failed:", err, payload);
    return { ok: false, via: "validation", error: err };
  }

  const body = JSON.stringify(payload);
  const headers = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
  };

  // 1) fetch + keepalive (preferred — survives navigation, returns a response we can read)
  try {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers,
      body,
      keepalive: true,
    });
    if (res.ok) return { ok: true, via: "fetch-keepalive" };
    const text = await res.text().catch(() => "");
    console.warn("[trackDownload] fetch returned non-OK:", res.status, text);
  } catch (e) {
    console.warn("[trackDownload] fetch failed:", e);
  }

  // 2) sendBeacon fallback (best-effort, fire-and-forget — no auth header support, but the
  //    edge function accepts unauthenticated POSTs)
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const queued = navigator.sendBeacon(FUNCTION_URL, blob);
      if (queued) return { ok: true, via: "sendBeacon" };
    }
  } catch (e) {
    console.warn("[trackDownload] sendBeacon failed:", e);
  }

  // 3) supabase SDK fallback (last resort)
  try {
    const { error } = await supabase.functions.invoke("track-download", { body: payload });
    if (!error) return { ok: true, via: "supabase-invoke" };
    console.error("[trackDownload] supabase invoke failed:", error);
    return { ok: false, via: "supabase-invoke", error: error.message };
  } catch (e: any) {
    console.error("[trackDownload] all transports failed:", e);
    return { ok: false, via: "none", error: e?.message ?? "unknown" };
  }
}
