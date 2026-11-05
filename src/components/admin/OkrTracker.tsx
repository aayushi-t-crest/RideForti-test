import { useState, useEffect, useRef } from "react";
import { adminApi } from "@/lib/adminApi";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Plus, ArrowLeft, Trash2, Target, FolderKanban, CheckSquare,
  MoreHorizontal, AlertTriangle, Clock, Bell, Mail, MessageSquare, Sparkles,
  X, Paperclip, Link2, Upload, Eye,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useBackNav } from "@/contexts/BackNavContext";
import { useAuth } from "@/hooks/useAuth";
import OkrWalkthrough from "./OkrWalkthrough";
import OkrProjectWalkthrough from "./OkrProjectWalkthrough";
import OkrTaskWalkthrough from "./OkrTaskWalkthrough";

// ─── Types ───
interface Objective {
  id: string; title: string; description: string | null; department: string;
  time_period: string; status: string; progress: number; created_at: string;
}
interface KeyResult {
  id: string; objective_id: string; title: string; description: string | null;
  target_value: number; current_value: number; unit: string; status: string;
  assigned_to: string | null; assignees: string[] | null; created_at: string;
}
interface TaskAttachment { name: string; url: string; type?: string }
interface OkrTask {
  id: string; key_result_id: string; title: string; description: string | null;
  status: string; priority: string; assigned_to: string | null;
  assignees: string[] | null;
  due_date: string | null; reminder_at: string | null; reminder_sent: boolean;
  reminder_frequency: "daily" | "weekly" | "monthly" | null;
  notify_email: boolean; notify_sms: boolean; created_at: string;
  notes: string | null;
  links: string[] | null;
  attachments: TaskAttachment[] | null;
}

interface NoteEntry {
  id: string;
  author_id: string | null;
  author_name: string | null;
  author_email: string | null;
  content: string;
  created_at: string;
}

const parseNotes = (raw: string | null | undefined): NoteEntry[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((n) => n && typeof n === "object" && "content" in n)) {
      return parsed as NoteEntry[];
    }
  } catch { /* fall through to legacy */ }
  // Legacy plain-text note → wrap as single entry
  return [{
    id: "legacy",
    author_id: null,
    author_name: null,
    author_email: null,
    content: String(raw),
    created_at: "",
  }];
};

const serializeNotes = (notes: NoteEntry[]): string | null =>
  notes.length === 0 ? null : JSON.stringify(notes);

const STATUS_COLORS: Record<string, string> = {
  on_track: "bg-green-500/20 text-green-400",
  at_risk: "bg-yellow-500/20 text-yellow-400",
  behind: "bg-red-500/20 text-red-400",
  completed: "bg-blue-500/20 text-blue-400",
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  internal_testing: "bg-purple-500/20 text-purple-400",
  deployed_staging: "bg-cyan-500/20 text-cyan-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  normal: "bg-blue-500/20 text-blue-400",
  low: "bg-muted text-muted-foreground",
};

const TASK_STATUSES = ["todo", "in_progress", "done"];
const DEV_TASK_STATUSES = ["todo", "in_progress", "internal_testing", "deployed_staging", "done"];
const getTaskStatuses = (department?: string) =>
  department === "development" ? DEV_TASK_STATUSES : TASK_STATUSES;

// ─── Objective List View ───
const ObjectiveList = ({ objectives, onSelect, onCreate, onDelete, onRename, onShowHowItWorks }: {
  objectives: Objective[]; onSelect: (o: Objective) => void;
  onCreate: () => void; onDelete: (id: string) => void;
  onRename: (o: Objective) => void;
  onShowHowItWorks: () => void;
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between flex-wrap gap-3" data-tour="okr-header">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-white" />
        <h2 className="text-lg font-semibold">OKRs & Projects</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{objectives.length} objectives</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onShowHowItWorks}
          className="shrink-0 bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold border border-white/20 btn-shimmer hover:btn-shimmer active:btn-shimmer"
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          How it Works
        </Button>
        <Button variant="forti" size="sm" onClick={onCreate} data-tour="okr-new-objective">
          <Plus className="h-4 w-4 mr-1" /> New Objective
        </Button>
      </div>
    </div>
    {objectives.length === 0 ? (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
        <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No objectives yet.</p>
        <p className="text-xs text-muted-foreground">Create your first OKR to start tracking goals.</p>
      </div>
    ) : (
      <div className="space-y-3">
        {objectives.map((obj, idx) => (
          <div
            key={obj.id}
            onClick={() => onSelect(obj)}
            data-tour={idx === 0 ? "okr-objective-card" : undefined}
            className="rounded-lg border border-border bg-card p-4 hover:border-white hover:shadow-lg hover:shadow-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{obj.title}</h3>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[obj.status] || ""}`}>{obj.status.replace("_", " ")}</Badge>
                  
                </div>
                {obj.description && <p className="text-xs text-muted-foreground line-clamp-1">{obj.description}</p>}
                <div className="flex items-center gap-3 mt-2" data-tour={idx === 0 ? "okr-objective-progress" : undefined}>
                  <Progress value={obj.progress} className="flex-1 h-1.5" />
                  <span className="text-xs text-muted-foreground font-medium">{obj.progress}%</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-tour={idx === 0 ? "okr-objective-menu" : undefined} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(obj); }}>Rename</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(obj.id); }}>Delete Objective</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Key Result List ───
const KeyResultList = ({ objective, keyResults, onSelect, onCreate, onDelete, onBack, onRename, onEdit, onShowHowItWorks }: {
  objective: Objective; keyResults: KeyResult[];
  onSelect: (kr: KeyResult) => void; onCreate: () => void;
  onDelete: (id: string) => void; onBack: () => void;
  onRename: (kr: KeyResult) => void;
  onEdit: (kr: KeyResult) => void;
  onShowHowItWorks: () => void;
}) => {
  useBackNav("Back to Objectives", onBack);
  return (
  <div className="space-y-4">
    <div className="flex items-center justify-between flex-wrap gap-3" data-tour="okr-project-header">
      <div>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-secondary-foreground" />
          <h2 className="text-lg font-semibold">{objective.title}</h2>
          <Badge data-tour="okr-project-status" variant="outline" className={`text-[10px] ${STATUS_COLORS[objective.status]}`}>{objective.status.replace("_", " ")}</Badge>
        </div>
        {objective.description && <p className="text-xs text-muted-foreground mt-1">{objective.description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onShowHowItWorks}
          className="shrink-0 bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold border border-white/20 btn-shimmer hover:btn-shimmer active:btn-shimmer"
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          How it Works
        </Button>
        <Button variant="forti" size="sm" onClick={onCreate} data-tour="okr-project-new">
          <Plus className="h-4 w-4 mr-1" /> New Project
        </Button>
      </div>
    </div>
    {keyResults.length === 0 ? (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center" data-tour="okr-project-empty">
        <FolderKanban className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No projects yet for this objective.</p>
      </div>
    ) : (
      <div className="grid gap-3 md:grid-cols-2">
        {keyResults.map((kr) => {
          return (
            <div key={kr.id} onClick={() => onSelect(kr)} className="rounded-lg border border-border bg-card p-4 hover:border-white cursor-pointer group transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FolderKanban className="h-3.5 w-3.5 shrink-0 text-secondary-foreground" />
                    <h4 className="font-medium text-sm truncate">{kr.title}</h4>
                  </div>
                  {kr.description && <p className="text-xs text-muted-foreground line-clamp-1">{kr.description}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[kr.status]}`}>{kr.status.replace("_", " ")}</Badge>
                    {(kr.assignees && kr.assignees.length > 0
                      ? kr.assignees
                      : kr.assigned_to ? [kr.assigned_to] : []
                    ).slice(0, 3).map((email) => (
                      <span key={email} className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">→ {email}</span>
                    ))}
                    {kr.assignees && kr.assignees.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{kr.assignees.length - 3}</span>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(kr); }}>Manage Assignees</DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(kr); }}>Rename</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(kr.id); }}>Delete Project</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
  );
};

// ─── Task List for a Key Result ───
const TaskList = ({ keyResult, tasks, onCreate, onEdit, onUpdate, onDelete, onBack, staffList, onShowHowItWorks, department }: {
  keyResult: KeyResult; tasks: OkrTask[];
  onCreate: () => void;
  onEdit: (task: OkrTask) => void;
  onUpdate: (task: OkrTask, updates: Partial<OkrTask>) => void;
  onDelete: (id: string) => void; onBack: () => void; staffList: Array<{ email: string; name: string }>;
  onShowHowItWorks: () => void;
  department?: string;
}) => {
  const statuses = getTaskStatuses(department);
  const grouped = statuses.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {} as Record<string, OkrTask[]>);
  const statusLabels: Record<string, string> = { todo: "To Do", in_progress: "In Progress", internal_testing: "Internal Testing", deployed_staging: "Deployed on Staging", done: "Done" };
  useBackNav("Back to Projects", onBack);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3" data-tour="okr-task-header">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">{keyResult.title}</h2>
          </div>
          {keyResult.description && <p className="text-xs text-muted-foreground mt-1">{keyResult.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onShowHowItWorks}
            className="shrink-0 bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold border border-white/20 btn-shimmer hover:btn-shimmer active:btn-shimmer"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            How it Works
          </Button>
          <Button variant="forti" size="sm" onClick={onCreate} data-tour="okr-task-new">
            <Plus className="h-4 w-4 mr-1" /> New Task
          </Button>
        </div>
      </div>
      <div className={`grid gap-4 ${statuses.length === 5 ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" : statuses.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
        {statuses.map((status) => (
          <div
            key={status}
            data-tour={`okr-task-col-${status === "in_progress" ? "progress" : status.replace("_", "-")}`}
            className="rounded-lg border border-border bg-card/50 p-3 min-h-[200px]"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">{statusLabels[status]}</h4>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{grouped[status]?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {(grouped[status] || []).map((task) => (
                <div key={task.id} className="rounded-lg border border-border bg-card p-3 space-y-1.5 group">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-sm font-medium">{task.title}</h5>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => onEdit(task)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        aria-label="View task"
                        title="View task"
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted">
                            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(task)}>Edit task</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {statuses.filter((s) => s !== task.status).map((s) => (
                            <DropdownMenuItem key={s} onClick={() => onUpdate(task, { status: s })}>Move to {statusLabels[s]}</DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(task.id)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {task.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{task.description}</p>}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={`text-[9px] ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority === "urgent" && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                      {task.priority}
                    </Badge>
                    {(() => {
                      const list = (task.assignees && task.assignees.length > 0)
                        ? task.assignees
                        : (task.assigned_to ? [task.assigned_to] : []);
                      return list.slice(0, 2).map((email) => (
                        <span key={email} className="text-[9px] text-muted-foreground truncate max-w-[100px]">
                          → {staffList.find(s => s.email === email)?.name || email}
                        </span>
                      )).concat(
                        list.length > 2
                          ? [<span key="more" className="text-[9px] text-muted-foreground">+{list.length - 2}</span>]
                          : []
                      );
                    })()}
                    {task.due_date && (() => {
                      const today = new Date(); today.setHours(0,0,0,0);
                      const due = new Date(task.due_date.length > 10 ? task.due_date : task.due_date + "T00:00:00");
                      const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
                      const isDone = task.status === "done" || task.status === "complete";
                      const overdue = !isDone && diff < 0;
                      const dueToday = !isDone && diff === 0;
                      const cls = isDone
                        ? "text-emerald-400"
                        : overdue
                          ? "text-red-400 font-semibold"
                          : dueToday
                            ? "text-amber-400 font-semibold"
                            : "text-muted-foreground";
                      const label = isDone
                        ? "Done"
                        : overdue
                          ? `Overdue ${Math.abs(diff)}d`
                          : dueToday
                            ? "Due today"
                            : `On time · ${diff}d left`;
                      return (
                        <span className={`text-[9px] flex items-center gap-0.5 ${cls}`}>
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {label}
                        </span>
                      );
                    })()}
                    {task.reminder_frequency && (
                      <span className="text-[9px] text-primary flex items-center gap-0.5" title={`Reminder: ${task.reminder_frequency}`}>
                        <Bell className="h-2.5 w-2.5" />
                        {task.reminder_frequency}
                      </span>
                    )}
                    {task.attachments && task.attachments.length > 0 && (
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Paperclip className="h-2.5 w-2.5" />{task.attachments.length}</span>
                    )}
                    {task.links && task.links.length > 0 && (
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Link2 className="h-2.5 w-2.5" />{task.links.length}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main OKR Tracker ───
const OkrTracker = ({ department = "sales" }: { department?: string }) => {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [projectWalkthroughOpen, setProjectWalkthroughOpen] = useState(false);
  const [taskWalkthroughOpen, setTaskWalkthroughOpen] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [selectedKR, setSelectedKR] = useState<KeyResult | null>(null);
  const [tasks, setTasks] = useState<OkrTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<Array<{ email: string; name: string }>>([]);

  // Dialogs
  const [objDialogOpen, setObjDialogOpen] = useState(false);
  const [krDialogOpen, setKrDialogOpen] = useState(false);
  const [editingKRId, setEditingKRId] = useState<string | null>(null);
  const [originalKRAssignees, setOriginalKRAssignees] = useState<string[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  // Forms
  const [objForm, setObjForm] = useState({ title: "", description: "" });
  const [krForm, setKrForm] = useState<{ title: string; description: string; assignees: string[] }>({ title: "", description: "", assignees: [] });
  const emptyTaskForm = {
    title: "", description: "", priority: "normal",
    assignees: [] as string[],
    due_date: "", reminder_frequency: "" as "" | "daily" | "weekly" | "monthly",
    notify_email: true, notify_sms: true,
    notes: [] as NoteEntry[],
    noteInput: "",
    links: [] as string[],
    linkInput: "",
    attachments: [] as TaskAttachment[],
  };
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const fetchObjectives = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getOkrObjectives(department);
      setObjectives(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchKeyResults = async (objId: string) => {
    try {
      const { data } = await adminApi.getOkrKeyResults(objId);
      setKeyResults(data || []);
    } catch (e) { console.error(e); }
  };

  const fetchTasks = async (krId: string) => {
    try {
      const { data } = await adminApi.getOkrTasks(krId);
      setTasks(data || []);
    } catch (e) { console.error(e); }
  };

  const fetchStaff = async () => {
    try {
      const { data } = await adminApi.getUsers();
      setStaffList((data || []).map((u: any) => ({
        email: u.email,
        name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email,
      })));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchObjectives(); fetchStaff(); }, []);

  useEffect(() => {
    if (selectedObjective) fetchKeyResults(selectedObjective.id);
  }, [selectedObjective]);

  useEffect(() => {
    if (selectedKR) fetchTasks(selectedKR.id);
  }, [selectedKR]);

  // ─── Realtime: live updates so all users see task changes instantly ───
  useEffect(() => {
    if (!selectedKR) return;
    const channel = supabase
      .channel(`okr_tasks_${selectedKR.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "okr_tasks", filter: `key_result_id=eq.${selectedKR.id}` },
        (payload) => {
          setTasks((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as OkrTask;
              if (prev.some((t) => t.id === row.id)) return prev;
              return [...prev, row];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as OkrTask;
              return prev.map((t) => (t.id === row.id ? { ...t, ...row } : t));
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as OkrTask;
              return prev.filter((t) => t.id !== row.id);
            }
            return prev;
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedKR]);

  // ─── Deep-link: open a specific task (?task=<id>) or project (?project=<kr_id>) ───
  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (deepLinkHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("task");
    const projectId = params.get("project");
    if (!taskId && !projectId) return;
    deepLinkHandledRef.current = true;

    (async () => {
      try {
        if (taskId) {
          const { data: task } = await supabase
            .from("okr_tasks")
            .select("*, okr_key_results!inner(*, okr_objectives!inner(*))")
            .eq("id", taskId)
            .maybeSingle();
          if (task) {
            const kr = (task as any).okr_key_results;
            const obj = kr?.okr_objectives;
            if (obj && obj.department === department) {
              setSelectedObjective(obj);
              setSelectedKR(kr);
              setTimeout(() => {
                handleEditTask(task as unknown as OkrTask);
              }, 300);
            }
          }
        } else if (projectId) {
          const { data: kr } = await supabase
            .from("okr_key_results")
            .select("*, okr_objectives!inner(*)")
            .eq("id", projectId)
            .maybeSingle();
          if (kr) {
            const obj = (kr as any).okr_objectives;
            if (obj && obj.department === department) {
              setSelectedObjective(obj);
              setSelectedKR(kr as any);
            }
          }
        }
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete("task");
        url.searchParams.delete("project");
        window.history.replaceState({}, "", url.toString());
      } catch (e) {
        console.error("OKR deep-link failed:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department]);

  // ─── CRUD Handlers ───
  const handleCreateObjective = async () => {
    if (!objForm.title.trim()) return;
    try {
      await adminApi.createOkrObjective(objForm.title, { description: objForm.description, department });
      setObjDialogOpen(false);
      setObjForm({ title: "", description: "" });
      await fetchObjectives();
    } catch (e: any) { alert(e.message); }
  };

  const handleDeleteObjective = async (id: string) => {
    if (!confirm("Delete this objective and all its projects/tasks?")) return;
    try {
      await adminApi.deleteOkrObjective(id);
      if (selectedObjective?.id === id) { setSelectedObjective(null); setSelectedKR(null); }
      await fetchObjectives();
    } catch (e: any) { alert(e.message); }
  };

  const handleCreateKR = async () => {
    if (!krForm.title.trim() || !selectedObjective) return;
    try {
      // Backend (admin-api) handles "project" notifications for new/added assignees,
      // so we intentionally do NOT call notifyAssignment here to avoid duplicate
      // (and incorrectly-labeled "task") messages.
      if (editingKRId) {
        await adminApi.updateOkrKeyResult(editingKRId, {
          title: krForm.title,
          description: krForm.description,
          assignees: krForm.assignees,
        });
      } else {
        await adminApi.createOkrKeyResult(selectedObjective.id, krForm.title, {
          description: krForm.description,
          assignees: krForm.assignees,
        });
      }
      setKrDialogOpen(false);
      setEditingKRId(null);
      setOriginalKRAssignees([]);
      setKrForm({ title: "", description: "", assignees: [] });
      await fetchKeyResults(selectedObjective.id);
    } catch (e: any) { alert(e.message); }
  };

  const handleDeleteKR = async (id: string) => {
    if (!confirm("Delete this project and all its tasks?")) return;
    try {
      await adminApi.deleteOkrKeyResult(id);
      if (selectedKR?.id === id) setSelectedKR(null);
      if (selectedObjective) await fetchKeyResults(selectedObjective.id);
    } catch (e: any) { alert(e.message); }
  };

  const handleCreateTask = async () => {
    if (!taskForm.title.trim() || !selectedKR) return;
    try {
      if (editingTaskId) {
        await adminApi.updateOkrTask(editingTaskId, {
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          assignees: taskForm.assignees,
          due_date: taskForm.due_date || null,
          reminder_frequency: taskForm.reminder_frequency || null,
          notify_email: taskForm.notify_email,
          notify_sms: taskForm.notify_sms,
          notes: serializeNotes(taskForm.notes),
          links: taskForm.links,
          attachments: taskForm.attachments,
        });
      } else {
        await adminApi.createOkrTask(selectedKR.id, taskForm.title, {
          description: taskForm.description, priority: taskForm.priority,
          assignees: taskForm.assignees,
          due_date: taskForm.due_date || undefined,
          reminder_frequency: taskForm.reminder_frequency || null,
          notify_email: taskForm.notify_email, notify_sms: taskForm.notify_sms,
          notes: serializeNotes(taskForm.notes) || undefined,
          links: taskForm.links,
          attachments: taskForm.attachments,
        });
      }
      setTaskDialogOpen(false);
      setEditingTaskId(null);
      setTaskForm(emptyTaskForm);
      await fetchTasks(selectedKR.id);
    } catch (e: any) { alert(e.message); }
  };

  const handleEditTask = (task: OkrTask) => {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority || "normal",
      assignees: (task.assignees && task.assignees.length > 0)
        ? task.assignees
        : (task.assigned_to ? [task.assigned_to] : []),
      due_date: task.due_date ? task.due_date.slice(0, 10) : "",
      reminder_frequency: (task.reminder_frequency as any) || "",
      notify_email: task.notify_email ?? true,
      notify_sms: task.notify_sms ?? true,
      notes: parseNotes(task.notes),
      noteInput: "",
      links: task.links || [],
      linkInput: "",
      attachments: task.attachments || [],
    });
    setTaskDialogOpen(true);
  };

  const handleUploadFile = async (file: File) => {
    if (!file) return;
    setUploadingFile(true);
    try {
      const res: any = await adminApi.getUploadUrl(file.name);
      const uploadRes = await fetch(res.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      setTaskForm((prev) => ({
        ...prev,
        attachments: [...prev.attachments, { name: file.name, url: res.readUrl, type: file.type }],
      }));
    } catch (e: any) {
      alert(e.message || "Upload failed");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleUpdateTask = async (task: OkrTask, updates: Partial<OkrTask>) => {
    try {
      await adminApi.updateOkrTask(task.id, updates);
      if (selectedKR) await fetchTasks(selectedKR.id);
    } catch (e: any) { alert(e.message); }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await adminApi.deleteOkrTask(id);
      if (selectedKR) await fetchTasks(selectedKR.id);
    } catch (e: any) { alert(e.message); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" /></div>;

  return (
    <div className="space-y-4">
      {selectedKR && selectedObjective ? (
        <TaskList
          keyResult={selectedKR} tasks={tasks}
          onCreate={() => { setEditingTaskId(null); setTaskForm(emptyTaskForm); setTaskDialogOpen(true); }}
          onEdit={handleEditTask}
          onUpdate={handleUpdateTask} onDelete={handleDeleteTask}
          onBack={() => setSelectedKR(null)} staffList={staffList}
          onShowHowItWorks={() => setTaskWalkthroughOpen(true)}
          department={department}
        />
      ) : selectedObjective ? (
        <KeyResultList
          objective={selectedObjective} keyResults={keyResults}
          onSelect={setSelectedKR}
          onCreate={() => { setEditingKRId(null); setOriginalKRAssignees([]); setKrForm({ title: "", description: "", assignees: [] }); setKrDialogOpen(true); }}
          onEdit={(kr) => {
            const current = (kr.assignees && kr.assignees.length > 0)
              ? kr.assignees
              : (kr.assigned_to ? [kr.assigned_to] : []);
            setEditingKRId(kr.id);
            setOriginalKRAssignees(current);
            setKrForm({ title: kr.title, description: kr.description || "", assignees: current });
            setKrDialogOpen(true);
          }}
          onDelete={handleDeleteKR} onBack={() => setSelectedObjective(null)}
          onRename={async (kr) => {
            const next = window.prompt("Rename project", kr.title);
            if (!next || next.trim() === "" || next === kr.title) return;
            try {
              await adminApi.updateOkrKeyResult(kr.id, { title: next.trim() });
              await fetchKeyResults(selectedObjective.id);
            } catch (e: any) { alert(e.message); }
          }}
          onShowHowItWorks={() => setProjectWalkthroughOpen(true)}
        />
      ) : (
        <ObjectiveList
          objectives={objectives} onSelect={setSelectedObjective}
          onCreate={() => { setObjForm({ title: "", description: "" }); setObjDialogOpen(true); }}
          onDelete={handleDeleteObjective}
          onRename={async (obj) => {
            const next = window.prompt("Rename objective", obj.title);
            if (!next || next.trim() === "" || next === obj.title) return;
            try {
              await adminApi.updateOkrObjective(obj.id, { title: next.trim() });
              await fetchObjectives();
            } catch (e: any) { alert(e.message); }
          }}
          onShowHowItWorks={() => setWalkthroughOpen(true)}
        />
      )}

      <OkrWalkthrough open={walkthroughOpen} onClose={() => setWalkthroughOpen(false)} />
      <OkrProjectWalkthrough open={projectWalkthroughOpen} onClose={() => setProjectWalkthroughOpen(false)} />
      <OkrTaskWalkthrough open={taskWalkthroughOpen} onClose={() => setTaskWalkthroughOpen(false)} />

      {/* New Objective Dialog */}
      <Dialog open={objDialogOpen} onOpenChange={setObjDialogOpen}>
        <DialogContent className="bg-card border-border w-[calc(100vw-3rem)] max-w-md p-5 sm:p-6">
          <DialogHeader><DialogTitle>New Objective</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Objective title" value={objForm.title} onChange={(e) => setObjForm({ ...objForm, title: e.target.value })} />
            <Textarea placeholder="Description (optional)" value={objForm.description} onChange={(e) => setObjForm({ ...objForm, description: e.target.value })} rows={2} />
            <div className="flex justify-end gap-2">
              <Button variant="fortiGhost" size="sm" onClick={() => setObjDialogOpen(false)}>Cancel</Button>
              <Button variant="forti" size="sm" disabled={!objForm.title.trim()} onClick={handleCreateObjective}>Create Objective</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Key Result Dialog */}
      <Dialog open={krDialogOpen} onOpenChange={(open) => { setKrDialogOpen(open); if (!open) { setEditingKRId(null); setOriginalKRAssignees([]); } }}>
        <DialogContent className="bg-card border-border w-[calc(100vw-3rem)] max-w-md p-5 sm:p-6 gap-4">
          <DialogHeader><DialogTitle>{editingKRId ? "Manage Project" : "New Project"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Project title" value={krForm.title} onChange={(e) => setKrForm({ ...krForm, title: e.target.value })} />
            <Textarea placeholder="Description (optional)" value={krForm.description} onChange={(e) => setKrForm({ ...krForm, description: e.target.value })} rows={2} />
            <div className="space-y-2">
              <Label className="text-xs">Assign To (one or more — they'll be notified)</Label>
              {krForm.assignees.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {krForm.assignees.map((email) => {
                    const member = staffList.find((s) => s.email === email);
                    return (
                      <span key={email} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs">
                        {member?.name ?? email}
                        <button
                          type="button"
                          onClick={() => setKrForm({ ...krForm, assignees: krForm.assignees.filter((e) => e !== email) })}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Remove ${email}`}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <Select
                value=""
                onValueChange={(v) => {
                  if (v && !krForm.assignees.includes(v)) {
                    setKrForm({ ...krForm, assignees: [...krForm.assignees, v] });
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder={krForm.assignees.length ? "Add another assignee…" : "Select assignees…"} /></SelectTrigger>
                <SelectContent>
                  {staffList
                    .filter((s) => !krForm.assignees.includes(s.email))
                    .map((s) => <SelectItem key={s.email} value={s.email}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <Button variant="fortiGhost" size="sm" onClick={() => setKrDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button variant="forti" size="sm" disabled={!krForm.title.trim()} onClick={handleCreateKR} className="w-full sm:w-auto">{editingKRId ? "Save Changes" : "Create Project"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Dialog (create + edit) */}
      <Dialog open={taskDialogOpen} onOpenChange={(open) => { setTaskDialogOpen(open); if (!open) setEditingTaskId(null); }}>
        <DialogContent className="bg-card border-border w-[calc(100vw-3rem)] max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader><DialogTitle>{editingTaskId ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
            <Textarea placeholder="Description (optional)" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={2} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["urgent", "high", "normal", "low"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
              </div>
            </div>

            {/* Multi assignees */}
            <div className="space-y-1">
              <Label className="text-xs">Assign To (multiple)</Label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {taskForm.assignees.map((email) => (
                  <Badge key={email} variant="outline" className="gap-1 pr-1">
                    {staffList.find((s) => s.email === email)?.name || email}
                    <button
                      onClick={() => setTaskForm({ ...taskForm, assignees: taskForm.assignees.filter((e) => e !== email) })}
                      className="ml-0.5 rounded-sm hover:bg-muted/50 p-0.5"
                      aria-label="Remove assignee"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Select
                value=""
                onValueChange={(v) => {
                  if (v && !taskForm.assignees.includes(v)) {
                    setTaskForm({ ...taskForm, assignees: [...taskForm.assignees, v] });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={taskForm.assignees.length ? "Add another assignee…" : "Select assignees…"} />
                </SelectTrigger>
                <SelectContent>
                  {staffList
                    .filter((s) => !taskForm.assignees.includes(s.email))
                    .map((s) => <SelectItem key={s.email} value={s.email}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Reminder cadence */}
            <div className="space-y-1">
              <Label className="text-xs">Reminder cadence</Label>
              <Select
                value={taskForm.reminder_frequency || "none"}
                onValueChange={(v) =>
                  setTaskForm({ ...taskForm, reminder_frequency: v === "none" ? "" : (v as any) })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No reminders</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Reminders repeat at the chosen cadence until the task is marked done.</p>
            </div>

            {/* Notes thread */}
            <div className="space-y-2">
              <Label className="text-xs">Notes</Label>
              {taskForm.notes.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
                  {taskForm.notes.map((n, idx) => {
                    const who = n.author_name || n.author_email || "Unknown";
                    const when = n.created_at
                      ? new Date(n.created_at).toLocaleString(undefined, {
                          month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                        })
                      : "";
                    const isMine = !!user && n.author_id === user.id;
                    return (
                      <div key={n.id || `${idx}`} className="rounded bg-background/60 border border-border/60 px-2 py-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-medium text-foreground/90 truncate">{who}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {when && <span className="text-[10px] text-muted-foreground">{when}</span>}
                            {isMine && (
                              <button
                                onClick={() => setTaskForm({ ...taskForm, notes: taskForm.notes.filter((_, i) => i !== idx) })}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Delete note"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="whitespace-pre-wrap break-words text-foreground/80">{n.content}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Textarea
                placeholder="Add a note for this task…"
                value={taskForm.noteInput}
                onChange={(e) => setTaskForm({ ...taskForm, noteInput: e.target.value })}
                rows={2}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="fortiGhost"
                  disabled={!taskForm.noteInput.trim()}
                  onClick={() => {
                    const content = taskForm.noteInput.trim();
                    if (!content) return;
                    const meta: any = user?.user_metadata || {};
                    const name = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || meta.full_name || null;
                    const entry: NoteEntry = {
                      id: (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `${Date.now()}`,
                      author_id: user?.id ?? null,
                      author_name: name,
                      author_email: user?.email ?? null,
                      content,
                      created_at: new Date().toISOString(),
                    };
                    setTaskForm({ ...taskForm, notes: [...taskForm.notes, entry], noteInput: "" });
                  }}
                >
                  Submit Note
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Notes are saved when you click "Save Changes" / "Create Task". You can only delete your own notes.</p>
            </div>

            {/* Links */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Link2 className="h-3 w-3" /> Links</Label>
              <div className="space-y-1.5">
                {taskForm.links.map((link, idx) => (
                  <div key={`${link}-${idx}`} className="flex items-center gap-1.5">
                    <span className="flex-1 truncate text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">{link}</span>
                    <button
                      onClick={() => setTaskForm({ ...taskForm, links: taskForm.links.filter((_, i) => i !== idx) })}
                      className="rounded p-1 hover:bg-muted"
                      aria-label="Remove link"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Input
                  placeholder="https://…"
                  value={taskForm.linkInput}
                  onChange={(e) => setTaskForm({ ...taskForm, linkInput: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && taskForm.linkInput.trim()) {
                      e.preventDefault();
                      setTaskForm({ ...taskForm, links: [...taskForm.links, taskForm.linkInput.trim()], linkInput: "" });
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="fortiGhost"
                  onClick={() => {
                    if (taskForm.linkInput.trim()) {
                      setTaskForm({ ...taskForm, links: [...taskForm.links, taskForm.linkInput.trim()], linkInput: "" });
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Files */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Paperclip className="h-3 w-3" /> Files</Label>
              <div className="space-y-1.5">
                {taskForm.attachments.map((att, idx) => (
                  <div key={`${att.url}-${idx}`} className="flex items-center gap-1.5">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate text-xs text-primary bg-muted/30 rounded px-2 py-1 hover:underline"
                    >
                      {att.name}
                    </a>
                    <button
                      onClick={() => setTaskForm({ ...taskForm, attachments: taskForm.attachments.filter((_, i) => i !== idx) })}
                      className="rounded p-1 hover:bg-muted"
                      aria-label="Remove file"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-md py-2 cursor-pointer text-xs text-muted-foreground hover:bg-muted/30">
                <Upload className="h-3.5 w-3.5" />
                {uploadingFile ? "Uploading…" : "Attach file"}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploadingFile}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadFile(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {/* Notification channels */}
            <div className="flex items-center gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch checked={taskForm.notify_email} onCheckedChange={(v) => setTaskForm({ ...taskForm, notify_email: v })} id="notify-email" />
                <Label htmlFor="notify-email" className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={taskForm.notify_sms} onCheckedChange={(v) => setTaskForm({ ...taskForm, notify_sms: v })} id="notify-sms" />
                <Label htmlFor="notify-sms" className="text-xs flex items-center gap-1"><MessageSquare className="h-3 w-3" /> SMS</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="fortiGhost" size="sm" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
              <Button variant="forti" size="sm" disabled={!taskForm.title.trim()} onClick={handleCreateTask}>{editingTaskId ? "Save Changes" : "Create Task"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OkrTracker;
