import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Plus, Trash2, UserPlus, Loader2, Mail, MessageSquare, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DocModuleOption { id: string; label: string }
interface DirUser { user_id: string; email: string; full_name: string | null; phone: string | null }

interface DocReminder {
  id: string;
  module_id: string;
  module_label: string;
  cadence: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly";
  assignees: string[];
  note: string | null;
  notify_email: boolean;
  notify_sms: boolean;
  next_due_at: string;
  last_sent_at: string | null;
  created_by: string | null;
}

const CADENCES: DocReminder["cadence"][] = ["daily", "weekly", "biweekly", "monthly", "quarterly"];

const cadenceMs: Record<DocReminder["cadence"], number> = {
  daily: 24*60*60*1000,
  weekly: 7*24*60*60*1000,
  biweekly: 14*24*60*60*1000,
  monthly: 30*24*60*60*1000,
  quarterly: 90*24*60*60*1000,
};

interface Props { modules: DocModuleOption[] }

const DocRemindersDialog = ({ modules }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reminders, setReminders] = useState<DocReminder[]>([]);
  const [users, setUsers] = useState<DirUser[]>([]);
  const [me, setMe] = useState<{ id: string; email: string; name: string } | null>(null);

  // form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState<string>("");
  const [cadence, setCadence] = useState<DocReminder["cadence"]>("weekly");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const [{ data: rems }, { data: dir }, { data: auth }] = await Promise.all([
        supabase.from("doc_reminders").select("*").order("next_due_at", { ascending: true }),
        supabase.from("admin_users_directory").select("user_id, email, full_name, phone").eq("active", true).order("full_name"),
        supabase.auth.getUser(),
      ]);
      setReminders((rems as DocReminder[]) || []);
      setUsers(dir || []);
      const u = auth?.user;
      if (u) {
        const dirMe = (dir || []).find((d: any) => d.user_id === u.id);
        setMe({
          id: u.id,
          email: dirMe?.email || u.email || "",
          name: dirMe?.full_name || (u.user_metadata as any)?.full_name || u.email || "Me",
        });
      }
      setLoading(false);
    })();
  }, [open]);

  const resetForm = () => {
    setEditingId(null);
    setModuleId(modules[0]?.id || "");
    setCadence("weekly");
    setAssignees([]);
    setNote("");
    setNotifyEmail(true);
    setNotifySms(true);
  };

  const startCreate = () => { resetForm(); setShowForm(true); };

  const startEdit = (r: DocReminder) => {
    setEditingId(r.id);
    setModuleId(r.module_id);
    setCadence(r.cadence);
    setAssignees(r.assignees);
    setNote(r.note || "");
    setNotifyEmail(r.notify_email);
    setNotifySms(r.notify_sms);
    setShowForm(true);
  };

  const tagMe = () => {
    if (!me?.email) {
      toast({ title: "Not signed in", variant: "destructive" });
      return;
    }
    if (assignees.includes(me.email)) {
      toast({ title: "Already tagged" });
      return;
    }
    setAssignees([...assignees, me.email]);
  };

  const addAssignee = (email: string) => {
    if (!email || assignees.includes(email)) return;
    setAssignees([...assignees, email]);
  };

  const removeAssignee = (email: string) => setAssignees(assignees.filter((e) => e !== email));

  const save = async () => {
    if (!moduleId || assignees.length === 0) {
      toast({ title: "Pick a module and at least one staff member", variant: "destructive" });
      return;
    }
    const mod = modules.find((m) => m.id === moduleId);
    const next_due_at = editingId
      ? undefined
      : new Date(Date.now() + cadenceMs[cadence]).toISOString();

    const payload: any = {
      module_id: moduleId,
      module_label: mod?.label || moduleId,
      cadence,
      assignees,
      note: note.trim() || null,
      notify_email: notifyEmail,
      notify_sms: notifySms,
      created_by: me?.email || null,
    };
    if (next_due_at) payload.next_due_at = next_due_at;

    const { error } = editingId
      ? await supabase.from("doc_reminders").update(payload).eq("id", editingId)
      : await supabase.from("doc_reminders").insert(payload);

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingId ? "Reminder updated" : "Reminder created" });
    setShowForm(false);
    resetForm();
    const { data: rems } = await supabase
      .from("doc_reminders").select("*").order("next_due_at", { ascending: true });
    setReminders((rems as DocReminder[]) || []);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("doc_reminders").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setReminders(reminders.filter((r) => r.id !== id));
  };

  const availableUsers = users.filter((u) => !assignees.includes(u.email));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setShowForm(false); resetForm(); } }}>
      <DialogTrigger asChild>
        <Button variant="fortiOutline" size="sm">
          <Bell className="h-3.5 w-3.5 mr-1.5" />
          Reminders
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-popover max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documentation Update Reminders</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : showForm ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Module</label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger><SelectValue placeholder="Select a module" /></SelectTrigger>
                <SelectContent className="bg-popover z-[200]">
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Cadence</label>
              <Select value={cadence} onValueChange={(v) => setCadence(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-[200]">
                  {CADENCES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Tagged Staff</label>
              <div className="flex gap-2">
                <Select value="" onValueChange={addAssignee}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Add staff…" /></SelectTrigger>
                  <SelectContent className="bg-popover z-[200]">
                    {availableUsers.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No more users</div>
                    ) : availableUsers.map((u) => (
                      <SelectItem key={u.user_id} value={u.email}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="fortiOutline" size="sm" onClick={tagMe}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Tag me
                </Button>
              </div>
              {assignees.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No staff tagged yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {assignees.map((email) => {
                    const u = users.find((x) => x.email === email);
                    const label = u?.full_name || email;
                    return (
                      <span key={email} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                        {label}
                        <button onClick={() => removeAssignee(email)} className="hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Note (optional)</label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What should be reviewed/updated?"
              />
            </div>

            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={notifyEmail} onCheckedChange={(v) => setNotifyEmail(!!v)} />
                <Mail className="h-3 w-3" /> Email
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={notifySms} onCheckedChange={(v) => setNotifySms(!!v)} />
                <MessageSquare className="h-3 w-3" /> SMS
              </label>
            </div>

            <DialogFooter>
              <Button variant="fortiGhost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </Button>
              <Button variant="forti" size="sm" onClick={save}>
                {editingId ? "Save Changes" : "Create Reminder"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {reminders.length} active reminder{reminders.length === 1 ? "" : "s"}
              </p>
              <Button variant="forti" size="sm" onClick={startCreate}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New Reminder
              </Button>
            </div>

            {reminders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No reminders yet.</p>
                <p className="text-xs text-muted-foreground">Create one to keep documentation fresh.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reminders.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{r.module_label}</div>
                        <div className="text-[11px] text-muted-foreground capitalize">
                          {r.cadence} · next due {new Date(r.next_due_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="fortiGhost" size="icon" className="h-7 w-7" onClick={() => startEdit(r)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(r.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
                    <div className="flex flex-wrap gap-1">
                      {r.assignees.map((a) => (
                        <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {users.find((u) => u.email === a)?.full_name || a}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DocRemindersDialog;
