import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSupportTickets from "./tools/list-support-tickets";
import listOpenTasks from "./tools/list-open-tasks";
import listUpcomingEvents from "./tools/list-upcoming-events";
import getWaitlistCount from "./tools/get-waitlist-count";

// Build the OAuth issuer from the project ref so the value matches the direct
// supabase.co discovery document (mcp-js rejects mismatched issuers).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "forti-mcp",
  title: "Forti",
  version: "0.1.0",
  instructions:
    "Tools for the Forti luxury rideshare and personal protection platform. Every tool acts as the signed-in Forti user — results are filtered by that user's roles and RLS. Use `list_support_tickets` for support queue reads, `list_open_tasks` for ops/OKR work in progress, `list_upcoming_events` for the next week's department schedule, and `get_waitlist_count` for admin-only signup totals.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSupportTickets, listOpenTasks, listUpcomingEvents, getWaitlistCount],
});
