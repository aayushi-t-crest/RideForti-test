import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendDirectSms } from "../_shared/twilio.ts";
import { sendDirectEmail } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(_resendKey: string, to: string, subject: string, html: string) {
  return sendDirectEmail({
    to,
    subject,
    html,
    from: "Forti Tasks <support@rideforti.com>",
  });
}

async function sendSms(_lovableKey: string, _twilioKey: string, _fromNumber: string, to: string, body: string) {
  return sendDirectSms({ to, body });
}

const DEPT_LABELS: Record<string, string> = {
  ops: "Operations",
  support: "Support",
  sales: "Sales",
  content: "Content",
  hr: "HR",
  finance: "Finance",
  it: "IT",
  legal: "Legal",
  all: "All Departments",
};

function deptLabel(dept?: string) {
  if (!dept) return "";
  return DEPT_LABELS[dept] || (dept.charAt(0).toUpperCase() + dept.slice(1));
}

function assignmentEmailHtml(taskTitle: string, assigneeName: string, dueDate?: string, boardName?: string, kind: "task" | "project" = "task", moduleName?: string, deepLink?: string, department?: string) {
  const label = kind === "project" ? "project" : "task";
  const Label = kind === "project" ? "Project" : "Task";
  const contextLine = kind === "project"
    ? (boardName ? ` under objective <strong>${boardName}</strong>` : "")
    : (boardName ? ` on project <strong>${boardName}</strong>` : "");
  const moduleLabel = moduleName || "OKR Tracker";
  const deptName = deptLabel(department);
  const moduleLine = `<p style="margin:0 0 8px;color:#444;font-size:15px;line-height:1.6;">📂 Module: <strong>${moduleLabel}</strong>${deptName ? ` <span style="color:#888;">(${deptName})</span>` : ""}</p>`;
  const buttonHtml = deepLink
    ? `<p style="margin:24px 0;text-align:center;">
         <a href="${deepLink}" style="display:inline-block;background-color:#000000;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Open ${Label} →</a>
       </p>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="padding:24px 32px;background-color:#000000;border-radius:12px 12px 0 0;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">FORTI</h1>
</td></tr>
<tr><td style="padding:32px;background-color:#f9f9f9;border:1px solid #e5e5e5;border-top:none;">
<h2 style="margin:0 0 16px;color:#111;font-size:20px;font-weight:600;">New ${Label} Assigned to You</h2>
<p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.6;">Hi ${assigneeName},</p>
<p style="margin:0 0 12px;color:#444;font-size:15px;line-height:1.6;">
You've been assigned a new ${label}: <strong>"${taskTitle}"</strong>${contextLine}.
</p>
${moduleLine}
${dueDate ? `<p style="margin:0 0 8px;color:#444;font-size:15px;line-height:1.6;">📅 Due: <strong>${dueDate}</strong></p>` : ""}
${buttonHtml}
<p style="margin:0 0 16px;color:#444;font-size:14px;line-height:1.6;">
Or log in to the admin dashboard to view and manage your ${label}.
</p>
<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;" />
<p style="margin:0;color:#888;font-size:13px;">
If you have any questions, contact us at <a href="mailto:support@rideforti.com" style="color:#007AFF;">support@rideforti.com</a>
</p>
</td></tr>
<tr><td style="padding:16px 32px;background-color:#000000;border-radius:0 0 12px 12px;">
<p style="margin:0;color:#888;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Forti. All rights reserved.</p>
</td></tr></table></td></tr></table></body></html>`;
}

function weeklySummaryEmailHtml(assigneeName: string, tasks: Array<{ title: string; due_date: string | null; status: string; priority: string; board_name?: string }>) {
  const taskRows = tasks.map(t => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-size:14px;color:#333;">${t.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-size:14px;color:#666;">${t.board_name || "—"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-size:14px;color:#666;">${t.due_date || "No date"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-size:14px;color:#666;">${t.priority}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-size:14px;color:#666;">${t.status}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="padding:24px 32px;background-color:#000000;border-radius:12px 12px 0 0;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">FORTI</h1>
</td></tr>
<tr><td style="padding:32px;background-color:#f9f9f9;border:1px solid #e5e5e5;border-top:none;">
<h2 style="margin:0 0 16px;color:#111;font-size:20px;font-weight:600;">Your Weekly Task Summary</h2>
<p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.6;">Hi ${assigneeName},</p>
<p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.6;">
Here's your task summary for the week. You have <strong>${tasks.length} task${tasks.length !== 1 ? "s" : ""}</strong> that are due or in progress.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;margin:16px 0;">
<tr style="background-color:#eee;">
<th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;">Task</th>
<th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;">Board</th>
<th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;">Due</th>
<th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;">Priority</th>
<th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;">Status</th>
</tr>
${taskRows}
</table>
<p style="margin:16px 0 0;color:#444;font-size:15px;line-height:1.6;">Log in to the admin dashboard to manage your tasks.</p>
<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;" />
<p style="margin:0;color:#888;font-size:13px;">
If you have any questions, contact us at <a href="mailto:support@rideforti.com" style="color:#007AFF;">support@rideforti.com</a>
</p>
</td></tr>
<tr><td style="padding:16px 32px;background-color:#000000;border-radius:0 0 12px 12px;">
<p style="margin:0;color:#888;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Forti. All rights reserved.</p>
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const twilioKey = Deno.env.get("TWILIO_API_KEY");
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { type } = body;

    // ── TASK ASSIGNMENT NOTIFICATION ──
    if (type === "assignment") {
      const {
        assignee_email, task_title, due_date, board_name, kind: rawKind,
        module_name, deep_link, department,
      } = body;
      const kind: "task" | "project" = rawKind === "project" ? "project" : "task";
      const Label = kind === "project" ? "Project" : "Task";
      if (!assignee_email || !task_title) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const assigneeName = assignee_email.split("@")[0];
      const results: Record<string, any> = { email: false, sms: false };
      const moduleLabel = module_name || "OKR Tracker";
      const deptName = deptLabel(department);
      const moduleStr = `${moduleLabel}${deptName ? ` (${deptName})` : ""}`;

      // Send email
      if (resendKey) {
        await sendEmail(
          resendKey,
          assignee_email,
          `Forti — New ${Label} Assigned: ${task_title}`,
          assignmentEmailHtml(task_title, assigneeName, due_date, board_name, kind, module_name, deep_link, department)
        );
        results.email = true;
      }

      // Try to find user's phone for SMS — check directory first, then auth metadata
      if (lovableKey && twilioKey && fromNumber) {
        let phone: string | null = null;
        const { data: dirRow } = await adminClient
          .from("admin_users_directory")
          .select("phone")
          .eq("email", assignee_email)
          .maybeSingle();
        phone = dirRow?.phone || null;
        if (!phone) {
          const { data: { users } } = await adminClient.auth.admin.listUsers();
          const matchedUser = (users || []).find((u: any) => u.email === assignee_email);
          phone = matchedUser?.phone || matchedUser?.user_metadata?.phone || null;
        }

        if (phone) {
          const linkPart = deep_link ? ` Open: ${deep_link}` : " Log in to the admin dashboard to view.";
          await sendSms(lovableKey, twilioKey, fromNumber, phone,
            `📋 Forti ${Label} Assigned: "${task_title}" in ${moduleStr}${due_date ? ` — Due: ${due_date}` : ""}.${linkPart}`
          );
          results.sms = true;
        }
      }

      return new Response(JSON.stringify({ success: true, ...results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── WEEKLY SUMMARY ──
    if (type === "weekly_summary") {
      // Get all tasks that are not complete, grouped by assignee
      const { data: tasks, error } = await adminClient
        .from("tasks")
        .select("*, task_boards:board_id(name)")
        .not("assigned_to", "is", null)
        .neq("status", "complete");
      
      if (error) throw error;
      if (!tasks || tasks.length === 0) {
        return new Response(JSON.stringify({ message: "No tasks to summarize" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Group by assignee
      const byAssignee: Record<string, typeof tasks> = {};
      for (const t of tasks) {
        const assignee = t.assigned_to!;
        if (!byAssignee[assignee]) byAssignee[assignee] = [];
        byAssignee[assignee].push(t);
      }

      // Get all users for phone lookup
      let usersMap: Record<string, any> = {};
      if (lovableKey && twilioKey && fromNumber) {
        const { data: { users } } = await adminClient.auth.admin.listUsers();
        for (const u of users || []) {
          if (u.email) usersMap[u.email] = u;
        }
      }

      const results: Record<string, { email: boolean; sms: boolean; taskCount: number }> = {};

      for (const [email, assigneeTasks] of Object.entries(byAssignee)) {
        const name = email.split("@")[0];
        results[email] = { email: false, sms: false, taskCount: assigneeTasks.length };

        // Send email summary
        if (resendKey) {
          const taskData = assigneeTasks.map(t => ({
            title: t.title,
            due_date: t.due_date,
            status: t.status,
            priority: t.priority,
            board_name: (t as any).task_boards?.name || undefined,
          }));
          await sendEmail(
            resendKey,
            email,
            `Forti — Your Weekly Task Summary (${assigneeTasks.length} task${assigneeTasks.length !== 1 ? "s" : ""})`,
            weeklySummaryEmailHtml(name, taskData)
          );
          results[email].email = true;
        }

        // Send SMS with count only
        if (lovableKey && twilioKey && fromNumber) {
          const user = usersMap[email];
          const phone = user?.phone || user?.user_metadata?.phone;
          if (phone) {
            await sendSms(lovableKey, twilioKey, fromNumber, phone,
              `📋 Forti Weekly Summary: You have ${assigneeTasks.length} active task${assigneeTasks.length !== 1 ? "s" : ""}. Log in to review.`
            );
            results[email].sms = true;
          }
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── TEST SMS ──
    if (type === "test_sms") {
      const { phone, message } = body;
      if (!phone || !message) {
        return new Response(JSON.stringify({ error: "Missing phone or message" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!lovableKey || !twilioKey || !fromNumber) {
        return new Response(JSON.stringify({ error: "Twilio not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const smsResult = await sendSms(lovableKey, twilioKey, fromNumber, phone, message);
      return new Response(JSON.stringify({ success: true, sms: smsResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown type" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Task notify error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
