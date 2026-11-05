import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Calendar, CheckSquare, Clock, AlertTriangle, Inbox, FolderKanban, AtSign } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/adminApi";
import { supabase } from "@/integrations/supabase/client";

interface MyItem {
  item_key: string;
  kind: "task" | "project" | "event" | "invite" | "mention";
  id: string;
  event_id?: string;
  title: string;
  subtitle?: string | null;
  priority?: string | null;
  due_date?: string | null;
  created_at?: string;
  department?: string | null;
}

interface InboxData {
  tasks: MyItem[];
  projects: MyItem[];
  events: MyItem[];
  invites: MyItem[];
  mentions: (MyItem & { read?: boolean })[];
  last_seen_at: string | null;
  read_keys: string[];
}

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  normal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const dayBucket = (d?: string | null): string => {
  if (!d) return "No due date";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const date = new Date(d.length > 10 ? d : d + "T00:00:00");
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return "This Week";
  if (diff < 30) return "Later This Month";
  return "Future";
};

const formatShort = (d?: string | null) => {
  if (!d) return "";
  const date = new Date(d.length > 10 ? d : d + "T00:00:00");
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

interface Props {
  userId: string;
  userEmail: string;
}

const MyTasksPopover = ({ userId, userEmail }: Props) => {
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState<InboxData>({
    tasks: [], projects: [], events: [], invites: [], mentions: [],
    last_seen_at: null, read_keys: [],
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getMyInbox();
      if (data) setInbox(data as InboxData);
    } catch (e) {
      console.error("getMyInbox failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 60_000);
    return () => clearInterval(interval);
  }, [loadAll]);

  // Realtime subscriptions: refresh inbox whenever any of the source tables change.
  useEffect(() => {
    const channel = supabase
      .channel(`my-inbox-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "okr_tasks" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "okr_key_results" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_staff_assignments", filter: `user_id=eq.${userId}` }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_note_mentions", filter: `mentioned_user_id=eq.${userId}` }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, loadAll]);

  const allItems: MyItem[] = useMemo(
    () => [...inbox.tasks, ...inbox.projects, ...inbox.invites, ...inbox.events, ...inbox.mentions],
    [inbox],
  );

  // Unread = items created after last_seen_at AND not in read_keys
  const isUnread = useCallback((it: MyItem) => {
    if (inbox.read_keys.includes(it.item_key)) return false;
    if (!inbox.last_seen_at) return true;
    if (!it.created_at) return false;
    return new Date(it.created_at).getTime() > new Date(inbox.last_seen_at).getTime();
  }, [inbox.last_seen_at, inbox.read_keys]);

  const unreadCount = useMemo(() => allItems.filter(isUnread).length, [allItems, isUnread]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      loadAll();
      // Mark seen when popover is opened
      adminApi.markInboxSeen()
        .then(() => setInbox((prev) => ({ ...prev, last_seen_at: new Date().toISOString() })))
        .catch(() => undefined);
    }
  };

  const grouped = useMemo(() => {
    const order = ["Overdue", "Today", "Tomorrow", "This Week", "Later This Month", "Future", "No due date"];
    const map = new Map<string, MyItem[]>();
    allItems.forEach((it) => {
      const key = dayBucket(it.due_date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    map.forEach((arr) => arr.sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999")));
    return order.filter((k) => map.has(k)).map((k) => ({ key: k, items: map.get(k)! }));
  }, [allItems]);

  const handleClick = (it: MyItem) => {
    setOpen(false);
    adminApi.markInboxItemRead(it.item_key).catch(() => undefined);
    setInbox((prev) => ({ ...prev, read_keys: [...prev.read_keys, it.item_key] }));
    const dept = it.department || "ops";
    if (it.kind === "task") {
      navigate(`/admin?dept=${dept}&section=resources&module=okr&task=${it.id}`);
      setTimeout(() => window.location.reload(), 50);
    } else if (it.kind === "project") {
      navigate(`/admin?dept=${dept}&section=resources&module=okr&project=${it.id}`);
      setTimeout(() => window.location.reload(), 50);
    } else if (it.kind === "mention") {
      const eventId = (it as any).event_id;
      if (eventId) {
        navigate(`/admin?dept=${dept}&section=resources&module=calendar&event=${eventId}`);
        setTimeout(() => window.location.reload(), 50);
      }
    } else {
      navigate(`/admin?dept=${dept}&section=resources&module=calendar&event=${it.event_id || it.id}`);
      setTimeout(() => window.location.reload(), 50);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="fortiGhost" size="sm" className="relative">
          <CheckSquare className="h-4 w-4 mr-1.5" />
          My Tasks
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-background animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={16}
        className="w-[calc(100vw-2rem)] sm:w-[380px] p-0 bg-popover border-border max-h-[560px] flex flex-col z-[100]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-foreground" />
            <h3 className="text-sm font-semibold">My Inbox</h3>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {allItems.length} total
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && allItems.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" />
            </div>
          ) : allItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All clear.</p>
              <p className="text-xs text-muted-foreground mt-1">No tasks, projects, or events need your attention.</p>
            </div>
          ) : (
            <div className="py-2">
              {grouped.map((group) => (
                <div key={group.key} className="mb-2">
                  <div className="px-4 py-1.5 flex items-center gap-2">
                    <h4
                      className={`text-[11px] font-semibold uppercase tracking-wide ${
                        group.key === "Overdue"
                          ? "text-red-400"
                          : group.key === "Today"
                            ? "text-primary"
                            : "text-muted-foreground"
                      }`}
                    >
                      {group.key}
                    </h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {group.items.length}
                    </span>
                  </div>
                  <div className="space-y-0.5 px-2">
                    {group.items.map((it) => {
                      const unread = isUnread(it);
                      return (
                        <button
                          key={it.item_key}
                          onClick={() => handleClick(it)}
                          className="w-full text-left rounded-md px-3 py-2 hover:bg-foreground/10 transition-colors relative"
                        >
                          {unread && (
                            <span className="absolute left-1 top-3 h-2 w-2 rounded-full bg-red-500" aria-label="Unread" />
                          )}
                          <div className="flex items-start gap-2 pl-3">
                            <div className="mt-0.5 shrink-0">
                              {it.kind === "task" && <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />}
                              {it.kind === "project" && <FolderKanban className="h-3.5 w-3.5 text-emerald-400" />}
                              {it.kind === "event" && <Calendar className="h-3.5 w-3.5 text-blue-400" />}
                              {it.kind === "invite" && <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />}
                              {it.kind === "mention" && <AtSign className="h-3.5 w-3.5 text-purple-400" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={`text-sm truncate ${unread ? "font-semibold" : "font-medium"}`}>{it.title}</p>
                                {it.priority && PRIORITY_BADGE[it.priority] && it.kind === "task" && (
                                  <span className={`text-[9px] px-1 py-0 rounded border ${PRIORITY_BADGE[it.priority]}`}>
                                    {it.priority}
                                  </span>
                                )}
                                {it.kind === "invite" && (
                                  <span className="text-[9px] px-1 py-0 rounded border bg-orange-500/20 text-orange-400 border-orange-500/30">
                                    needs response
                                  </span>
                                )}
                                {it.kind === "project" && (
                                  <span className="text-[9px] px-1 py-0 rounded border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                    project
                                  </span>
                                )}
                              </div>
                              {it.subtitle && (
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{it.subtitle}</p>
                              )}
                              {it.due_date && (() => {
                                const today = new Date(); today.setHours(0,0,0,0);
                                const d = new Date(it.due_date.length > 10 ? it.due_date : it.due_date + "T00:00:00");
                                const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
                                const overdue = diff < 0;
                                const dueToday = diff === 0;
                                const cls = overdue
                                  ? "text-red-400 font-semibold"
                                  : dueToday
                                    ? "text-amber-400 font-semibold"
                                    : "text-emerald-400";
                                const status = overdue
                                  ? `Overdue ${Math.abs(diff)}d`
                                  : dueToday
                                    ? "Due today"
                                    : `On time · ${diff}d left`;
                                return (
                                  <div className={`flex items-center gap-1 mt-1 text-[10px] ${cls}`}>
                                    <Clock className="h-3 w-3" />
                                    {formatShort(it.due_date)} · {status}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MyTasksPopover;
