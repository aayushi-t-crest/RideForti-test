import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  KeyRound,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Search,
  Pencil,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

interface AccountRow {
  id: string;
  platform: string;
  username: string;
  password: string | null;
  url: string | null;
  notes: string | null;
  monthly_cost_cents: number | null;
  cost_period: string | null;
  due_date: string | null;
  created_at: string;
}

const PLATFORM_URLS: Record<string, string> = {
  google: "https://accounts.google.com",
  gmail: "https://mail.google.com",
  "google ads": "https://ads.google.com",
  "google analytics": "https://analytics.google.com",
  "google search console": "https://search.google.com/search-console",
  facebook: "https://facebook.com",
  "meta business": "https://business.facebook.com",
  instagram: "https://instagram.com",
  twitter: "https://twitter.com",
  x: "https://x.com",
  linkedin: "https://linkedin.com",
  tiktok: "https://tiktok.com",
  youtube: "https://youtube.com",
  canva: "https://canva.com",
  metricool: "https://metricool.com",
  figma: "https://figma.com",
  slack: "https://slack.com",
  discord: "https://discord.com",
  notion: "https://notion.so",
  trello: "https://trello.com",
  asana: "https://asana.com",
  github: "https://github.com",
  gitlab: "https://gitlab.com",
  vercel: "https://vercel.com",
  netlify: "https://netlify.com",
  aws: "https://aws.amazon.com/console",
  azure: "https://portal.azure.com",
  cloudflare: "https://dash.cloudflare.com",
  stripe: "https://dashboard.stripe.com",
  paypal: "https://paypal.com",
  shopify: "https://shopify.com",
  wordpress: "https://wordpress.com",
  squarespace: "https://squarespace.com",
  wix: "https://wix.com",
  godaddy: "https://godaddy.com",
  namecheap: "https://namecheap.com",
  mailchimp: "https://mailchimp.com",
  resend: "https://resend.com",
  twilio: "https://twilio.com",
  hubspot: "https://hubspot.com",
  salesforce: "https://salesforce.com",
  zoom: "https://zoom.us",
  dropbox: "https://dropbox.com",
  "1password": "https://1password.com",
  supabase: "https://supabase.com/dashboard",
  firebase: "https://console.firebase.google.com",
  apple: "https://appleid.apple.com",
  "apple developer": "https://developer.apple.com",
  "google play console": "https://play.google.com/console",
  chatgpt: "https://chat.openai.com",
  openai: "https://platform.openai.com",
  anthropic: "https://console.anthropic.com",
  lovable: "https://lovable.dev",
};

const findPlatformUrl = (platform: string): string => {
  const key = platform.toLowerCase().trim();
  if (PLATFORM_URLS[key]) return PLATFORM_URLS[key];
  const match = Object.keys(PLATFORM_URLS).find(
    (k) => k.includes(key) || key.includes(k),
  );
  return match ? PLATFORM_URLS[match] : "";
};

interface Props {
  onBack?: () => void;
}

const AdminAccountLedger = ({ onBack }: Props) => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [platform, setPlatform] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [costAmount, setCostAmount] = useState(""); // dollars string
  const [costPeriod, setCostPeriod] = useState<"weekly" | "monthly" | "yearly" | "usage" | "free">("monthly");
  const [dueDate, setDueDate] = useState(""); // mm/dd/yyyy
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [pendingTaggedUserIds, setPendingTaggedUserIds] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [selectPick, setSelectPick] = useState<string>("");

  const [staff, setStaff] = useState<Array<{ user_id: string; full_name: string | null; email: string }>>([]);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState(0);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: staffData }, { data: settingsData }] = await Promise.all([
      supabase
        .from("admin_accounts")
        .select("id, platform, username, password, url, notes, monthly_cost_cents, cost_period, due_date, created_at")
        .order("platform", { ascending: true }),
      supabase
        .from("admin_users_directory")
        .select("user_id, full_name, email")
        .eq("active", true)
        .order("full_name", { ascending: true }),
      supabase
        .from("ledger_settings")
        .select("tagged_user_ids")
        .eq("singleton", true)
        .maybeSingle(),
    ]);
    if (error) {
      toast({ title: "Failed to load accounts", description: error.message, variant: "destructive" });
    } else {
      setAccounts((data || []) as AccountRow[]);
    }
    setStaff((staffData || []) as Array<{ user_id: string; full_name: string | null; email: string }>);
    const loaded = ((settingsData as any)?.tagged_user_ids as string[]) || [];
    setTaggedUserIds(loaded);
    setPendingTaggedUserIds(loaded);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePlatformChange = (val: string) => {
    setPlatform(val);
  };

  const resetForm = () => {
    setPlatform(""); setUsername(""); setPassword(""); setUrl(""); setNotes("");
    setCostAmount(""); setCostPeriod("monthly"); setDueDate("");
  };

  // Format mm/dd/yyyy as user types
  const formatDueDateInput = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
    return parts.join("/");
  };

  // Convert mm/dd/yyyy -> yyyy-mm-dd for DB; null if invalid/empty
  const dueDateToISO = (val: string): string | null => {
    const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const [, mm, dd, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  };

  // Convert yyyy-mm-dd -> mm/dd/yyyy for display
  const isoToDueDate = (iso: string | null): string => {
    if (!iso) return "";
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return "";
    const [, yyyy, mm, dd] = m;
    return `${mm}/${dd}/${yyyy}`;
  };

  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Compute next occurrence ISO date for weekly (day-of-week 0-6) or monthly (day 1-31)
  const nextOccurrenceISO = (period: string, value: string): string | null => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (period === "weekly") {
      const dow = parseInt(value, 10);
      if (isNaN(dow)) return null;
      const diff = (dow - today.getDay() + 7) % 7 || 7;
      const next = new Date(today); next.setDate(today.getDate() + diff);
      return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    }
    if (period === "monthly") {
      const day = parseInt(value, 10);
      if (isNaN(day) || day < 1 || day > 31) return null;
      let next = new Date(today.getFullYear(), today.getMonth(), day);
      if (next.getTime() <= today.getTime()) next = new Date(today.getFullYear(), today.getMonth() + 1, day);
      return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    }
    return dueDateToISO(value);
  };

  // Build friendly schedule label from period + ISO due date
  const scheduleLabel = (period: string | null, iso: string | null): string => {
    if (!iso) return "";
    if (period === "weekly") {
      const d = new Date(iso + "T00:00:00");
      return `Every ${WEEKDAYS[d.getDay()]}`;
    }
    if (period === "monthly") {
      const d = new Date(iso + "T00:00:00");
      const day = d.getDate();
      const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
      return `${day}${suffix} of each month`;
    }
    return isoToDueDate(iso);
  };

  const startEdit = (a: AccountRow) => {
    setEditingId(a.id);
    setShowAdd(true);
    setPlatform(a.platform || "");
    setUsername(a.username || "");
    setPassword(a.password || "");
    setUrl(a.url || "");
    setNotes(a.notes || "");
    setCostAmount(a.monthly_cost_cents != null ? (a.monthly_cost_cents / 100).toFixed(2) : "");
    setCostPeriod((a.cost_period as any) || "monthly");
    if (a.due_date) {
      if (a.cost_period === "weekly") {
        setDueDate(String(new Date(a.due_date + "T00:00:00").getDay()));
      } else if (a.cost_period === "monthly") {
        setDueDate(String(new Date(a.due_date + "T00:00:00").getDate()));
      } else {
        setDueDate(isoToDueDate(a.due_date));
      }
    } else {
      setDueDate("");
    }
  };

  const saveTaggedUsers = async (next: string[]) => {
    setSavingTags(true);
    const { error } = await supabase
      .from("ledger_settings")
      .update({ tagged_user_ids: next, updated_at: new Date().toISOString() })
      .eq("singleton", true);
    setSavingTags(false);
    if (error) {
      toast({ title: "Could not save recipients", description: error.message, variant: "destructive" });
      return;
    }
    setTaggedUserIds(next);
  };

  const addPendingRecipient = (uid: string) => {
    if (!uid || pendingTaggedUserIds.includes(uid)) return;
    setPendingTaggedUserIds([...pendingTaggedUserIds, uid]);
    setSelectPick("");
  };

  const removePendingRecipient = (uid: string) => {
    setPendingTaggedUserIds(pendingTaggedUserIds.filter((id) => id !== uid));
  };

  const confirmRecipients = async () => {
    await saveTaggedUsers(pendingTaggedUserIds);
    toast({ title: "Recipients confirmed", description: "Reminder list saved." });
  };

  const recipientsDirty =
    pendingTaggedUserIds.length !== taggedUserIds.length ||
    pendingTaggedUserIds.some((id) => !taggedUserIds.includes(id));


  const addAccount = async () => {
    setSaving(true);
    const cents = costAmount.trim() === ""
      ? null
      : Math.round(parseFloat(costAmount.replace(/[^0-9.]/g, "")) * 100);
    const payload = {
      platform: platform.trim() || "Untitled",
      username: username.trim() || null,
      password: password || null,
      url: url.trim() || null,
      notes: notes.trim() || null,
      monthly_cost_cents: Number.isFinite(cents as number) ? cents : null,
      cost_period: costPeriod,
      due_date: nextOccurrenceISO(costPeriod, dueDate),
    };
    const { error } = editingId
      ? await supabase.from("admin_accounts").update(payload).eq("id", editingId)
      : await supabase.from("admin_accounts").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    resetForm();
    setShowAdd(false);
    setEditingId(null);
    toast({ title: editingId ? "Account updated" : "Account saved" });
    load();
  };

  const requestDelete = (id: string) => {
    if (deletingId !== id) {
      setDeletingId(id);
      setDeleteStep(1);
      return;
    }
    setDeleteStep((s) => s + 1);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const id = deletingId;
    setDeletingId(null);
    setDeleteStep(0);
    const { error } = await supabase.from("admin_accounts").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Account deleted" });
  };

  const cancelDelete = () => { setDeletingId(null); setDeleteStep(0); };

  const toggleVisible = (id: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        (a.platform || "").toLowerCase().includes(q) ||
        (a.username || "").toLowerCase().includes(q) ||
        (a.notes || "").toLowerCase().includes(q),
    );
  }, [accounts, search]);

  const totals = useMemo(() => {
    let weeklyRaw = 0, monthlyRaw = 0, yearlyRaw = 0;
    for (const a of accounts) {
      if (a.monthly_cost_cents == null) continue;
      const amt = a.monthly_cost_cents / 100;
      if (a.cost_period === "weekly") weeklyRaw += amt;
      else if (a.cost_period === "yearly") yearlyRaw += amt;
      else if (a.cost_period === "monthly") monthlyRaw += amt;
    }
    const monthlyTotal = monthlyRaw + weeklyRaw * 4.345 + yearlyRaw / 12;
    const weeklyAvg = monthlyTotal / 4.345;
    const yearlyTotal = monthlyRaw * 12 + weeklyRaw * 52 + yearlyRaw;
    return { weeklyAvg, monthlyTotal, yearlyTotal };
  }, [accounts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="fortiGhost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-destructive-foreground" />
            <div>
              <h1 className="text-xl font-bold">Account Ledger</h1>
              <p className="text-xs text-muted-foreground">Shared platform credentials for the admin team.</p>
            </div>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-2">
              {accounts.length} accounts
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search platform or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="forti" size="sm" onClick={() => setShowAdd((s) => !s)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Account
          </Button>
        </div>
      </div>

      {showAdd && (
        <div className="rounded-lg border bg-card p-4 space-y-3 border-destructive-foreground">
          <div className="text-sm font-semibold">{editingId ? "Edit Account" : "Add Account"}</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Platform Name</label>
              <Input
                placeholder="e.g. Google, Canva, Stripe..."
                value={platform}
                onChange={(e) => handlePlatformChange(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Login URL
              </label>
              <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Username / Email</label>
              <Input placeholder="user@example.com" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Password</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Cost (USD)</label>
              <Input
                inputMode="decimal"
                placeholder="e.g. 19.99"
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Billing Period</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={costPeriod}
                onChange={(e) => { setCostPeriod(e.target.value as any); setDueDate(""); }}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="usage">Usage-based</option>
                <option value="free">Free</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              {costPeriod === "weekly"
                ? "Due Day of Week (optional)"
                : costPeriod === "monthly"
                ? "Due Day of Month (optional)"
                : "Due Date (optional)"}
            </label>
            {costPeriod === "weekly" ? (
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              >
                <option value="">Select a day...</option>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={String(i)}>{d}</option>
                ))}
              </select>
            ) : costPeriod === "monthly" ? (
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              >
                <option value="">Select a day...</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>{d}</option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="mm/dd/yyyy"
                value={dueDate}
                inputMode="numeric"
                maxLength={10}
                onChange={(e) => setDueDate(formatDueDateInput(e.target.value))}
              />
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Notes (optional)</label>
            <Input placeholder="Any additional details..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="fortiGhost" size="sm" onClick={() => { setShowAdd(false); setEditingId(null); resetForm(); }}>
              Cancel
            </Button>
            <Button
              variant="forti"
              size="sm"
              disabled={saving}
              onClick={addAccount}
            >
              {saving ? "Saving..." : editingId ? "Update Account" : "Save Account"}
            </Button>
          </div>
        </div>
      )}

      {!loading && accounts.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Weekly Avg</div>
            <div className="text-lg font-bold text-foreground">${totals.weeklyAvg.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly Total</div>
            <div className="text-lg font-bold text-white">${totals.monthlyTotal.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Yearly Total</div>
            <div className="text-lg font-bold text-foreground">${totals.yearlyTotal.toFixed(2)}</div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-foreground">Reminder Recipients</div>
              <p className="text-[11px] text-muted-foreground">
                Tagged staff get email + SMS every Mon (week ahead), Wed (mid-week), Fri (next week preview) at 9:00 AM ET for the entire ledger.
              </p>
            </div>
            {savingTags && <span className="text-[10px] text-muted-foreground">Saving…</span>}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center pt-1">
            <select
              value={selectPick}
              onChange={(e) => addPendingRecipient(e.target.value)}
              disabled={savingTags || staff.length === 0}
              className="text-xs px-3 py-2 rounded-md border border-border bg-card text-foreground hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
            >
              <option value="">
                {staff.length === 0 ? "No active staff found" : "Select staff to tag…"}
              </option>
              {staff
                .filter((s) => !pendingTaggedUserIds.includes(s.user_id))
                .map((s) => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.full_name || s.email}
                  </option>
                ))}
            </select>
            <Button
              type="button"
              size="sm"
              onClick={confirmRecipients}
              disabled={savingTags || !recipientsDirty}
              className="text-xs bg-white text-black hover:bg-white/90"
            >
              {savingTags ? "Saving…" : recipientsDirty ? "Confirm" : "Saved"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {pendingTaggedUserIds.length === 0 && (
              <span className="text-xs text-muted-foreground italic">No recipients tagged yet.</span>
            )}
            {pendingTaggedUserIds.map((uid) => {
              const s = staff.find((x) => x.user_id === uid);
              const label = s ? (s.full_name || s.email) : uid;
              const committed = taggedUserIds.includes(uid);
              return (
                <span
                  key={uid}
                  className={`inline-flex items-center gap-1 text-xs pl-2.5 pr-1 py-1 rounded-full border ${
                    committed
                      ? "bg-white text-black border-white"
                      : "bg-card text-foreground border-dashed border-primary/60"
                  }`}
                >
                  {committed && "✓ "}{label}
                  <button
                    type="button"
                    onClick={() => removePendingRecipient(uid)}
                    disabled={savingTags}
                    className="ml-1 h-4 w-4 rounded-full hover:bg-background/20 inline-flex items-center justify-center"
                    aria-label={`Remove ${label}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>

        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Loading accounts...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
          <KeyRound className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No accounts saved yet.</p>
          <p className="text-xs text-muted-foreground">Add platform credentials for quick reference.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((acct) => {
            const isExpanded = expandedId === acct.id;
            const isDeleting = deletingId === acct.id;
            return (
            <div key={acct.id} className="rounded-lg border border-border bg-card">
              <div className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-black uppercase">{acct.platform.slice(0, 2)}</span>
                </div>
                <div className="flex-1 min-w-0 grid gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{acct.platform}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="truncate max-w-[220px]">{acct.username}</span>
                    <span className="flex items-center gap-1">
                      {visible.has(acct.id) ? (acct.password || "—") : "••••••••"}
                      <button
                        onClick={() => toggleVisible(acct.id)}
                        className="hover:text-foreground transition-colors"
                        aria-label="Toggle password visibility"
                      >
                        {visible.has(acct.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </span>
                    {(acct.monthly_cost_cents != null || (acct.cost_period && acct.cost_period !== "monthly")) && (
                      <span className="text-white font-medium">
                        {acct.monthly_cost_cents != null
                          ? `$${(acct.monthly_cost_cents / 100).toFixed(2)}`
                          : "—"}
                        <span className="text-muted-foreground font-normal">
                          {" "}/ {acct.cost_period || "monthly"}
                        </span>
                      </span>
                    )}
                    {acct.due_date && (() => {
                      const today = new Date(); today.setHours(0,0,0,0);
                      const due = new Date(acct.due_date + "T00:00:00");
                      const overdue = due.getTime() < today.getTime();
                      return (
                        <span className={`font-medium ${overdue ? "text-destructive" : "text-emerald-500"}`}>
                          Due {scheduleLabel(acct.cost_period, acct.due_date)} · {overdue ? "Overdue" : "On time"}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setExpandedId(isExpanded ? null : acct.id)}
                    title={isExpanded ? "Hide notes" : "Show notes"}
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                  {acct.password && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copy(acct.password!, acct.id)}
                      title="Copy password"
                    >
                      {copiedId === acct.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  )}
                  {acct.url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open(acct.url!, "_blank")}
                      title="Open login page"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => startEdit(acct)}
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => requestDelete(acct.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t border-border/50">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 mb-1">Notes</div>
                  <p className="text-xs text-foreground whitespace-pre-wrap">
                    {acct.notes || <span className="text-muted-foreground italic">No notes for this account.</span>}
                  </p>
                </div>
              )}
              {isDeleting && (
                <div className="px-3 pb-3 border-t border-destructive/40 bg-destructive/5">
                  <div className="flex items-start gap-2 mt-3">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-destructive">
                        {deleteStep === 1 && "Are you sure you want to delete this account?"}
                        {deleteStep === 2 && "This cannot be undone. Confirm again."}
                        {deleteStep === 3 && "Final confirmation — permanently delete?"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Step {deleteStep} of 3</div>
                    </div>
                    <Button variant="fortiGhost" size="sm" onClick={cancelDelete}>Cancel</Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={deleteStep >= 3 ? confirmDelete : () => setDeleteStep((s) => s + 1)}
                    >
                      {deleteStep === 1 && "Yes, continue"}
                      {deleteStep === 2 && "Yes, I'm sure"}
                      {deleteStep === 3 && "Delete permanently"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );})}
        </div>
      )}
    </div>
  );
};

export default AdminAccountLedger;
