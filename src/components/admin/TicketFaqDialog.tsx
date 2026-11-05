import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Send, MessageSquare, CheckCircle2, ArrowRightCircle } from "lucide-react";

interface Staff {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  roles: string[];
}

interface FaqQuestion {
  id: string;
  ticket_id: string | null;
  ticket_number: string | null;
  question: string;
  answer: string | null;
  status: string;
  escalation_level: string;
  submitted_by: string;
  submitted_by_name: string | null;
  assigned_to: string;
  assigned_to_name: string | null;
  answered_by_name: string | null;
  answered_at: string | null;
  read_at: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticketId: string;
  ticketNumber: string;
  currentUserId: string;
}

async function callFaq(action: string, body: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("support-faq", {
    body,
    method: "POST",
    headers: {},
  } as any);
  if (error) throw error;
  return data;
}

// Simpler: hit the function URL directly with action in query string
async function faqRequest(action: string, body: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-faq?action=${action}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

export default function TicketFaqDialog({ open, onOpenChange, ticketId, ticketNumber, currentUserId }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"submit" | "thread">("submit");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [assignee, setAssignee] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [questions, setQuestions] = useState<FaqQuestion[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [reassignTargets, setReassignTargets] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const s = await faqRequest("list-staff");
        setStaff(s.staff || []);
      } catch (e: any) {
        toast({ title: "Failed to load staff", description: e.message, variant: "destructive" });
      }
      loadThread();
    })();
  }, [open]);

  const isValidUuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  const loadThread = async () => {
    if (!ticketId || !isValidUuid(ticketId)) {
      setQuestions([]);
      return;
    }
    setLoadingThread(true);
    try {
      const r = await faqRequest("list-by-ticket", { ticket_id: ticketId });
      setQuestions(r.questions || []);
      // Mark unread answers (submitted by me) as read
      for (const q of r.questions || []) {
        if (q.status === "answered" && q.submitted_by === currentUserId && !q.read_at) {
          faqRequest("mark-read", { question_id: q.id }).catch(() => {});
        }
      }
    } catch (e: any) {
      toast({ title: "Failed to load thread", description: e.message, variant: "destructive" });
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSubmit = async () => {
    if (!question.trim() || !assignee) {
      toast({ title: "Question and supervisor required", variant: "destructive" });
      return;
    }
    if (!isValidUuid(ticketId)) {
      toast({ title: "Demo ticket", description: "FAQ is disabled for demo tickets.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await faqRequest("create", {
        ticket_id: ticketId,
        ticket_number: ticketNumber,
        question: question.trim(),
        assigned_to: assignee,
      });
      toast({ title: "Question sent", description: "The supervisor has been notified." });
      setQuestion("");
      setAssignee("");
      setTab("thread");
      loadThread();
    } catch (e: any) {
      toast({ title: "Failed to submit", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = async (q: FaqQuestion) => {
    const text = (answerDrafts[q.id] || "").trim();
    if (!text) {
      toast({ title: "Answer required", variant: "destructive" });
      return;
    }
    try {
      await faqRequest("answer", { question_id: q.id, answer: text });
      toast({ title: "Answer sent" });
      setAnswerDrafts((d) => ({ ...d, [q.id]: "" }));
      loadThread();
    } catch (e: any) {
      toast({ title: "Failed to answer", description: e.message, variant: "destructive" });
    }
  };

  const handleReassign = async (q: FaqQuestion) => {
    const target = reassignTargets[q.id];
    if (!target) {
      toast({ title: "Pick an admin to reassign to", variant: "destructive" });
      return;
    }
    try {
      await faqRequest("reassign", { question_id: q.id, assigned_to: target });
      toast({ title: "Reassigned" });
      loadThread();
    } catch (e: any) {
      toast({ title: "Failed to reassign", description: e.message, variant: "destructive" });
    }
  };

  const admins = staff.filter((s) => s.roles.includes("admin"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-500" />
            FAQ — Ticket #{ticketNumber}
          </DialogTitle>
          <DialogDescription>
            Escalate questions you can't answer to a supervisor or admin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setTab("submit")}
            className={`px-3 py-2 text-sm border-b-2 ${tab === "submit" ? "border-amber-500 text-amber-500" : "border-transparent text-muted-foreground"}`}
          >
            Submit Question
          </button>
          <button
            onClick={() => setTab("thread")}
            className={`px-3 py-2 text-sm border-b-2 flex items-center gap-2 ${tab === "thread" ? "border-amber-500 text-amber-500" : "border-transparent text-muted-foreground"}`}
          >
            <MessageSquare className="h-4 w-4" />
            Thread {questions.length > 0 && <Badge variant="secondary">{questions.length}</Badge>}
          </button>
        </div>

        {tab === "submit" && (
          <div className="space-y-4 py-2">
            <div>
              <Label>Tag a supervisor or admin</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {staff.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No supervisors or admins available</div>
                  )}
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} <span className="text-muted-foreground">({s.roles.join(", ")})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Your question</Label>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Describe what you need help answering for the customer..."
                rows={5}
              />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Sending..." : "Send to supervisor"}
            </Button>
          </div>
        )}

        {tab === "thread" && (
          <ScrollArea className="flex-1 pr-3">
            {loadingThread ? (
              <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>
            ) : questions.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">No FAQ questions on this ticket yet.</div>
            ) : (
              <div className="space-y-3 py-2">
                {questions.map((q) => {
                  const iAmAssignee = q.assigned_to === currentUserId;
                  const iSubmitted = q.submitted_by === currentUserId;
                  return (
                    <div key={q.id} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={q.status === "answered" ? "default" : "secondary"} className={q.status === "answered" ? "bg-purple-500/20 text-purple-300" : "bg-amber-500/20 text-amber-300"}>
                            {q.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{q.escalation_level}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm">
                        <span className="text-muted-foreground">From {q.submitted_by_name || "?"} → {q.assigned_to_name || "?"}:</span>
                      </p>
                      <p className="text-sm bg-muted/30 p-2 rounded">{q.question}</p>

                      {q.answer && (
                        <div className="border-l-2 border-purple-500 pl-3 mt-2">
                          <p className="text-xs text-muted-foreground">
                            Answered by {q.answered_by_name || "?"} • {q.answered_at ? new Date(q.answered_at).toLocaleString() : ""}
                          </p>
                          <p className="text-sm mt-1">{q.answer}</p>
                        </div>
                      )}

                      {!q.answer && iAmAssignee && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <Textarea
                            placeholder="Type your answer..."
                            value={answerDrafts[q.id] || ""}
                            onChange={(e) => setAnswerDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAnswer(q)} className="flex-1">
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Send answer
                            </Button>
                          </div>
                          {q.escalation_level === "supervisor" && admins.length > 0 && (
                            <div className="flex gap-2 items-center pt-2 border-t border-border">
                              <span className="text-xs text-muted-foreground">Can't answer?</span>
                              <Select
                                value={reassignTargets[q.id] || ""}
                                onValueChange={(v) => setReassignTargets((r) => ({ ...r, [q.id]: v }))}
                              >
                                <SelectTrigger className="h-8 text-xs flex-1">
                                  <SelectValue placeholder="Reassign to admin" />
                                </SelectTrigger>
                                <SelectContent>
                                  {admins.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="secondary" onClick={() => handleReassign(q)}>
                                <ArrowRightCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
