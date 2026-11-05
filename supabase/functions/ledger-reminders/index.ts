// Sends weekly account-ledger expense reminders to tagged staff.
// Runs Mon/Wed/Fri at 9am ET via pg_cron.
//   - Monday: this week's expenses (Mon -> Fri of current block)
//   - Wednesday: midweek reminder of items due this Friday
//   - Friday: preview of NEXT week's expenses (next Mon -> Fri)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendDirectEmail } from "../_shared/resend.ts";
import { sendDirectSms } from "../_shared/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AccountRow {
  id: string;
  platform: string | null;
  monthly_cost_cents: number | null;
  cost_period: string | null;
  due_date: string | null;
  notes: string | null;
}

interface StaffRow {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
}

// ----- Date helpers (America/New_York) -----
function nowInET(): Date {
  // Convert "now" to a Date that represents wall-clock ET.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "0";
  return new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`,
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function prettyDate(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

// Compute current week's Monday and Friday in ET
function weekBlockMonFri(reference: Date, weeksAhead = 0): { monday: Date; friday: Date } {
  const today = startOfDay(reference);
  const dow = today.getDay(); // 0=Sun..6=Sat
  // Days back to this week's Monday (treat Sunday as part of upcoming week)
  const daysBackToMon = dow === 0 ? 6 : dow - 1;
  const monday = addDays(today, -daysBackToMon + weeksAhead * 7);
  const friday = addDays(monday, 4);
  return { monday, friday };
}

// Returns the actual due date(s) within [from, to] for a given account
function dueDatesInRange(acct: AccountRow, from: Date, to: Date): Date[] {
  if (acct.monthly_cost_cents == null || !acct.cost_period) return [];
  const period = acct.cost_period;
  if (period === "free" || period === "usage") return [];

  const out: Date[] = [];
  if (period === "weekly") {
    // Per spec: every weekly item is paid on Friday of each block.
    out.push(addDays(from, 4)); // Friday of the block
  } else if (period === "monthly") {
    if (!acct.due_date) return [];
    const day = new Date(acct.due_date + "T00:00:00").getDate();
    // Check this month and next month occurrences
    const candidates = [
      new Date(from.getFullYear(), from.getMonth(), day),
      new Date(from.getFullYear(), from.getMonth() + 1, day),
    ];
    for (const c of candidates) {
      if (c >= startOfDay(from) && c <= startOfDay(to)) out.push(c);
    }
  } else if (period === "yearly") {
    if (!acct.due_date) return [];
    const stored = new Date(acct.due_date + "T00:00:00");
    const candidate = new Date(from.getFullYear(), stored.getMonth(), stored.getDate());
    if (candidate >= startOfDay(from) && candidate <= startOfDay(to)) out.push(candidate);
  }
  return out;
}

interface DigestItem {
  platform: string;
  amountCents: number;
  period: string;
  dueDate: Date;
}

function buildDigest(accounts: AccountRow[], from: Date, to: Date): DigestItem[] {
  const items: DigestItem[] = [];
  for (const a of accounts) {
    const dates = dueDatesInRange(a, from, to);
    for (const d of dates) {
      items.push({
        platform: a.platform || "Untitled",
        amountCents: a.monthly_cost_cents || 0,
        period: a.cost_period || "monthly",
        dueDate: d,
      });
    }
  }
  items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return items;
}

function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildEmailHtml(headline: string, intro: string, items: DigestItem[]): string {
  const total = items.reduce((s, i) => s + i.amountCents, 0);
  const rows = items.map((i) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;">${i.platform}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#666;">${i.period}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#666;">${prettyDate(i.dueDate)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${formatUSD(i.amountCents)}</td>
    </tr>
  `).join("");

  return `
<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <h1 style="font-size:22px;margin:0 0 8px;">${headline}</h1>
    <p style="color:#555;margin:0 0 20px;">${intro}</p>
    ${items.length === 0 ? `
      <p style="padding:24px;background:#f7f7f7;border-radius:8px;color:#666;">No expenses scheduled in this window.</p>
    ` : `
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#fafafa;">
          <th align="left" style="padding:10px 12px;font-size:12px;color:#888;text-transform:uppercase;">Account</th>
          <th align="left" style="padding:10px 12px;font-size:12px;color:#888;text-transform:uppercase;">Period</th>
          <th align="left" style="padding:10px 12px;font-size:12px;color:#888;text-transform:uppercase;">Due</th>
          <th align="right" style="padding:10px 12px;font-size:12px;color:#888;text-transform:uppercase;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="3" style="padding:14px 12px;font-weight:700;">Total</td>
            <td style="padding:14px 12px;text-align:right;font-weight:700;">${formatUSD(total)}</td></tr>
      </tfoot>
    </table>
    `}
    <p style="color:#888;font-size:12px;margin-top:24px;">Forti Account Ledger · automated reminder</p>
  </div>
</body></html>`;
}

function buildSmsBody(headline: string, items: DigestItem[]): string {
  const total = items.reduce((s, i) => s + i.amountCents, 0);
  if (items.length === 0) return `${headline}\nNo expenses in this window.`;
  const top = items.slice(0, 5)
    .map((i) => `• ${i.platform} ${formatUSD(i.amountCents)} (${prettyDate(i.dueDate)})`)
    .join("\n");
  const more = items.length > 5 ? `\n+${items.length - 5} more...` : "";
  return `${headline}\n${top}${more}\nTotal: ${formatUSD(total)}`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await sendDirectEmail({
    to,
    subject,
    html,
    from: "Forti Ledger <ledger@rideforti.com>",
  });
}

async function sendSms(to: string, body: string): Promise<void> {
  await sendDirectSms({ to, body });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const url = new URL(req.url);

    // Allow manual override via ?mode=monday|wednesday|friday for testing
    const overrideMode = url.searchParams.get("mode");

    const etNow = nowInET();
    const dow = etNow.getDay(); // 0=Sun..6=Sat

    let mode: "monday" | "wednesday" | "friday" | null = null;
    if (overrideMode === "monday" || overrideMode === "wednesday" || overrideMode === "friday") {
      mode = overrideMode;
    } else if (dow === 1) mode = "monday";
    else if (dow === 3) mode = "wednesday";
    else if (dow === 5) mode = "friday";

    if (!mode) {
      return new Response(JSON.stringify({ skipped: true, reason: "not a reminder day", dow }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let from: Date, to: Date, headline: string, intro: string, subject: string;
    if (mode === "monday") {
      const { monday, friday } = weekBlockMonFri(etNow, 0);
      from = monday; to = friday;
      headline = "This week's upcoming expenses";
      intro = `Items due between ${prettyDate(monday)} and ${prettyDate(friday)} (Mon → Fri).`;
      subject = `Weekly expenses · ${prettyDate(monday)} → ${prettyDate(friday)}`;
    } else if (mode === "wednesday") {
      const { monday, friday } = weekBlockMonFri(etNow, 0);
      from = etNow; to = friday;
      headline = "Midweek reminder · due this Friday";
      intro = `Items due between today and ${prettyDate(friday)}.`;
      subject = `Midweek reminder · payment due ${prettyDate(friday)}`;
    } else {
      // friday: preview next week
      const { monday, friday } = weekBlockMonFri(etNow, 1);
      from = monday; to = friday;
      headline = "Next week's upcoming expenses";
      intro = `Preview of items due between ${prettyDate(monday)} and ${prettyDate(friday)} (next Mon → Fri).`;
      subject = `Next week preview · ${prettyDate(monday)} → ${prettyDate(friday)}`;
    }

    // Load global tagged recipients from ledger_settings
    const { data: settings, error: setErr } = await supabase
      .from("ledger_settings")
      .select("tagged_user_ids")
      .eq("singleton", true)
      .maybeSingle();
    if (setErr) throw setErr;
    const recipientIds: string[] = (settings?.tagged_user_ids as string[]) || [];

    if (recipientIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, mode, sent: 0, reason: "no recipients tagged" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load all accounts (global ledger)
    const { data: accounts, error: aErr } = await supabase
      .from("admin_accounts")
      .select("id, platform, monthly_cost_cents, cost_period, due_date, notes");
    if (aErr) throw aErr;
    const allAccounts = (accounts || []) as AccountRow[];

    // Resolve recipient details
    const { data: staff, error: sErr } = await supabase
      .from("admin_users_directory")
      .select("user_id, email, full_name, phone")
      .in("user_id", recipientIds)
      .eq("active", true);
    if (sErr) throw sErr;

    // Build digest once — same content goes to all recipients
    const items = buildDigest(allAccounts, from, to);
    const html = buildEmailHtml(headline, intro, items);
    const sms = buildSmsBody(headline, items);

    let sentCount = 0;
    for (const s of (staff || []) as StaffRow[]) {
      const promises: Promise<void>[] = [];
      if (s.email) promises.push(sendEmail(s.email, subject, html));
      if (s.phone) promises.push(sendSms(s.phone, sms));
      await Promise.all(promises);
      sentCount++;
    }

    return new Response(JSON.stringify({
      ok: true,
      mode,
      window: { from: ymd(from), to: ymd(to) },
      sent: sentCount,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[ledger-reminders] error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
