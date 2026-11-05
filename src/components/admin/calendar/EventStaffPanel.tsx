import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, UserPlus, Check, X as XIcon, Clock, Mail, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DirUser {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
}

interface Assignment {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  user_phone: string | null;
  role_tag: string;
  notify_email: boolean;
  notify_sms: boolean;
  status: string;
  response_reason: string | null;
  reminders_sent: string[] | null;
}

const REMINDER_STEPS: { key: string; label: string }[] = [
  { key: "request", label: "Tagged" },
  { key: "3day", label: "3 days" },
  { key: "1day", label: "1 day" },
  { key: "1hour", label: "1 hour" },
  { key: "30min", label: "30 min" },
  { key: "started", label: "Started" },
];

const NOTE_TAG_ROLE = "staff";

interface Props { eventId: string; eventTitle: string; eventDate?: string; eventTime?: string | null; }

const EventStaffPanel = ({ eventId, eventTitle, eventDate, eventTime }: Props) => {
  const [users, setUsers] = useState<DirUser[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const syncMentionedStaffAssignments = async (existing: Assignment[]) => {
    const existingUserIds = new Set(existing.map((a) => a.user_id));
    const { data: notes } = await supabase.from("event_notes").select("id").eq("event_id", eventId);
    const noteIds = (notes || []).map((n) => n.id);
    if (noteIds.length === 0) return existing;

    const { data: mentions } = await supabase
      .from("event_note_mentions")
      .select("mentioned_user_id, mentioned_user_email, mentioned_user_name")
      .in("note_id", noteIds);

    const missing = (mentions || []).filter((m, index, arr) =>
      !existingUserIds.has(m.mentioned_user_id) &&
      arr.findIndex((item) => item.mentioned_user_id === m.mentioned_user_id) === index
    );
    if (missing.length === 0) return existing;

    const { data: dirRows } = await supabase
      .from("admin_users_directory")
      .select("user_id, email, full_name, phone")
      .in("user_id", missing.map((m) => m.mentioned_user_id));
    const directory = new Map((dirRows || []).map((u) => [u.user_id, u]));
    const { data: { user: meUser } } = await supabase.auth.getUser();

    const rows = missing.map((m) => {
      const dir = directory.get(m.mentioned_user_id);
      const phone = dir?.phone || null;
      return {
        event_id: eventId,
        user_id: m.mentioned_user_id,
        user_email: m.mentioned_user_email || dir?.email || "",
        user_name: m.mentioned_user_name || dir?.full_name || m.mentioned_user_email,
        user_phone: phone,
        role_tag: NOTE_TAG_ROLE,
        notify_email: true,
        notify_sms: !!phone,
        status: "pending",
        reminders_sent: ["request"],
        assigned_by: meUser?.id,
      };
    });

    const { data: inserted, error } = await supabase.from("event_staff_assignments").insert(rows).select("*");
    if (error) {
      console.error("Mention assignment sync failed:", error);
      return existing;
    }

    return [...existing, ...((inserted as Assignment[]) || [])];
  };

  const load = async () => {
    setLoading(true);
    const [usersRes, asnRes] = await Promise.all([
      supabase.from("admin_users_directory").select("user_id, email, full_name, phone").eq("active", true).order("full_name", { ascending: true }),
      supabase.from("event_staff_assignments").select("*").eq("event_id", eventId),
    ]);
    setUsers((usersRes.data as DirUser[]) || []);
    setAssignments(await syncMentionedStaffAssignments((asnRes.data as Assignment[]) || []));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(() => {
      supabase
        .from("event_staff_assignments")
        .select("*")
        .eq("event_id", eventId)
        .then(async ({ data }) => setAssignments(await syncMentionedStaffAssignments((data as Assignment[]) || [])));
    }, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleAdd = async () => {
    if (!selectedUser) return;
    const user = users.find((u) => u.user_id === selectedUser);
    if (!user) return;
    const fullName = (user.full_name && user.full_name.trim()) || user.email;
    setAdding(true);
    try {
      const { data: { user: meUser } } = await supabase.auth.getUser();
      const { data: insRow, error: insErr } = await supabase
        .from("event_staff_assignments")
        .insert({
          event_id: eventId,
          user_id: user.user_id,
          user_email: user.email,
          user_name: fullName,
          user_phone: user.phone,
          role_tag: "staff",
          notify_email: true,
          notify_sms: true,
          status: "pending",
          assigned_by: meUser?.id,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ assignment_id: insRow.id, kind: "request" }),
      });

      toast({ title: "Staff tagged", description: `${fullName} sent email${user.phone ? " + SMS" : ""} for ${eventTitle}` });
      setSelectedUser("");
      load();
    } catch (e: any) {
      toast({ title: "Error tagging staff", description: e.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("event_staff_assignments").delete().eq("id", id);
    if (error) { toast({ title: "Error removing", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const statusBadge = (status: string) => {
    if (status === "accepted") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-300 border border-green-500/30 inline-flex items-center gap-1"><Check className="h-2.5 w-2.5" />Accepted</span>;
    if (status === "denied") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30 inline-flex items-center gap-1"><XIcon className="h-2.5 w-2.5" />Denied</span>;
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />Pending</span>;
  };

  const availableUsers = users.filter((u) => !assignments.some((a) => a.user_id === u.user_id));

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div>
        <h5 className="text-xs font-semibold flex items-center gap-1">
          <Mail className="h-3 w-3" /><MessageSquare className="h-3 w-3" /> Tagged Staff & Reminders
        </h5>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Each tagged staff member gets an immediate Email + SMS, plus all scheduled reminders below.
        </p>
      </div>

      {/* Tagged staff list — shown FIRST */}
      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : assignments.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-3 text-center">
          <p className="text-[11px] text-muted-foreground">No staff tagged yet for this event.</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">The role-tag chips at the top (e.g. "Brand Ambassadors") indicate <em>roles needed</em>. Use the picker below to assign specific people.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {assignments.map((a) => {
            const sent = Array.isArray(a.reminders_sent) ? a.reminders_sent : [];
            return (
              <div key={a.id} className="p-2 rounded border border-border bg-muted/30 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{a.user_name || a.user_email}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {a.user_email}{a.user_phone ? ` • ${a.user_phone}` : ""}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {statusBadge(a.status)}
                    </div>
                    {a.response_reason && <div className="text-[10px] text-muted-foreground italic mt-0.5">"{a.response_reason}"</div>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => handleRemove(a.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="border-t border-border/50 pt-2">
                  <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Mail className="h-2.5 w-2.5" /><MessageSquare className="h-2.5 w-2.5" /> Notifications sent
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {REMINDER_STEPS.map((step) => {
                      const done = sent.includes(step.key);
                      return (
                        <span
                          key={step.key}
                          className={`text-[9px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                            done
                              ? "bg-green-500/15 text-green-300 border-green-500/30"
                              : "bg-muted/50 text-muted-foreground border-border"
                          }`}
                        >
                          {done ? <Check className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                          {step.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reminder schedule preview */}
      {eventDate && (() => {
        const start = new Date(`${eventDate}T${eventTime || "09:00:00"}`);
        const minsUntil = (start.getTime() - Date.now()) / 60000;
        return (
          <div className="border border-border rounded-md bg-muted/20 p-2 space-y-1.5">
            <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Mail className="h-2.5 w-2.5" /><MessageSquare className="h-2.5 w-2.5" /> Reminder Schedule (Email + SMS)
            </div>
            <div className="flex flex-wrap gap-1">
              {REMINDER_STEPS.map((step) => {
                const stepMins = step.key === "request" ? Infinity : ({ "3day": 4320, "1day": 1440, "1hour": 60, "30min": 30, "started": 0 } as Record<string, number>)[step.key];
                const applicable = step.key === "request" ? true : minsUntil >= stepMins - 5;
                return (
                  <span
                    key={step.key}
                    className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                      applicable ? "bg-background text-foreground border-border" : "bg-muted/30 text-muted-foreground/50 border-border/40 line-through"
                    }`}
                  >
                    <Clock className="h-2.5 w-2.5" />{step.label}
                  </span>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground/80">Crossed-out periods have already passed and won't fire.</p>
          </div>
        );
      })()}

      {/* Add staff picker */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold flex items-center gap-1"><UserPlus className="h-3 w-3" />Add Staff</h5>
          <Button
            type="button"
            size="sm"
            variant="fortiOutline"
            className="h-7 text-[11px]"
            disabled={adding}
            onClick={async () => {
              const { data: auth } = await supabase.auth.getUser();
              const authUser = auth?.user;
              const uid = authUser?.id;
              if (!uid) { toast({ title: "Not signed in", variant: "destructive" }); return; }
              if (assignments.some((a) => a.user_id === uid)) { toast({ title: "Already tagged", description: "You're already on this event." }); return; }
              const me = users.find((u) => u.user_id === uid);
              const email = me?.email || authUser?.email || "";
              const phone = me?.phone || (authUser?.user_metadata as any)?.phone || (authUser as any)?.phone || null;
              const fullName =
                (me?.full_name && me.full_name.trim()) ||
                (authUser?.user_metadata as any)?.full_name ||
                (authUser?.user_metadata as any)?.name ||
                email;
              if (!email) { toast({ title: "Missing email", description: "Couldn't detect your email.", variant: "destructive" }); return; }
              setAdding(true);
              try {
                const { data: insRow, error: insErr } = await supabase
                  .from("event_staff_assignments")
                  .insert({
                    event_id: eventId,
                    user_id: uid,
                    user_email: email,
                    user_name: fullName,
                    user_phone: phone,
                    role_tag: "staff",
                    notify_email: true,
                    notify_sms: !!phone,
                    status: "pending",
                    assigned_by: uid,
                  })
                  .select()
                  .single();
                if (insErr) throw insErr;
                const { data: { session } } = await supabase.auth.getSession();
                await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-assignment`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                  body: JSON.stringify({ assignment_id: insRow.id, kind: "request" }),
                });
                toast({ title: "Tagged", description: `${fullName} added to ${eventTitle}` });
                load();
              } catch (e: any) {
                toast({ title: "Error tagging", description: e.message, variant: "destructive" });
              } finally {
                setAdding(false);
              }
            }}
          >
            <UserPlus className="h-3 w-3 mr-1" /> Tag me
          </Button>
        </div>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Select user" /></SelectTrigger>
          <SelectContent className="bg-popover z-[200]">
            {availableUsers.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No more users to tag</div>
            ) : (
              availableUsers.map((u) => {
                const name = (u.full_name && u.full_name.trim()) || u.email;
                return <SelectItem key={u.user_id} value={u.user_id}>{name}</SelectItem>;
              })
            )}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />Email</span>
          <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />SMS</span>
          <span className="text-muted-foreground/70">— sent automatically</span>
          <Button size="sm" variant="forti" className="ml-auto h-7 text-xs" disabled={!selectedUser || adding} onClick={handleAdd}>
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add & Notify"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventStaffPanel;
