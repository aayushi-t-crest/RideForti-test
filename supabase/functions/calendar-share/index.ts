import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) throw new Error("Missing token");

    // Validate link
    const { data: link, error: linkErr } = await supabase
      .from("calendar_share_links")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (linkErr) throw linkErr;
    if (!link) {
      return new Response(JSON.stringify({ error: "Invalid link" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!link.enabled) {
      return new Response(JSON.stringify({ error: "This link has been disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Touch last_accessed_at (best-effort)
    supabase
      .from("calendar_share_links")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", link.id)
      .then(() => {});

    const dept = link.department || "all";

    if (req.method === "GET") {
      // Return link info + events + pending discovered events (read-only)
      let q = supabase.from("department_events").select("*").order("event_date", { ascending: true });
      if (dept !== "all") q = q.or(`department.eq.${dept},department.eq.all`);
      const { data: events, error: evErr } = await q;
      if (evErr) throw evErr;

      const { data: pendingEvents } = await supabase
        .from("discovered_events")
        .select("*")
        .eq("status", "pending")
        .order("event_date", { ascending: true });

      return new Response(
        JSON.stringify({
          link: {
            recipient_name: link.recipient_name,
            permission: link.permission,
            department: dept,
          },
          events: events || [],
          pendingEvents: pendingEvents || [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mutations require edit permission
    if (link.permission !== "edit") {
      return new Response(JSON.stringify({ error: "View-only access" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    if (req.method === "POST") {
      // Create event
      const payload = {
        title: String(body.title || "").trim(),
        description: body.description || null,
        event_date: body.event_date,
        event_time: body.event_time || null,
        department: body.department || dept,
        links: Array.isArray(body.links) ? body.links : [],
        docs: Array.isArray(body.docs) ? body.docs : [],
        notes: body.notes || null,
        color: body.color || "primary",
      };
      if (!payload.title || !payload.event_date) throw new Error("Title and date required");
      const { data, error } = await supabase.from("department_events").insert(payload).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ event: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PATCH") {
      const id = body.id;
      if (!id) throw new Error("Missing event id");
      const update: Record<string, unknown> = {};
      const fields = ["title", "description", "event_date", "event_time", "department", "links", "docs", "notes", "color"];
      for (const f of fields) if (f in body) update[f] = body[f];
      const { data, error } = await supabase.from("department_events").update(update).eq("id", id).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ event: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("calendar-share error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
