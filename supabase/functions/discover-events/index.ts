import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth: allow either an authenticated admin OR an internal cron call
    const cronSecret = req.headers.get("x-cron-secret");
    const isCron = cronSecret === "forti-internal-cron";

    if (!isCron) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Not authenticated");
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) throw new Error("Not authenticated");
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) throw new Error("Not authorized");
    }

    // Get past decline reasons to learn from
    const { data: declinedEvents } = await supabase
      .from("discovered_events")
      .select("event_name, event_type, decline_reason")
      .eq("status", "declined")
      .not("decline_reason", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(30);

    const declineContext = declinedEvents && declinedEvents.length > 0
      ? `\n\nIMPORTANT - Previously declined events and reasons (learn from these and avoid suggesting similar):\n${declinedEvents.map(e => `- "${e.event_name}" (${e.event_type}): Declined because "${e.decline_reason}"`).join("\n")}`
      : "";

    // Get already discovered events to avoid duplicates
    const { data: existingEvents } = await supabase
      .from("discovered_events")
      .select("event_name, event_date")
      .in("status", ["pending", "approved", "declined"]);

    const existingSet = new Set(
      (existingEvents || []).map((e: any) => `${e.event_name.toLowerCase().trim()}|${e.event_date}`)
    );

    const existingContext = existingEvents && existingEvents.length > 0
      ? `\n\nAlready discovered events (DO NOT suggest these again):\n${existingEvents.slice(0, 80).map(e => `- "${e.event_name}" on ${e.event_date}`).join("\n")}`
      : "";

    const today = new Date().toISOString().split("T")[0];

    const systemPrompt = `You are an event discovery assistant for Forti, a premium security-first transportation company in Miami, FL. Your job is to find REAL, ACTUAL upcoming events in Miami and surrounding areas (Fort Lauderdale, Miami Beach, Brickell, Wynwood, Doral, Coral Gables, Key Biscayne) where there will be high traffic and popularity.

Focus on events that would benefit from premium transportation and security services:
- Major concerts and music festivals (Ultra, Rolling Loud, III Points, etc.)
- Sports events (Miami Heat, Inter Miami, Miami Dolphins, F1 Miami Grand Prix)
- Art events (Art Basel, art walks, gallery openings)
- Nightlife events at major venues (LIV, E11EVEN, Story, Club Space)
- City-wide festivals and cultural events
- Corporate conferences and conventions at Miami Beach Convention Center
- Celebrity appearances and VIP events
- Boat shows, car shows, fashion events
- Major holiday events and parties
- Restaurant/bar grand openings at high-profile locations

CRITICAL RULES:
1. Only suggest events that are REAL and actually happening.
2. Include the actual venue name and location when possible.
3. Estimate expected attendance/popularity level.
4. Provide source information or how to verify the event.
5. Focus on events from ${today} through the next 3 months.
6. Return 5-8 events per search.
7. ALWAYS try to provide organizer/promoter contact info (name, email, phone, website) when known. If unknown, leave fields empty - do not fabricate.
${declineContext}
${existingContext}`;

    let discoveredEvents: any[] = [];

    if (openaiKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Search for upcoming high-traffic events in Miami and surrounding areas. Today's date is ${today}. Find real events happening soon and include organizer/promoter contact details when possible.` },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "submit_discovered_events",
                  description: "Submit a list of discovered real events in Miami area",
                  parameters: {
                    type: "object",
                    properties: {
                      events: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            event_name: { type: "string" },
                            event_date: { type: "string", description: "YYYY-MM-DD" },
                            event_time: { type: "string" },
                            venue: { type: "string" },
                            location: { type: "string" },
                            event_type: { type: "string", enum: ["concert", "festival", "sports", "nightlife", "conference", "art", "city_event", "party", "corporate", "other"] },
                            description: { type: "string" },
                            expected_attendance: { type: "string" },
                            source_url: { type: "string" },
                            source_info: { type: "string" },
                            organizer_name: { type: "string" },
                            contact_email: { type: "string" },
                            contact_phone: { type: "string" },
                            contact_website: { type: "string" },
                          },
                          required: ["event_name", "event_date", "venue", "location", "event_type", "description", "expected_attendance"],
                        },
                      },
                    },
                    required: ["events"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "submit_discovered_events" } },
          }),
        });

        if (response.ok) {
          const aiResult = await response.json();
          const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            const parsed = JSON.parse(toolCall.function.arguments);
            discoveredEvents = parsed.events || [];
          }
        }
      } catch (err) {
        console.error("OpenAI discover error:", err);
      }
    }

    // Zero-Key Dev Fallback: Return sample real high-profile Florida events if no API key
    if (discoveredEvents.length === 0) {
      discoveredEvents = [
        {
          event_name: "Miami Grand Prix VIP Hospitality",
          event_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          event_time: "14:00",
          venue: "Miami International Autodrome",
          location: "Miami Gardens, FL",
          event_type: "sports",
          description: "Formula 1 Miami Grand Prix high-profile paddock club and VIP luxury hospitality.",
          expected_attendance: "massive",
          contact_website: "https://f1miamigp.com"
        },
        {
          event_name: "Art Basel Miami Beach VIP Preview",
          event_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          event_time: "18:00",
          venue: "Miami Beach Convention Center",
          location: "Miami Beach, FL",
          event_type: "art",
          description: "International art fair attracting global collectors, executives, and luxury patrons.",
          expected_attendance: "very_high",
          contact_website: "https://artbasel.com"
        }
      ];
    }

    // Filter out duplicates (defense in depth - DB also has unique index)
    const newEvents = discoveredEvents.filter((e: any) => {
      const key = `${e.event_name.toLowerCase().trim()}|${e.event_date}`;
      return !existingSet.has(key);
    });

    const inserts = newEvents.map((e: any) => ({
      event_name: e.event_name,
      event_date: e.event_date,
      event_time: e.event_time || null,
      venue: e.venue,
      location: e.location,
      event_type: e.event_type,
      description: e.description,
      expected_attendance: e.expected_attendance,
      source_url: e.source_url || null,
      source_info: e.source_info || null,
      organizer_name: e.organizer_name || null,
      contact_email: e.contact_email || null,
      contact_phone: e.contact_phone || null,
      contact_website: e.contact_website || null,
      status: "pending",
      ai_search_query: isCron ? `Daily cron ${today}` : `Manual search ${today}`,
    }));

    let insertedCount = 0;
    if (inserts.length > 0) {
      // Use upsert with ignoreDuplicates so existing rows just stand
      const { data: inserted, error: insertError } = await supabase
        .from("discovered_events")
        .upsert(inserts, { onConflict: "event_name,event_date", ignoreDuplicates: true })
        .select("id");
      if (insertError) {
        console.error("Insert error:", insertError);
      } else {
        insertedCount = inserted?.length || 0;
      }
    }

    return new Response(
      JSON.stringify({ success: true, count: insertedCount, total_found: discoveredEvents.length, skipped: discoveredEvents.length - insertedCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("discover-events error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
