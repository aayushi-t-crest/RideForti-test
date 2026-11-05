import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { sendDirectEmail } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserRow {
  user_id: string;
  email: string;
  full_name: string | null;
}

interface TaskRow {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  priority: string;
  department: string | null;
  assignees: string[] | null;
  assigned_to: string | null;
  assigned_to_user_id: string | null;
}

interface AssignmentRow {
  id: string;
  user_id: string;
  user_email: string;
  status: string;
  event_id: string;
  department_events?: {
    id: string;
    title: string;
    event_date: string;
    event_time: string | null;
    department: string;
    location: string | null;
  } | null;
}

const startOfDayISO = (d: Date) => {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
};

const fmtDate = (d: string | null) => {
  if (!d) return "";
  const dt = new Date(d.length > 10 ? d : d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

const escapeHtml = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const admin = createClient(supabaseUrl, serviceRole);

    const today = startOfDayISO(new Date());
    const weekEnd = new Date(today.getTime() + 7 * 86400000);
    const weekEndISO = weekEnd.toISOString().slice(0, 10);
    const todayISO = today.toISOString().slice(0, 10);

    // Optional dry-run / single user override (for testing)
    let bodyJson: any = {};
    try { bodyJson = req.method === "POST" ? await req.json() : {}; } catch (_) {}
    const onlyUserId: string | undefined = bodyJson?.only_user_id;
    const dryRun: boolean = !!bodyJson?.dry_run;

    // 1) Pull active admin users
    let usersQ = admin
      .from("admin_users_directory")
      .select("user_id, email, full_name")
      .eq("active", true);
    if (onlyUserId) usersQ = usersQ.eq("user_id", onlyUserId);
    const { data: usersData, error: uErr } = await usersQ;
    if (uErr) throw new Error(uErr.message);
    const users: UserRow[] = (usersData || []) as UserRow[];

    // 2) Pull all open OKR tasks (we'll filter per user in memory)
    const { data: tasksData, error: tErr } = await admin
      .from("okr_tasks")
      .select("id, title, due_date, status, priority, department, assignees, assigned_to, assigned_to_user_id")
      .neq("status", "done")
      .neq("status", "complete");
    if (tErr) throw new Error(tErr.message);
    const allTasks: TaskRow[] = (tasksData || []) as TaskRow[];

    // 3) Pull upcoming event assignments for next 7 days
    const { data: assignsData, error: eErr } = await admin
      .from("event_staff_assignments")
      .select(`
        id, user_id, user_email, status, event_id,
        department_events:event_id ( id, title, event_date, event_time, department, location )
      `)
      .gte("department_events.event_date", todayISO)
      .lte("department_events.event_date", weekEndISO);
    if (eErr) console.error("assignments err:", eErr.message);
    const assigns: AssignmentRow[] = (assignsData || []).filter((a: any) => a.department_events) as AssignmentRow[];

    let sent = 0;
    const results: any[] = [];

    for (const u of users) {
      const emailLc = (u.email || "").toLowerCase();
      const userTasks = allTasks.filter((t) => {
        const list = (t.assignees && t.assignees.length > 0)
          ? t.assignees
          : (t.assigned_to ? [t.assigned_to] : []);
        if (t.assigned_to_user_id === u.user_id) return true;
        return list.some((e) => (e || "").toLowerCase() === emailLc);
      });

      const userEvents = assigns.filter((a) =>
        a.user_id === u.user_id || (a.user_email || "").toLowerCase() === emailLc,
      );

      // Categorize tasks
      let overdue = 0, dueToday = 0, dueThisWeek = 0;
      const overdueList: TaskRow[] = [];
      const todayList: TaskRow[] = [];
      const weekList: TaskRow[] = [];
      for (const t of userTasks) {
        if (!t.due_date) continue;
        const d = new Date(t.due_date.length > 10 ? t.due_date : t.due_date + "T00:00:00");
        const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
        if (diff < 0) { overdue++; overdueList.push(t); }
        else if (diff === 0) { dueToday++; todayList.push(t); }
        else if (diff < 7) { dueThisWeek++; weekList.push(t); }
      }
      const noDueDate = userTasks.filter((t) => !t.due_date).length;

      // Categorize events
      const acceptedEvents = userEvents.filter((a) => a.status === "accepted");
      const pendingEvents = userEvents.filter((a) => a.status === "pending");

      const totalActionable = overdue + dueToday + dueThisWeek + acceptedEvents.length + pendingEvents.length;

      // Skip users with absolutely nothing on their plate
      if (totalActionable === 0 && noDueDate === 0) {
        results.push({ user: u.email, skipped: true });
        continue;
      }

      const firstName = (u.full_name || u.email || "there").split(" ")[0];

      const taskRowHtml = (t: TaskRow) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#e5e7eb;font-size:13px;">${escapeHtml(t.title)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:12px;text-transform:capitalize;">${escapeHtml(t.department || "—")}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:12px;text-transform:capitalize;">${escapeHtml(t.priority || "normal")}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:12px;white-space:nowrap;">${escapeHtml(fmtDate(t.due_date))}</td>
        </tr>
      `;

      const eventRowHtml = (a: AssignmentRow) => {
        const ev = a.department_events!;
        const time = ev.event_time ? ` · ${ev.event_time.slice(0, 5)}` : "";
        const loc = ev.location ? ` · ${escapeHtml(ev.location)}` : "";
        const badge = a.status === "pending"
          ? '<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:#78350f;color:#fcd34d;font-size:11px;font-weight:600;">Awaiting response</span>'
          : '<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:#064e3b;color:#6ee7b7;font-size:11px;font-weight:600;">Accepted</span>';
        return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#e5e7eb;font-size:13px;">${escapeHtml(ev.title)}${loc}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:12px;text-transform:capitalize;">${escapeHtml(ev.department || "—")}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:12px;white-space:nowrap;">${escapeHtml(fmtDate(ev.event_date))}${time}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #1f2937;font-size:12px;">${badge}</td>
          </tr>
        `;
      };

      const taskSection = (title: string, color: string, list: TaskRow[]) => list.length === 0 ? "" : `
        <h3 style="font-size:14px;color:${color};margin:24px 0 8px;font-weight:700;">${title} (${list.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#0b1220;border:1px solid #1f2937;border-radius:8px;overflow:hidden;">
          <thead><tr style="background:#111827;">
            <th align="left" style="padding:8px 12px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Task</th>
            <th align="left" style="padding:8px 12px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Dept</th>
            <th align="left" style="padding:8px 12px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Priority</th>
            <th align="left" style="padding:8px 12px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Due</th>
          </tr></thead>
          <tbody>${list.map(taskRowHtml).join("")}</tbody>
        </table>
      `;

      const eventSection = (title: string, list: AssignmentRow[]) => list.length === 0 ? "" : `
        <h3 style="font-size:14px;color:#e5e7eb;margin:24px 0 8px;font-weight:700;">${title} (${list.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#0b1220;border:1px solid #1f2937;border-radius:8px;overflow:hidden;">
          <thead><tr style="background:#111827;">
            <th align="left" style="padding:8px 12px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Event</th>
            <th align="left" style="padding:8px 12px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Dept</th>
            <th align="left" style="padding:8px 12px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">When</th>
            <th align="left" style="padding:8px 12px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Status</th>
          </tr></thead>
          <tbody>${list.map(eventRowHtml).join("")}</tbody>
        </table>
      `;

      const adminUrl = "https://www.rideforti.com/admin";

      const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0a0a;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:24px 28px 8px;">
          <div style="font-size:11px;letter-spacing:0.2em;color:#9ca3af;text-transform:uppercase;font-weight:600;">FORTI · Weekly Digest</div>
          <h1 style="margin:8px 0 4px;font-size:24px;color:#fff;font-weight:800;">Good morning, ${escapeHtml(firstName)}</h1>
          <p style="margin:0;color:#9ca3af;font-size:14px;">Here's everything on your plate this week.</p>
        </td></tr>

        <tr><td style="padding:16px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px;">
            <tr>
              <td width="33%" style="background:#1f1010;border:1px solid #7f1d1d;border-radius:8px;padding:12px;text-align:center;">
                <div style="font-size:24px;font-weight:800;color:#f87171;">${overdue}</div>
                <div style="font-size:11px;color:#fca5a5;text-transform:uppercase;letter-spacing:0.05em;">Overdue</div>
              </td>
              <td width="33%" style="background:#1f1a08;border:1px solid #92400e;border-radius:8px;padding:12px;text-align:center;">
                <div style="font-size:24px;font-weight:800;color:#fbbf24;">${dueToday}</div>
                <div style="font-size:11px;color:#fcd34d;text-transform:uppercase;letter-spacing:0.05em;">Due Today</div>
              </td>
              <td width="33%" style="background:#0a1f15;border:1px solid #065f46;border-radius:8px;padding:12px;text-align:center;">
                <div style="font-size:24px;font-weight:800;color:#34d399;">${dueThisWeek}</div>
                <div style="font-size:11px;color:#6ee7b7;text-transform:uppercase;letter-spacing:0.05em;">This Week</div>
              </td>
            </tr>
            <tr>
              <td width="50%" style="background:#0b1220;border:1px solid #1f2937;border-radius:8px;padding:12px;text-align:center;">
                <div style="font-size:24px;font-weight:800;color:#fff;">${acceptedEvents.length}</div>
                <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Events Accepted</div>
              </td>
              <td width="50%" style="background:#0b1220;border:1px solid #1f2937;border-radius:8px;padding:12px;text-align:center;">
                <div style="font-size:24px;font-weight:800;color:#fbbf24;">${pendingEvents.length}</div>
                <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Awaiting Reply</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px 28px 24px;">
          ${taskSection("⚠ Overdue Tasks", "#f87171", overdueList)}
          ${taskSection("⏰ Due Today", "#fbbf24", todayList)}
          ${taskSection("📋 Due This Week", "#e5e7eb", weekList)}
          ${eventSection("📅 Upcoming Events", [...pendingEvents, ...acceptedEvents])}

          <div style="margin-top:28px;text-align:center;">
            <a href="${adminUrl}" style="display:inline-block;padding:12px 24px;background:#fff;color:#000;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">Open Dashboard</a>
          </div>
        </td></tr>

        <tr><td style="padding:16px 28px;border-top:1px solid #1f2937;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;">You receive this digest every Monday at 9:00 AM ET because you're an active member of the Forti admin team.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

      const subject = `Forti Weekly Digest — ${overdue} overdue · ${dueToday} due today · ${acceptedEvents.length + pendingEvents.length} events`;

      if (dryRun) {
        results.push({ user: u.email, overdue, dueToday, dueThisWeek, events: userEvents.length, sent: false, dryRun: true });
        continue;
      }

      const res = await sendDirectEmail({
        to: u.email,
        from: "Forti <notifications@rideforti.com>",
        subject,
        html,
      });

      if (!res.success) {
        results.push({ user: u.email, error: res.error });
      } else {
        sent++;
        results.push({ user: u.email, overdue, dueToday, dueThisWeek, events: userEvents.length, sent: true });
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, total: users.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("weekly-digest error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
