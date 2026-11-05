import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, AlertCircle, Flame, Zap, Clock, MessageSquare, UserPlus, X, Lock } from "lucide-react";

interface Settings {
  id: string;
  response_urgent_min: number;
  response_critical_min: number;
  response_imminent_min: number;
  response_catastrophic_min: number;
  age_urgent_min: number;
  age_critical_min: number;
  age_imminent_min: number;
  age_catastrophic_min: number;
}

interface Contact {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  min_tier: string;
  notify_sms: boolean;
  notify_email: boolean;
}

interface DirectoryUser {
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
}

interface UrgencyThresholdsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIERS: Array<{
  key: "urgent" | "critical" | "imminent" | "catastrophic";
  label: string;
  icon: typeof AlertTriangle;
  accent: string;
  glow: string;
  dot: string;
}> = [
  { key: "urgent", label: "Urgent", icon: AlertTriangle, accent: "text-amber-300", glow: "shadow-[0_0_24px_-10px_rgba(255,255,255,0.5)]", dot: "bg-amber-300" },
  { key: "critical", label: "Critical", icon: AlertCircle, accent: "text-orange-300", glow: "shadow-[0_0_24px_-10px_rgba(255,255,255,0.5)]", dot: "bg-orange-300" },
  { key: "imminent", label: "Imminent", icon: Flame, accent: "text-rose-300", glow: "shadow-[0_0_24px_-10px_rgba(255,255,255,0.5)]", dot: "bg-rose-300" },
  { key: "catastrophic", label: "Catastrophic", icon: Zap, accent: "text-[hsl(45,55%,72%)]", glow: "shadow-[0_0_28px_-10px_rgba(255,255,255,0.6)]", dot: "bg-[hsl(45,55%,72%)]" },
];

const TIER_OPTIONS = [
  { value: "urgent", label: "Urgent+" },
  { value: "critical", label: "Critical+" },
  { value: "imminent", label: "Imminent+" },
  { value: "catastrophic", label: "Catastrophic" },
];

export default function UrgencyThresholdsDialog({ open, onOpenChange }: UrgencyThresholdsDialogProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [addUserId, setAddUserId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    loadAll();
  }, [open]);

  async function loadAll() {
    setLoading(true);
    const [{ data: s }, { data: c }, { data: d }] = await Promise.all([
      supabase.from("support_escalation_settings").select("*").limit(1).maybeSingle(),
      supabase.from("support_escalation_contacts").select("*").order("created_at"),
      supabase.from("admin_users_directory").select("user_id, full_name, email, phone").eq("active", true).order("full_name"),
    ]);
    setSettings(s as Settings | null);
    setContacts((c ?? []) as Contact[]);
    setDirectory((d ?? []) as DirectoryUser[]);
    setLoading(false);
  }

  async function saveSettings(patch: Partial<Settings>) {
    if (!settings) return;
    if (!isAdmin) {
      toast({ title: "Admin only", description: "Only admin users can edit urgency thresholds.", variant: "destructive" });
      return;
    }
    const next = { ...settings, ...patch };
    setSettings(next);
    const { error } = await supabase
      .from("support_escalation_settings")
      .update(patch)
      .eq("id", settings.id);
    if (error) toast({ title: "Could not save", description: error.message, variant: "destructive" });
  }

  async function addContact() {
    if (!addUserId) return;
    if (!isAdmin) {
      toast({ title: "Admin only", description: "Only admin users can edit escalation contacts.", variant: "destructive" });
      return;
    }
    const user = directory.find((d) => d.user_id === addUserId);
    if (!user) return;
    if (contacts.some((c) => c.user_id === user.user_id)) {
      toast({ title: "Already added", description: `${user.full_name || user.email} is already an escalation contact.` });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("support_escalation_contacts")
      .insert({
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        min_tier: "critical",
        notify_sms: true,
        notify_email: true,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Could not add contact", description: error.message, variant: "destructive" });
      return;
    }
    setContacts([...contacts, data as Contact]);
    setAddUserId("");
  }

  async function updateContact(id: string, patch: Partial<Contact>) {
    if (!isAdmin) {
      toast({ title: "Admin only", description: "Only admin users can edit escalation contacts.", variant: "destructive" });
      return;
    }
    setContacts(contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await supabase.from("support_escalation_contacts").update(patch).eq("id", id);
    if (error) toast({ title: "Could not save", description: error.message, variant: "destructive" });
  }

  async function removeContact(id: string) {
    if (!isAdmin) {
      toast({ title: "Admin only", description: "Only admin users can edit escalation contacts.", variant: "destructive" });
      return;
    }
    setContacts(contacts.filter((c) => c.id !== id));
    const { error } = await supabase.from("support_escalation_contacts").delete().eq("id", id);
    if (error) toast({ title: "Could not remove", description: error.message, variant: "destructive" });
  }

  const availableForAdd = directory.filter((d) => !contacts.some((c) => c.user_id === d.user_id));

  const renderTierRow = (tier: typeof TIERS[number], field: keyof Settings) => {
    const Icon = tier.icon;
    return (
      <div
        key={tier.key + String(field)}
        className={`group rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-4 flex items-center justify-between ${tier.glow}`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className={`absolute inset-0 rounded-full ${tier.dot} opacity-20 blur-md`} />
            <Icon className={`relative h-5 w-5 ${tier.accent}`} />
          </div>
          <div>
            <div className={`font-medium tracking-wide ${tier.accent}`}>{tier.label}</div>
            <div className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">
              After {settings![field]} minutes
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={settings![field] as number}
            disabled={!isAdmin}
            onChange={(e) =>
              saveSettings({ [field]: Math.max(1, parseInt(e.target.value) || 1) } as Partial<Settings>)
            }
            className="w-20 text-center font-semibold bg-black/40 border-white/10 text-foreground focus-visible:ring-1 focus-visible:ring-[hsl(45,55%,72%)]/40 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">min</span>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border border-white/10">
        <DialogHeader className="pb-2 border-b border-white/10">
          <DialogTitle className="text-2xl font-light tracking-wide metallic-shimmer">
            Urgency Thresholds
          </DialogTitle>
          <p className="text-xs text-muted-foreground tracking-wide">
            Configure response and age tiers — tagged staff are notified the moment a ticket crosses a line.
          </p>
        </DialogHeader>

        {loading || !settings ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(45,55%,72%)]" />
          </div>
        ) : (
          <div className="space-y-8 pt-2">
            {!isAdmin && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300/30 bg-amber-300/[0.06] p-3">
                <Lock className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-100/90 tracking-wide">
                  View-only access. Only admin users can edit urgency thresholds and escalation contacts.
                </div>
              </div>
            )}
            {/* Response Time Alerts */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-secondary-foreground" />
                <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/90">
                  Response Time Alerts
                </h3>
              </div>
              <div className="space-y-2">
                {TIERS.map((tier) => renderTierRow(tier, `response_${tier.key}_min` as keyof Settings))}
              </div>
            </section>

            {/* Ticket Age Alerts */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-secondary-foreground" />
                <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/90">
                  Ticket Age Alerts
                </h3>
              </div>
              <div className="space-y-2">
                {TIERS.map((tier) => renderTierRow(tier, `age_${tier.key}_min` as keyof Settings))}
              </div>
            </section>

            {/* Escalation Contacts */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="h-4 w-4 text-secondary-foreground" />
                <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/90">
                  Escalation Contacts
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Tagged staff receive SMS + Email the moment a ticket crosses their threshold.
              </p>

              <div className="space-y-2 mb-3">
                {contacts.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No escalation contacts yet.</p>
                )}
                {contacts.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center gap-3 flex-wrap"
                  >
                    <div className="flex-1 min-w-[140px]">
                      <div className="font-medium truncate text-foreground">{c.full_name || c.email}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </div>
                    <Select value={c.min_tier} onValueChange={(v) => updateContact(c.id, { min_tier: v })} disabled={!isAdmin}>
                      <SelectTrigger className="w-[130px] bg-black/40 border-white/10 disabled:opacity-60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[10000] border-white/10">
                        {TIER_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="hover:bg-foreground/10">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => updateContact(c.id, { notify_sms: !c.notify_sms })}
                      disabled={!isAdmin}
                      className={`text-[11px] px-3 py-1.5 rounded-md font-medium uppercase tracking-wider transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                        c.notify_sms
                          ? "bg-[hsl(45,55%,72%)]/15 text-[hsl(45,55%,72%)] border border-[hsl(45,55%,72%)]/40"
                          : "bg-white/5 text-muted-foreground border border-white/10"
                      }`}
                    >
                      SMS
                    </button>
                    <button
                      onClick={() => updateContact(c.id, { notify_email: !c.notify_email })}
                      disabled={!isAdmin}
                      className={`text-[11px] px-3 py-1.5 rounded-md font-medium uppercase tracking-wider transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                        c.notify_email
                          ? "bg-[hsl(45,55%,72%)]/15 text-[hsl(45,55%,72%)] border border-[hsl(45,55%,72%)]/40"
                          : "bg-white/5 text-muted-foreground border border-white/10"
                      }`}
                    >
                      Email
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => removeContact(c.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Select value={addUserId} onValueChange={setAddUserId}>
                    <SelectTrigger className="flex-1 bg-black/40 border-white/10">
                      <SelectValue placeholder="+ Add staff member..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[10000] border-white/10">
                      {availableForAdd.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">All staff added</div>
                      ) : (
                        availableForAdd.map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id} className="hover:bg-foreground/10">
                            {u.full_name || u.email}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={addContact}
                    disabled={!addUserId || saving}
                    className="bg-[hsl(45,55%,72%)]/15 text-[hsl(45,55%,72%)] border border-[hsl(45,55%,72%)]/40 hover:bg-[hsl(45,55%,72%)]/25"
                  >
                    Add
                  </Button>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground/80 mt-4 pt-4 border-t border-white/10 tracking-wide">
                Thresholds trigger visual alerts. Tagged contacts receive SMS and Email notifications automatically.
              </p>
            </section>

            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <Switch checked disabled />
              <Label className="text-[11px] text-muted-foreground tracking-wide">
                Notifier runs every minute. Each contact is alerted at most once per ticket per tier.
              </Label>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
