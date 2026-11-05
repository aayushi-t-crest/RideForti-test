import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Lightbulb, CheckCircle2, XCircle, Clock } from "lucide-react";

interface Idea {
  id: string;
  title: string;
  description: string;
  category: string | null;
  status: string;
  submitter_user_id: string;
  submitter_name: string | null;
  submitter_email: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  decision_reason: string | null;
  created_at: string;
}

const TeamIdeas = () => {
  const { user, isAdmin } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [decisionFor, setDecisionFor] = useState<{ id: string; action: "approved" | "rejected" } | null>(null);
  const [reason, setReason] = useState("");

  const canReview = isAdmin || isSupervisor;

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("team_ideas")
      .select("*")
      .order("created_at", { ascending: false });
    setIdeas((data ?? []) as Idea[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("admin_users_directory")
        .select("is_supervisor")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsSupervisor(!!data?.is_supervisor);
    })();
    load();
  }, [user]);

  const submit = async () => {
    if (!title.trim() || !description.trim() || !user) return;
    setSubmitting(true);
    const { data: dir } = await supabase
      .from("admin_users_directory")
      .select("full_name, email, phone")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: inserted, error } = await supabase
      .from("team_ideas")
      .insert({
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || null,
        submitter_user_id: user.id,
        submitter_name: dir?.full_name ?? user.email,
        submitter_email: dir?.email ?? user.email!,
        submitter_phone: dir?.phone ?? null,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    await supabase.functions.invoke("notify-team-idea", {
      body: { ideaId: inserted.id, event: "submitted" },
    });

    toast.success("Idea submitted — admins and supervisors notified");
    setTitle("");
    setDescription("");
    setCategory("");
    setOpen(false);
    setSubmitting(false);
    load();
  };

  const decide = async () => {
    if (!decisionFor || !user) return;
    const { data: dir } = await supabase
      .from("admin_users_directory")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const { error } = await supabase
      .from("team_ideas")
      .update({
        status: decisionFor.action,
        reviewed_by_user_id: user.id,
        reviewed_by_name: dir?.full_name ?? user.email,
        reviewed_at: new Date().toISOString(),
        decision_reason: reason.trim() || null,
      })
      .eq("id", decisionFor.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    await supabase.functions.invoke("notify-team-idea", {
      body: { ideaId: decisionFor.id, event: decisionFor.action },
    });

    toast.success(`Idea ${decisionFor.action}`);
    setDecisionFor(null);
    setReason("");
    load();
  };

  const statusBadge = (status: string) => {
    if (status === "approved")
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    if (status === "rejected")
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Team Ideas</h3>
            <p className="text-xs text-muted-foreground">Share an idea — admins and supervisors will review.</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="forti" size="sm">Submit Idea</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit a Team Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} />
              <Textarea
                placeholder="Describe your idea..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
              />
              <Button variant="forti" onClick={submit} disabled={submitting || !title.trim() || !description.trim()} className="w-full">
                {submitting ? "Submitting..." : "Submit Idea"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Loading...</div>
      ) : ideas.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Lightbulb className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No ideas yet. Be the first to submit one.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <Card key={idea.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm">{idea.title}</h4>
                    {statusBadge(idea.status)}
                    {idea.category && (
                      <Badge variant="outline" className="text-[10px]">{idea.category}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{idea.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Submitted by <span className="text-foreground">{idea.submitter_name || idea.submitter_email}</span>
                    {" · "}{new Date(idea.created_at).toLocaleString()}
                  </p>
                  {idea.reviewed_at && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Reviewed by {idea.reviewed_by_name} · {new Date(idea.reviewed_at).toLocaleString()}
                      {idea.decision_reason && <> · "{idea.decision_reason}"</>}
                    </p>
                  )}
                </div>
                {canReview && idea.status === "pending" && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" variant="forti" onClick={() => setDecisionFor({ id: idea.id, action: "approved" })}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDecisionFor({ id: idea.id, action: "rejected" })}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!decisionFor} onOpenChange={(o) => !o && setDecisionFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionFor?.action === "approved" ? "Approve Idea" : "Reject Idea"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Optional note for the submitter..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <Button variant="forti" onClick={decide} className="w-full">
              Confirm & Notify Submitter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamIdeas;
