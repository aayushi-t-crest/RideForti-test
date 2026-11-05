import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, RefreshCw, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Insight {
  id: string;
  summary: string;
  sentiment_score: number;
  lead_score: number;
  churn_risk: number;
  tips: string[];
  next_actions: string[];
  recommended_tasks: { title: string; description: string; priority: string }[];
  generated_at: string;
  message_count_at_generation: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketLabel: string;
}

function ScoreBar({ label, value, max = 100, tone }: { label: string; value: number; max?: number; tone: "sentiment" | "lead" | "churn" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color =
    tone === "sentiment"
      ? value >= 66
        ? "bg-green-500"
        : value >= 33
        ? "bg-yellow-500"
        : "bg-red-500"
      : tone === "lead"
      ? value >= 66
        ? "bg-emerald-500"
        : value >= 33
        ? "bg-blue-500"
        : "bg-muted-foreground"
      : value >= 66
      ? "bg-red-500"
      : value >= 33
      ? "bg-orange-500"
      : "bg-green-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{value}{tone === "churn" ? "%" : ""}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminAiInsightsPanel({ open, onOpenChange, ticketId, ticketLabel }: Props) {
  const { toast } = useToast();
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [taskDialog, setTaskDialog] = useState<{
    open: boolean;
    task: { title: string; description: string; priority: string } | null;
  }>({ open: false, task: null });

  async function callFn(action: string, payload: any = {}) {
    const { data, error } = await supabase.functions.invoke("support-ai-insights", {
      body: { action, ticket_id: ticketId, ...payload },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function load(forceGenerate = false) {
    setLoading(true);
    try {
      const got = await callFn("get");
      if (got.insight && !forceGenerate) {
        setInsight(got.insight);
      } else {
        setRefreshing(true);
        const gen = await callFn("generate");
        setInsight(gen.insight);
      }
    } catch (e: any) {
      toast({ title: "Insights failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function regenerate() {
    setRefreshing(true);
    try {
      const gen = await callFn("generate");
      setInsight(gen.insight);
      toast({ title: "Insights refreshed" });
    } catch (e: any) {
      toast({ title: "Refresh failed", description: e.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (open && ticketId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticketId]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-purple-400" />
                AI Insights
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={regenerate}
                disabled={refreshing}
                className="text-xs"
              >
                {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                <span className="ml-1">Refresh</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground truncate">{ticketLabel}</p>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {loading && !insight && (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Analyzing conversation…
                </div>
              )}

              {insight && (
                <>
                  <div>
                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Summary</h4>
                    <p className="text-sm leading-relaxed">{insight.summary}</p>
                  </div>

                  <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <ScoreBar label="Sentiment" value={insight.sentiment_score} tone="sentiment" />
                    <ScoreBar label="Lead Score" value={insight.lead_score} tone="lead" />
                    <ScoreBar label="Churn Risk" value={insight.churn_risk} tone="churn" />
                  </div>

                  {insight.tips?.length > 0 && (
                    <div>
                      <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Tips for Staff</h4>
                      <ul className="space-y-1.5">
                        {insight.tips.map((t, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-purple-400">•</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insight.next_actions?.length > 0 && (
                    <div>
                      <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Next Actions</h4>
                      <ul className="space-y-1.5">
                        {insight.next_actions.map((t, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <ArrowRight className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insight.recommended_tasks?.length > 0 && (
                    <div>
                      <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Recommended Tasks</h4>
                      <div className="space-y-2">
                        {insight.recommended_tasks.map((t, i) => (
                          <div key={i} className="p-3 rounded-lg border border-border bg-background space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium">{t.title}</p>
                              <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                                {t.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{t.description}</p>
                            <Button
                              size="sm"
                              variant="forti"
                              className="w-full h-8 text-xs"
                              onClick={() => setTaskDialog({ open: true, task: t })}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Approve & Assign
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground text-center pt-2">
                    Generated {new Date(insight.generated_at).toLocaleString()} · {insight.message_count_at_generation} msgs
                  </p>
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ApproveTaskDialog
        open={taskDialog.open}
        onOpenChange={(o) => setTaskDialog((s) => ({ ...s, open: o }))}
        task={taskDialog.task}
        ticketId={ticketId}
        onDone={() => setTaskDialog({ open: false, task: null })}
      />
    </>
  );
}

// ---------------- Approve Task Dialog ----------------
function ApproveTaskDialog({
  open,
  onOpenChange,
  task,
  ticketId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task: { title: string; description: string; priority: string } | null;
  ticketId: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"existing" | "new_key_result" | "new_objective">("new_objective");
  const [objectives, setObjectives] = useState<any[]>([]);
  const [keyResults, setKeyResults] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [objectiveId, setObjectiveId] = useState<string>("");
  const [keyResultId, setKeyResultId] = useState<string>("");
  const [newObjTitle, setNewObjTitle] = useState("");
  const [newKrTitle, setNewKrTitle] = useState("");
  const [assignedUser, setAssignedUser] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !task) return;
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setNewObjTitle(`Support: ${task.title}`);
    setNewKrTitle(task.title);
    (async () => {
      try {
        const [objs, sup] = await Promise.all([
          adminApi.getOkrObjectives("support"),
          (adminApi as any).getSupervisors?.().catch?.(() => ({ supervisors: [], admins: [] })) ?? Promise.resolve({ supervisors: [], admins: [] }),
        ]);
        setObjectives(objs.objectives || []);
        const merged = [...(sup.admins || []), ...(sup.supervisors || [])];
        const seen = new Set<string>();
        setUsers(merged.filter((u: any) => (seen.has(u.user_id) ? false : (seen.add(u.user_id), true))));
      } catch (e) {
        // ignore
      }
    })();
  }, [open, task]);

  useEffect(() => {
    if (mode !== "existing" && mode !== "new_key_result") return;
    if (!objectiveId) {
      setKeyResults([]);
      return;
    }
    adminApi.getOkrKeyResults(objectiveId).then((r: any) => setKeyResults(r.key_results || []));
  }, [objectiveId, mode]);

  async function submit() {
    if (!task) return;
    setSubmitting(true);
    try {
      const user = users.find((u) => u.user_id === assignedUser);
      const { error } = await supabase.functions.invoke("support-ai-insights", {
        body: {
          action: "approve_task",
          ticket_id: ticketId,
          task: { title, description, priority },
          mode,
          objective_id: mode === "new_objective" ? null : objectiveId,
          objective_title: newObjTitle,
          key_result_id: mode === "existing" ? keyResultId : null,
          key_result_title: newKrTitle,
          department: "support",
          assigned_to: user?.email || null,
          assigned_to_user_id: assignedUser || null,
        },
      });
      if (error) throw error;
      toast({ title: "Task created", description: "Added to OKR tracker." });
      onDone();
    } catch (e: any) {
      toast({ title: "Failed to create task", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Approve & Assign Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Assignee</Label>
              <Select value={assignedUser} onValueChange={setAssignedUser}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <Label className="text-xs">OKR Linkage</Label>
            <Select value={mode} onValueChange={(v: any) => setMode(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new_objective">Create new OKR (objective + project)</SelectItem>
                <SelectItem value="new_key_result">Use existing OKR, new project</SelectItem>
                <SelectItem value="existing">Use existing OKR & project</SelectItem>
              </SelectContent>
            </Select>

            {mode === "new_objective" && (
              <div>
                <Label className="text-xs">New Objective Title</Label>
                <Input value={newObjTitle} onChange={(e) => setNewObjTitle(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">A new project ("{newKrTitle}") will be created under it.</p>
              </div>
            )}

            {(mode === "existing" || mode === "new_key_result") && (
              <div>
                <Label className="text-xs">Objective</Label>
                <Select value={objectiveId} onValueChange={setObjectiveId}>
                  <SelectTrigger><SelectValue placeholder="Pick an objective" /></SelectTrigger>
                  <SelectContent>
                    {objectives.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === "new_key_result" && objectiveId && (
              <div>
                <Label className="text-xs">New Project Title</Label>
                <Input value={newKrTitle} onChange={(e) => setNewKrTitle(e.target.value)} />
              </div>
            )}

            {mode === "existing" && objectiveId && (
              <div>
                <Label className="text-xs">Project (Key Result)</Label>
                <Select value={keyResultId} onValueChange={setKeyResultId}>
                  <SelectTrigger><SelectValue placeholder="Pick a project" /></SelectTrigger>
                  <SelectContent>
                    {keyResults.map((k) => (
                      <SelectItem key={k.id} value={k.id}>{k.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="forti"
            onClick={submit}
            disabled={
              submitting ||
              !title ||
              (mode === "existing" && (!objectiveId || !keyResultId)) ||
              (mode === "new_key_result" && !objectiveId)
            }
          >
            {submitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
