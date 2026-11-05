import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  Shield,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Settings2,
  PlayCircle,
  Bug,
  ListChecks,
  FileText,
  Mail,
  Users,
  Zap,
  AlertCircle,
} from "lucide-react";

const STORAGE_KEY = "forti_companies_outbound_sop_v1";

type SectionKey =
  | "overview"
  | "templates"
  | "sheet"
  | "schedule"
  | "options"
  | "checklist"
  | "run"
  | "issues"
  | "rules";

interface Persisted {
  checklist: Record<string, boolean>;
  notes: string;
}

const defaultState: Persisted = { checklist: {}, notes: "" };

const load = (): Persisted => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch {}
  return defaultState;
};

const save = (s: Persisted) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

const CATEGORIES = [
  {
    key: "transportation",
    label: "Transportation Companies",
    template: "(TEMPLATE) Transportation Companies",
    icon: Truck,
  },
  {
    key: "security",
    label: "Security Companies",
    template: "(TEMPLATE) Security Companies",
    icon: Shield,
  },
  {
    key: "fleet",
    label: "Fleet & Rental Partners",
    template: "(TEMPLATE) Fleet & Rental",
    icon: Building2,
  },
];

const STEPS = [
  "Find the correct Instantly template",
  "Duplicate the template",
  "Rename the duplicate (weekly name)",
  "Pull matching company rows from Google Sheets",
  "Build the lead payload",
  "Upload leads to Instantly",
  "Set the campaign schedule",
  "Set campaign options",
  "Activate the campaign",
  "Verify the campaign actually started",
];

const OPTIONS = [
  { k: "stop_on_reply", v: "true" },
  { k: "open_tracking", v: "false" },
  { k: "link_tracking", v: "false" },
  { k: "text_only", v: "true" },
  { k: "daily_limit", v: "30" },
  { k: "email_gap", v: "5 min" },
  { k: "insert_unsubscribe_header", v: "true" },
  { k: "allow_risky_contacts", v: "false" },
  { k: "stop_for_company", v: "true" },
  { k: "per-company daily limit", v: "3" },
];

const CHECKLIST_GROUPS: { title: string; items: { id: string; label: string }[] }[] = [
  {
    title: "Data & Template Checks",
    items: [
      { id: "src_tab", label: "Source tab is `Companies`" },
      { id: "cat_values", label: "`actual category (n8n)` values are correct" },
      { id: "emails", label: "Email addresses are present on every row" },
      { id: "templates_exist", label: "All three Instantly templates exist with exact names" },
      { id: "mailboxes", label: "Sender mailboxes are healthy and connected" },
    ],
  },
  {
    title: "Schedule & Launch Checks",
    items: [
      { id: "days", label: "Tuesday–Thursday schedule is still correct" },
      { id: "tz", label: "Timezone in Instantly is correct" },
      { id: "dates", label: "Fixed start and end dates still make sense" },
      { id: "ok_to_launch", label: "It is acceptable to activate campaigns now" },
    ],
  },
];

const ISSUES = [
  {
    title: "No campaign created for one category",
    points: [
      "Check whether the Instantly template still exists",
      "Check whether the template name changed",
      "Check whether the duplicate step failed",
    ],
  },
  {
    title: "Campaign created but no leads added",
    points: [
      "Did rows match the category in Google Sheets?",
      "Did the rows have blank emails?",
      "Did Instantly skip leads already in the workspace?",
    ],
  },
  {
    title: "Schedule is wrong",
    points: [
      "Inspect the hardcoded start and end dates",
      "Check the inherited timezone",
      "Verify the final schedule visible in Instantly",
    ],
  },
  {
    title: "Wrong inboxes are attached",
    points: [
      "Review the sender mailbox list in the workflow",
      "Confirm mailbox health in Instantly",
    ],
  },
];

const SECTIONS: { key: SectionKey; label: string; icon: typeof FileText }[] = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "templates", label: "Templates", icon: Mail },
  { key: "sheet", label: "Source Sheet", icon: Users },
  { key: "schedule", label: "Schedule", icon: Calendar },
  { key: "options", label: "Options", icon: Settings2 },
  { key: "checklist", label: "Pre-launch", icon: ListChecks },
  { key: "run", label: "How To Run", icon: PlayCircle },
  { key: "issues", label: "Troubleshooting", icon: Bug },
  { key: "rules", label: "Operator Rules", icon: AlertTriangle },
];

const CompaniesOutboundSop = () => {
  const [state, setState] = useState<Persisted>(() => load());
  const [section, setSection] = useState<SectionKey>("overview");

  useEffect(() => save(state), [state]);

  const toggle = (id: string) =>
    setState((p) => ({ ...p, checklist: { ...p.checklist, [id]: !p.checklist[id] } }));

  const allItems = CHECKLIST_GROUPS.flatMap((g) => g.items);
  const completed = allItems.filter((i) => state.checklist[i.id]).length;
  const pct = Math.round((completed / allItems.length) * 100);
  const ready = completed === allItems.length;

  const SectionPill = ({ k, label, Icon }: { k: SectionKey; label: string; Icon: typeof FileText }) => (
    <button
      onClick={() => setSection(k)}
      className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 border transition-all ${
        section === k
          ? "bg-foreground text-background border-foreground"
          : "bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center shrink-0">
            <Zap className="h-6 w-6 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">Companies Outbound — Instantly Setup</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                Source: D7
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              n8n workflow that duplicates Instantly templates, uploads company leads from Google
              Sheets, applies schedule + options, and activates campaigns.
            </p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> Outbound Campaigns - Contacts for Forti March 2026
              </span>
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                <Users className="h-3 w-3" /> Tab: Companies
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Pre-launch
            </div>
            <div className="text-2xl font-bold">{pct}%</div>
            <div
              className={`text-[10px] inline-flex items-center gap-1 ${
                ready ? "text-green-400" : "text-amber-400"
              }`}
            >
              {ready ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {ready ? "Ready to run" : `${allItems.length - completed} checks remaining`}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Progress value={pct} className="h-1.5" />
        </div>
      </div>

      {/* Section nav */}
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <SectionPill key={s.key} k={s.key} label={s.label} Icon={s.icon} />
        ))}
      </div>

      {/* Sections */}
      {section === "overview" && (
        <div className="grid gap-4 md:grid-cols-3">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.key} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded bg-white flex items-center justify-center">
                    <Icon className="h-4 w-4 text-black" />
                  </div>
                  <h3 className="font-semibold text-sm">{c.label}</h3>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">Template:</p>
                <code className="text-[11px] block bg-muted/30 rounded p-2 break-all">
                  {c.template}
                </code>
              </div>
            );
          })}
          <div className="md:col-span-3 rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> What the workflow does (per category)
            </h3>
            <ol className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground list-decimal list-inside">
              {STEPS.map((s, i) => (
                <li key={i}>
                  <span className="text-foreground">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {section === "templates" && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">
              These exact templates must exist and not be deleted. If a template is renamed, the
              corresponding branch will fail.
            </p>
          </div>
          <div className="space-y-2">
            {CATEGORIES.map((c) => (
              <div
                key={c.key}
                className="flex items-center justify-between gap-3 p-3 rounded-md border border-border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <c.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <code className="text-xs truncate">{c.template}</code>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  → {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === "sheet" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm">Filter column</h3>
            <code className="text-xs block bg-muted/30 rounded p-2">actual category (n8n)</code>
            <h3 className="font-semibold text-sm pt-2">Expected values</h3>
            <ul className="space-y-1.5">
              {CATEGORIES.map((c) => (
                <li
                  key={c.key}
                  className="text-xs flex items-center gap-2 p-2 rounded bg-muted/20"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> {c.label}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground pt-2">
              Rows must have a valid email — blank-email rows are filtered out.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <h3 className="font-semibold text-sm mb-2">Lead fields used</h3>
            {[
              "email",
              "company_name | name",
              "company_website | website | company_domain",
              "company_phone | phone",
            ].map((f) => (
              <code key={f} className="block text-xs bg-muted/30 rounded p-2">
                {f}
              </code>
            ))}
            <p className="text-[11px] text-muted-foreground pt-2">
              Phone values like <code className="text-foreground">Phone: +1...</code> are cleaned to
              a simpler format.
            </p>
          </div>
        </div>
      )}

      {section === "schedule" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Send Days
            </h3>
            <div className="grid grid-cols-7 gap-1.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => {
                const on = ["Tue", "Wed", "Thu"].includes(d);
                return (
                  <div
                    key={d}
                    className={`text-center py-3 rounded-md text-xs font-medium border ${
                      on
                        ? "bg-foreground text-background border-foreground"
                        : "bg-muted/20 text-muted-foreground border-border"
                    }`}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Sending on Tue / Wed / Thu only.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Time Window
            </h3>
            <div className="text-3xl font-bold">13:00 – 17:00</div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Confirm timezone in Instantly before launching.
            </p>
            <div className="mt-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200">
                Workflow has fixed start & end dates. Verify them before every run.
              </p>
            </div>
          </div>
        </div>
      )}

      {section === "options" && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Option</th>
                <th className="text-left p-3">Value</th>
              </tr>
            </thead>
            <tbody>
              {OPTIONS.map((o, i) => (
                <tr key={o.k} className={i % 2 === 0 ? "bg-card" : "bg-muted/10"}>
                  <td className="p-3 font-mono text-xs">{o.k}</td>
                  <td className="p-3">
                    <code className="text-xs px-2 py-0.5 rounded bg-foreground/10">{o.v}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === "checklist" && (
        <div className="space-y-4">
          {CHECKLIST_GROUPS.map((g) => (
            <div key={g.title} className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-semibold text-sm mb-3">{g.title}</h3>
              <div className="space-y-2">
                {g.items.map((it) => {
                  const checked = !!state.checklist[it.id];
                  return (
                    <button
                      key={it.id}
                      onClick={() => toggle(it.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-md border text-left transition-all ${
                        checked
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-muted/10 border-border hover:border-foreground/40"
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          checked
                            ? "bg-green-500 border-green-500"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {checked && <CheckCircle2 className="h-3.5 w-3.5 text-background" />}
                      </div>
                      <span
                        className={`text-xs ${
                          checked ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {it.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {!ready && (
            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200">
                If any box is unchecked, do not run the workflow.
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="fortiGhost"
              size="sm"
              onClick={() => setState((p) => ({ ...p, checklist: {} }))}
            >
              Reset Checklist
            </Button>
          </div>
        </div>
      )}

      {section === "run" && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <PlayCircle className="h-4 w-4" /> How to run
          </h3>
          <ol className="space-y-3">
            {[
              "Open the workflow in n8n.",
              "Confirm credentials are connected.",
              "Review the Companies sheet for correct categories and email coverage.",
              "Execute the workflow.",
              "Watch each branch: duplication → renaming → lead upload → schedule → activation.",
              "Open Instantly and verify results manually.",
            ].map((s, i) => (
              <li key={i} className="flex gap-3 items-start">
                <div className="h-6 w-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm pt-0.5">{s}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 p-4 rounded-md bg-green-500/10 border border-green-500/20">
            <h4 className="text-sm font-semibold text-green-300 mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> What success looks like
            </h4>
            <ul className="text-xs space-y-1 text-green-200/90 list-disc list-inside">
              <li>Three new campaigns were created</li>
              <li>Each campaign has the expected weekly name</li>
              <li>Each campaign has leads loaded</li>
              <li>The correct schedule is applied</li>
              <li>The campaigns are active or ready</li>
            </ul>
          </div>
        </div>
      )}

      {section === "issues" && (
        <div className="space-y-3">
          {ISSUES.map((iss) => (
            <details
              key={iss.title}
              className="rounded-lg border border-border bg-card p-4 group"
            >
              <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium list-none">
                <Bug className="h-4 w-4 text-amber-400" />
                {iss.title}
                <span className="ml-auto text-[10px] text-muted-foreground group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <ul className="mt-3 space-y-1.5 pl-6 list-disc text-xs text-muted-foreground">
                {iss.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}

      {section === "rules" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Operator rules
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {[
                "Do not change template names casually",
                "Do not assume a successful run means leads were actually added",
                "Always verify lead counts in Instantly",
                "Always verify schedule and sender inboxes after the run",
                "Treat fixed dates as a launch risk until reviewed",
              ].map((r) => (
                <li key={r} className="flex gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-foreground shrink-0 mt-0.5" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-destructive-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Escalate if
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {[
                "A template is missing",
                "A branch creates zero leads",
                "A campaign launches with the wrong schedule",
                "The wrong sender accounts are attached",
                "The workflow structure or API settings need editing",
              ].map((r) => (
                <li key={r} className="flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2 rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-2">Final reminder</h3>
            <p className="text-xs text-muted-foreground">
              This workflow is a campaign setup machine, not a full quality-control system. The
              operator must still check: template, source rows, lead count, schedule, sender
              accounts, and final campaign status.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompaniesOutboundSop;
