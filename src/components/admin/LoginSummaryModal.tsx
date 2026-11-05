import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "@/lib/adminApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckSquare, FolderKanban, Calendar, AlertTriangle, AtSign, Sparkles, ArrowRight } from "lucide-react";

interface SummaryItem {
  item_key: string;
  kind: "task" | "project" | "event" | "invite" | "mention";
  id: string;
  event_id?: string;
  title: string;
  subtitle?: string | null;
  due_date?: string | null;
  department?: string | null;
}

interface InboxData {
  tasks: SummaryItem[];
  projects: SummaryItem[];
  events: SummaryItem[];
  invites: SummaryItem[];
  mentions: SummaryItem[];
}

interface Props {
  userId: string;
  userName: string;
  loginStamp?: string; // changes per login (e.g. last_sign_in_at)
}

const SESSION_KEY = "forti:login-summary-shown";

const LoginSummaryModal = ({ userId, userName, loginStamp }: Props) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Show once per login (keyed by user + login timestamp). Persists across reloads but resets on next sign-in.
    const key = `${SESSION_KEY}:${userId}:${loginStamp || "session"}`;
    if (localStorage.getItem(key)) return;

    let mounted = true;
    adminApi.getMyInbox()
      .then(({ data }) => {
        if (!mounted || !data) return;
        setData(data as InboxData);
        const total =
          (data.tasks?.length || 0) +
          (data.projects?.length || 0) +
          (data.invites?.length || 0) +
          (data.events?.length || 0) +
          (data.mentions?.length || 0);
        if (total > 0) {
          setOpen(true);
          localStorage.setItem(key, "1");
        }
      })
      .catch(() => undefined)
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [userId, loginStamp]);

  const counts = useMemo(() => ({
    tasks: data?.tasks.length || 0,
    projects: data?.projects.length || 0,
    invites: data?.invites.length || 0,
    events: data?.events.length || 0,
    mentions: data?.mentions.length || 0,
  }), [data]);

  const totalCount =
    counts.tasks + counts.projects + counts.invites + counts.events + counts.mentions;

  const previewItems: SummaryItem[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.invites.slice(0, 3),
      ...data.tasks.slice(0, 3),
      ...data.projects.slice(0, 2),
      ...data.mentions.slice(0, 2),
      ...data.events.slice(0, 2),
    ].slice(0, 6);
  }, [data]);

  const handleOpen = (it: SummaryItem) => {
    setOpen(false);
    const dept = it.department || "ops";
    if (it.kind === "task") {
      navigate(`/admin?dept=${dept}&section=resources&module=okr&task=${it.id}`);
    } else if (it.kind === "project") {
      navigate(`/admin?dept=${dept}&section=resources&module=okr&project=${it.id}`);
    } else if (it.kind === "mention") {
      const eventId = (it as any).event_id;
      if (eventId) navigate(`/admin?dept=${dept}&section=resources&module=calendar&event=${eventId}`);
    } else {
      navigate(`/admin?dept=${dept}&section=resources&module=calendar&event=${it.event_id || it.id}`);
    }
    setTimeout(() => window.location.reload(), 50);
  };

  if (loading || !data || totalCount === 0) return null;

  const firstName = userName.split(" ")[0] || "there";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="bg-card border-border w-[calc(100vw-2rem)] max-w-md p-0 overflow-hidden gap-0 animate-in fade-in zoom-in-95 duration-300"
      >
        {/* Header */}
        <div className="relative bg-card px-6 py-5 border-b border-border overflow-hidden">
          <DialogHeader className="relative z-10">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              Welcome back, {firstName}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Here's everything waiting for you across Forti.
            </p>
          </DialogHeader>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-5 gap-1 px-3 py-3 border-b border-border bg-card">
          {[
            { label: "Tasks", count: counts.tasks, icon: CheckSquare, color: "text-foreground" },
            { label: "Projects", count: counts.projects, icon: FolderKanban, color: "text-emerald-400" },
            { label: "Invites", count: counts.invites, icon: AlertTriangle, color: "text-orange-400" },
            { label: "Events", count: counts.events, icon: Calendar, color: "text-blue-400" },
            { label: "Tags", count: counts.mentions, icon: AtSign, color: "text-purple-400" },
          ].map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-md bg-muted/30 px-1.5 py-2 text-center animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${idx * 70}ms`, animationFillMode: "both" }}
              >
                <Icon className={`h-3.5 w-3.5 mx-auto mb-1 ${s.color}`} />
                <div className="text-base font-bold leading-none">{s.count}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wide">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Preview list */}
        {previewItems.length > 0 && (
          <div className="max-h-[260px] overflow-y-auto px-3 py-2 space-y-1">
            {previewItems.map((it, idx) => {
              const Icon =
                it.kind === "task" ? CheckSquare :
                it.kind === "project" ? FolderKanban :
                it.kind === "invite" ? AlertTriangle :
                it.kind === "mention" ? AtSign : Calendar;
              const color =
                it.kind === "project" ? "text-emerald-400" :
                it.kind === "invite" ? "text-orange-400" :
                it.kind === "mention" ? "text-purple-400" :
                it.kind === "event" ? "text-blue-400" : "text-muted-foreground";
              return (
                <button
                  key={it.item_key}
                  onClick={() => handleOpen(it)}
                  className="w-full text-left rounded-md px-2.5 py-2 hover:bg-foreground/10 transition-colors flex items-start gap-2 animate-in fade-in slide-in-from-bottom-1"
                  style={{ animationDelay: `${400 + idx * 60}ms`, animationFillMode: "both" }}
                >
                  <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{it.title}</p>
                    {it.subtitle && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{it.subtitle}</p>
                    )}
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/60 mt-0.5 shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            Open the bell anytime to see updates.
          </p>
          <Button size="sm" variant="forti" onClick={() => setOpen(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginSummaryModal;
