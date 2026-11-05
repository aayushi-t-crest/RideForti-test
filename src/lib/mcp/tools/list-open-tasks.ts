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
  name: "list_open_tasks",
  title: "List open tasks",
  description:
    "List open (not done) Forti tasks visible to the signed-in user. Optionally filter by department.",
  inputSchema: {
    department: z.string().optional().describe("Filter by department (e.g. support, sales, ops, marketing, development, admin)."),
    limit: z.number().int().min(1).max(200).optional().describe("Max tasks to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ department, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, department, assigned_to")
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(limit ?? 50);
    if (department) query = query.eq("department", department);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { tasks: data ?? [] },
    };
  },
});
