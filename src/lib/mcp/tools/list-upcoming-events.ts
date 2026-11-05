import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_upcoming_events",
  title: "List upcoming events",
  description: "List Forti department events in the next N days (default 7).",
  inputSchema: {
    days: z.number().int().min(1).max(60).optional().describe("Look-ahead window in days (default 7)."),
    department: z.string().optional().describe("Filter by department."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days, department }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const today = new Date();
    const end = new Date(today.getTime() + (days ?? 7) * 24 * 60 * 60 * 1000);
    let query = supabase
      .from("department_events")
      .select("id, title, event_date, event_time, department, location")
      .gte("event_date", today.toISOString().slice(0, 10))
      .lte("event_date", end.toISOString().slice(0, 10))
      .order("event_date", { ascending: true })
      .limit(100);
    if (department) query = query.eq("department", department);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { events: data ?? [] },
    };
  },
});
