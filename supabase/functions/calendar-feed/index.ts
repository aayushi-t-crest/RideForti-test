import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatDateICS(dateStr: string, timeStr?: string | null): string {
  const d = dateStr.replace(/-/g, "");
  if (timeStr) {
    const t = timeStr.replace(/:/g, "").padEnd(6, "0").slice(0, 6);
    return `${d}T${t}`;
  }
  return d;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const dept = url.searchParams.get("department") || "all";
    const format = url.searchParams.get("format") || "ics"; // ics or url

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch events from now going forward 12 months, plus past 1 month
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 1);
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 12);

    let query = supabase
      .from("department_events")
      .select("*")
      .gte("event_date", pastDate.toISOString().split("T")[0])
      .lte("event_date", futureDate.toISOString().split("T")[0])
      .order("event_date", { ascending: true });

    if (dept !== "all") {
      query = query.or(`department.eq.${dept},department.eq.all`);
    }

    const { data: events, error } = await query;
    if (error) throw new Error(error.message);

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Forti//Event Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:Forti Events${dept !== "all" ? ` (${dept})` : ""}`,
      "X-WR-TIMEZONE:America/New_York",
    ];

    for (const ev of events || []) {
      const uid = `${ev.id}@rideforti.com`;
      const dtStart = formatDateICS(ev.event_date, ev.event_time);
      const isAllDay = !ev.event_time;

      // Build description with links, docs, notes
      const descParts: string[] = [];
      if (ev.description) descParts.push(ev.description);
      if (ev.notes) descParts.push(`Notes: ${ev.notes}`);
      if (ev.links && ev.links.length > 0) {
        descParts.push(`Links: ${ev.links.join(", ")}`);
      }
      if (ev.docs && ev.docs.length > 0) {
        descParts.push(`Docs: ${ev.docs.join(", ")}`);
      }
      const description = escapeICS(descParts.join("\n\n"));

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`);

      if (isAllDay) {
        lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
        // All-day events: end date is next day
        const nextDay = new Date(ev.event_date + "T12:00:00");
        nextDay.setDate(nextDay.getDate() + 1);
        const endStr = nextDay.toISOString().split("T")[0].replace(/-/g, "");
        lines.push(`DTEND;VALUE=DATE:${endStr}`);
      } else {
        lines.push(`DTSTART;TZID=America/New_York:${dtStart}`);
        // Default 2 hour duration
        const [h, m] = (ev.event_time || "00:00").split(":").map(Number);
        const endH = String(h + 2).padStart(2, "0");
        const endM = String(m || 0).padStart(2, "0");
        lines.push(`DTEND;TZID=America/New_York:${ev.event_date.replace(/-/g, "")}T${endH}${endM}00`);
      }

      lines.push(`SUMMARY:${escapeICS(ev.title)}`);
      if (description) lines.push(`DESCRIPTION:${description}`);
      if (ev.department && ev.department !== "all") {
        lines.push(`CATEGORIES:${escapeICS(ev.department)}`);
      }

      // Add first link as URL
      if (ev.links && ev.links.length > 0) {
        lines.push(`URL:${ev.links[0]}`);
      }

      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    const icsContent = lines.join("\r\n");

    return new Response(icsContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="forti-events${dept !== "all" ? `-${dept}` : ""}.ics"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("calendar-feed error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
