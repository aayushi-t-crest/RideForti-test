import { useEffect, useState, useMemo } from "react";
import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useBackNav } from "@/contexts/BackNavContext";

interface MyTask {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  task_boards?: { id: string; name: string; department: string | null };
}

interface Props {
  onBack: () => void;
  onOpenTask: (boardId: string, taskId: string) => void;
}

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  normal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  low: "bg-muted text-muted-foreground border-border",
  "non-critical": "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  // legacy fallbacks
  upcoming: "Upcoming",
  pending: "In Progress",
  backlogged: "Backlogged",
  complete: "Complete",
};

const formatDate = (d: string | null) => {
  if (!d) return null;
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const dayBucket = (d: string | null): string => {
  if (!d) return "No due date";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const date = new Date(d + "T00:00:00");
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return "This Week";
  if (diff < 30) return "Later This Month";
  return "Future";
};

const MyTasksPanel = ({ onBack, onOpenTask }: Props) => {
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  useBackNav("Back to Dashboard", onBack);

  useEffect(() => {
    let mounted = true;
    adminApi.getMyTasks()
      .then(({ data }) => { if (mounted) setTasks(data || []); })
      .catch((e) => console.error("getMyTasks failed:", e))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const grouped = useMemo(() => {
    const order = ["Overdue", "Today", "Tomorrow", "This Week", "Later This Month", "Future", "No due date"];
    const map = new Map<string, MyTask[]>();
    tasks.forEach((t) => {
      const key = dayBucket(t.due_date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return order.filter((k) => map.has(k)).map((k) => ({ key: k, items: map.get(k)! }));
  }, [tasks]);

  const totals = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let overdue = 0, dueToday = 0;
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const d = new Date(t.due_date + "T00:00:00");
      const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
      if (diff < 0) overdue++;
      else if (diff === 0) dueToday++;
    });
    return { overdue, dueToday, total: tasks.length };
  }, [tasks]);

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">My Tasks</h1>
          <p className="text-sm text-muted-foreground">All open tasks assigned to you across every board.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <div>
              <div className="text-xs text-muted-foreground leading-none">Overdue</div>
              <div className="text-sm font-semibold mt-0.5">{totals.overdue}</div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground leading-none">Due today</div>
              <div className="text-sm font-semibold mt-0.5">{totals.dueToday}</div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground leading-none">Open</div>
              <div className="text-sm font-semibold mt-0.5">{totals.total}</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">You have no open tasks assigned to you.</p>
          <p className="text-xs text-muted-foreground mt-1">When someone assigns you a task, it will show up here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-semibold ${group.key === "Overdue" ? "text-red-400" : group.key === "Today" ? "text-primary" : "text-foreground"}`}>
                  {group.key}
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{group.items.length}</span>
              </div>
              <div className="grid gap-2">
                {group.items.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onOpenTask(t.board_id, t.id)}
                    className="text-left rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-card/80 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm truncate">{t.title}</h4>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.normal}`}>
                            {t.priority}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                          {t.task_boards?.name && (
                            <span className="inline-flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                              {t.task_boards.name}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            {STATUS_LABEL[t.status] || t.status}
                          </span>
                          {t.due_date && (() => {
                            const today = new Date(); today.setHours(0,0,0,0);
                            const due = new Date(t.due_date + "T00:00:00");
                            const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
                            const isDone = t.status === "done" || t.status === "complete";
                            const overdue = !isDone && diff < 0;
                            const dueToday = !isDone && diff === 0;
                            const cls = isDone
                              ? "text-emerald-400"
                              : overdue
                                ? "text-red-400 font-semibold"
                                : dueToday
                                  ? "text-amber-400 font-semibold"
                                  : "text-muted-foreground";
                            const status = isDone
                              ? "Done"
                              : overdue
                                ? `Overdue ${Math.abs(diff)}d`
                                : dueToday
                                  ? "Due today"
                                  : `On time · ${diff}d left`;
                            return (
                              <span className={`inline-flex items-center gap-1 ${cls}`}>
                                <Calendar className="h-3 w-3" />
                                {formatDate(t.due_date)} · {status}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTasksPanel;
