import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, X, ThumbsDown, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
  event_id: string | null;
  assignment_id: string | null;
}

interface AssignmentRow {
  id: string;
  event_id: string;
  role_tag: string;
  status: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
}

interface AssignmentWithEvent extends AssignmentRow {
  department_events?: {
    series_id: string | null;
    title: string;
  } | null;
}

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [denyAssignment, setDenyAssignment] = useState<AssignmentRow | null>(null);
  const [denyReason, setDenyReason] = useState("");

  const load = async (uid: string) => {
    const { data } = await supabase
      .from("calendar_notifications")
      .select("*")
      .eq("recipient_id", uid)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications((data as NotificationRow[]) || []);
  };

  useEffect(() => {
    let channel: any;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await load(user.id);
      channel = supabase
        .channel("cal-notifications")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "calendar_notifications", filter: `recipient_id=eq.${user.id}` },
          () => load(user.id)
        )
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!userId || unread === 0) return;
    await supabase.from("calendar_notifications").update({ read: true }).eq("recipient_id", userId).eq("read", false);
    load(userId);
  };

  const respondToAssignment = async (assignmentId: string, status: "accepted" | "denied", reason?: string) => {
    const { data: assignment, error: getErr } = await supabase
      .from("event_staff_assignments")
      .select("*, department_events(series_id,title)")
      .eq("id", assignmentId)
      .maybeSingle();
    if (getErr || !assignment) { toast({ title: "Assignment not found", variant: "destructive" }); return; }

    const row = assignment as AssignmentWithEvent;
    const seriesId = row.department_events?.series_id;
    const eventIds = seriesId
      ? ((await supabase.from("department_events").select("id").eq("series_id", seriesId)).data || []).map((e) => e.id)
      : [row.event_id];

    const updateQuery = supabase
      .from("event_staff_assignments")
      .update({ status, response_reason: reason || null, responded_at: new Date().toISOString() })
      .eq("user_id", row.user_id)
      .eq("role_tag", row.role_tag)
      .in("event_id", eventIds.length ? eventIds : [row.event_id]);
    const { error } = await updateQuery;
    if (error) { toast({ title: "Error responding", description: error.message, variant: "destructive" }); return; }

    // Remove the assignment_request notifications for this user across all events in series
    if (userId) {
      const { data: relatedAssignments } = await supabase
        .from("event_staff_assignments")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("role_tag", row.role_tag)
        .in("event_id", eventIds.length ? eventIds : [row.event_id]);
      const relatedIds = (relatedAssignments || []).map((a) => a.id);
      if (relatedIds.length) {
        await supabase
          .from("calendar_notifications")
          .delete()
          .eq("recipient_id", userId)
          .eq("type", "assignment_request")
          .in("assignment_id", relatedIds);
      }
      // Optimistic UI: remove from local state immediately
      setNotifications((prev) => prev.filter((n) => !(n.type === "assignment_request" && n.assignment_id && relatedIds.includes(n.assignment_id))));
    }

    // Trigger notification to admins
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ assignment_id: assignmentId, kind: status }),
      });
    } catch (e) {
      console.error("notify failed", e);
    }

    toast({ title: status === "accepted" ? "Assignment accepted" : "Assignment denied", description: seriesId ? "Applied to every occurrence in this repeating series." : undefined });
    if (userId) load(userId);
    setDenyAssignment(null);
    setDenyReason("");
  };

  const handleNotificationClick = async (n: NotificationRow) => {
    if (!n.read) {
      await supabase.from("calendar_notifications").update({ read: true }).eq("id", n.id);
      if (userId) load(userId);
    }
  };

  const openDenyDialog = async (assignmentId: string) => {
    const { data } = await supabase.from("event_staff_assignments").select("*").eq("id", assignmentId).maybeSingle();
    if (data) setDenyAssignment(data as AssignmentRow);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="fortiOutline" size="sm" className="relative">
            <Bell className="h-3.5 w-3.5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 p-0 bg-popover z-[100]">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5" />
              <span className="text-sm font-semibold">Notifications</span>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-muted-foreground hover:text-foreground">Mark all read</button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 border-b border-border/50 cursor-pointer hover:bg-foreground/5 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium truncate">{n.title}</span>
                      </div>
                      {n.body && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[9px] text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                      {n.type === "assignment_request" && n.assignment_id && (
                        <div className="flex gap-1.5 mt-2">
                          <Button
                            size="sm"
                            className="h-6 text-[10px] bg-green-600 hover:bg-green-700"
                            onClick={(e) => { e.stopPropagation(); respondToAssignment(n.assignment_id!, "accepted"); }}
                          >
                            <Check className="h-2.5 w-2.5 mr-1" />Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={(e) => { e.stopPropagation(); openDenyDialog(n.assignment_id!); }}
                          >
                            <X className="h-2.5 w-2.5 mr-1" />Deny
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={!!denyAssignment} onOpenChange={(o) => { if (!o) { setDenyAssignment(null); setDenyReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-red-500" />Deny Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Tell the admin why you can't take this assignment.</p>
            <Textarea
              placeholder="e.g. Already booked, out of town..."
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="fortiGhost" size="sm" onClick={() => { setDenyAssignment(null); setDenyReason(""); }}>Cancel</Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                disabled={!denyReason.trim()}
                onClick={() => denyAssignment && respondToAssignment(denyAssignment.id, "denied", denyReason.trim())}
              >
                Deny
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotificationBell;
