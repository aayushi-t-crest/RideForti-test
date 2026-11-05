import { useState, useEffect, useRef } from "react";
import { adminApi } from "@/lib/adminApi";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, User, AlertTriangle, Send, Bot, UserCircle, MessageSquare, ArrowLeft, Power, PowerOff, X, Timer, HelpCircle, PlayCircle, UserPlus, ChevronUp, StickyNote, Sparkles, Paperclip, Image as ImageIcon, Link2, XCircle, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TicketFaqDialog from "./TicketFaqDialog";
import TicketsWalkthrough from "./TicketsWalkthrough";
import AdminInternalNotesPanel from "./AdminInternalNotesPanel";
import AdminAiInsightsPanel from "./AdminAiInsightsPanel";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UrgencyThresholdsDialog from "./UrgencyThresholdsDialog";

interface Ticket {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  subject: string;
  description: string;
  status: string;
  source: string;
  created_at: string;
  last_user_message_at: string | null;
  needs_staff_attention: boolean;
  human_requested: boolean;
  assigned_to_user_id?: string | null;
  assigned_to_email?: string | null;
  assigned_to_name?: string | null;
  assignment_level?: string | null;
}

interface AssignableUser {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
}

interface EscalationSettings {
  response_urgent_min: number;
  response_critical_min: number;
  response_imminent_min: number;
  response_catastrophic_min: number;
  age_urgent_min: number;
  age_critical_min: number;
  age_imminent_min: number;
  age_catastrophic_min: number;
}

type Tier = "urgent" | "critical" | "imminent" | "catastrophic";

const TIER_STYLES: Record<Tier, { label: string; cls: string }> = {
  urgent: { label: "Urgent", cls: "bg-amber-300 text-black border-amber-300" },
  critical: { label: "Critical", cls: "bg-orange-400 text-black border-orange-400" },
  imminent: { label: "Imminent", cls: "bg-rose-400 text-black border-rose-400" },
  catastrophic: { label: "Catastrophic", cls: "bg-[hsl(45,55%,72%)] text-black border-[hsl(45,55%,72%)]" },
};

function tierFor(elapsedMin: number, t: { urgent: number; critical: number; imminent: number; catastrophic: number }): Tier | null {
  if (elapsedMin >= t.catastrophic) return "catastrophic";
  if (elapsedMin >= t.imminent) return "imminent";
  if (elapsedMin >= t.critical) return "critical";
  if (elapsedMin >= t.urgent) return "urgent";
  return null;
}

const TIER_RANK: Record<Tier, number> = { urgent: 1, critical: 2, imminent: 3, catastrophic: 4 };

function maxTier(a: Tier | null, b: Tier | null): Tier | null {
  if (!a) return b;
  if (!b) return a;
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

interface ChatAttachment {
  type: "image" | "file" | "link";
  name: string;
  url: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  staff_name: string | null;
  created_at: string;
  attachments?: ChatAttachment[] | null;
}

interface ChatSession {
  id: string;
  status: string;
  ai_enabled: boolean;
  human_requested: boolean;
}

const statusColors: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  closed: "bg-red-500/20 text-red-400",
};

const POLL_INTERVAL = 15000;

interface AdminTicketsProps {
  onOpenKb?: () => void;
}

const AdminTickets = ({ onOpenKb }: AdminTicketsProps = {}) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "website" | "in-app">("all");
  const [urgencyOpen, setUrgencyOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqUnreadCount, setFaqUnreadCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "closed">("all");
  const [escalation, setEscalation] = useState<EscalationSettings | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const { user, session, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Chat view state
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);
  const [pendingReplyAttachments, setPendingReplyAttachments] = useState<ChatAttachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploadingReply, setUploadingReply] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const replyImageInputRef = useRef<HTMLInputElement>(null);
  const chatPollRef = useRef<NodeJS.Timeout | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Walkthrough state
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  // Assignment state
  const [supervisors, setSupervisors] = useState<AssignableUser[]>([]);
  const [admins, setAdmins] = useState<AssignableUser[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const loadAssignees = async () => {
    try {
      const res = await adminApi.getSupervisors();
      setSupervisors(res?.supervisors || []);
      setAdmins(res?.admins || []);
    } catch (e) {
      console.error("getSupervisors failed", e);
    }
  };

  const handleAssign = async (assigneeUserId: string, level: "supervisor" | "admin") => {
    if (!viewingTicket) return;
    setAssigning(true);
    try {
      await adminApi.assignTicket(viewingTicket.id, assigneeUserId, level);
      const target = [...supervisors, ...admins].find((u) => u.user_id === assigneeUserId);
      toast({
        title: level === "admin" ? "Escalated to admin" : "Assigned to supervisor",
        description: target ? `${target.full_name || target.email} will be notified by email and SMS.` : "Notified by email and SMS.",
      });
      setViewingTicket((prev) =>
        prev
          ? {
              ...prev,
              assigned_to_user_id: assigneeUserId,
              assigned_to_email: target?.email || null,
              assigned_to_name: target?.full_name || target?.email || null,
              assignment_level: level,
            }
          : prev
      );
      setAssignOpen(false);
      fetchData(false);
    } catch (e: any) {
      toast({ title: "Assignment failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  // Demo ticket used during the walkthrough
  const DEMO_TICKET: Ticket = {
    id: "demo0000-0000-0000-0000-demoticket01",
    first_name: "Demo",
    last_name: "Customer",
    email: "demo@rideforti.com",
    phone: "(555) 010-0199",
    subject: "Driver concern — walkthrough demo",
    description: "Demo ticket for the walkthrough tour.",
    status: "open",
    source: "website",
    created_at: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
    last_user_message_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    needs_staff_attention: true,
    human_requested: true,
  };
  const isDemoTicket = (t: Ticket | null) => !!t && t.id === DEMO_TICKET.id;

  const fetchData = async (showLoading = true) => {
    if (!session) return;
    if (showLoading) setLoading(true);
    try {
      const res = await adminApi.getSupportTickets();
      const data = res?.data ?? res;
      setTickets(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("getSupportTickets error:", e);
      toast({
        title: "Failed to load tickets",
        description: e?.message || String(e),
        variant: "destructive",
      });
    }
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      setLoading(false);
      return;
    }

    fetchData();
    pollRef.current = setInterval(() => fetchData(false), POLL_INTERVAL);
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("support_escalation_settings")
        .select("response_urgent_min, response_critical_min, response_imminent_min, response_catastrophic_min, age_urgent_min, age_critical_min, age_imminent_min, age_catastrophic_min")
        .limit(1)
        .maybeSingle();
      if (data) setEscalation(data as EscalationSettings);
    })();
    loadAssignees();
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(tick);
    };
  }, [authLoading, session]);

  const ticketTier = (t: Ticket): Tier | null => {
    if (!escalation || t.status === "closed") return null;
    const ageMin = (now - new Date(t.created_at).getTime()) / 60000;
    const respMin = (now - new Date(t.last_user_message_at ?? t.created_at).getTime()) / 60000;
    const ageT = tierFor(ageMin, {
      urgent: escalation.age_urgent_min,
      critical: escalation.age_critical_min,
      imminent: escalation.age_imminent_min,
      catastrophic: escalation.age_catastrophic_min,
    });
    const respT = tierFor(respMin, {
      urgent: escalation.response_urgent_min,
      critical: escalation.response_critical_min,
      imminent: escalation.response_imminent_min,
      catastrophic: escalation.response_catastrophic_min,
    });
    return maxTier(ageT, respT);
  };

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Poll for new messages when viewing a ticket
  useEffect(() => {
    if (!viewingTicket || !chatSession || isDemoTicket(viewingTicket)) {
      if (chatPollRef.current) clearInterval(chatPollRef.current);
      return;
    }

    const pollChat = async () => {
      try {
        const { session, messages } = await adminApi.getTicketChat(viewingTicket.email);
        if (session) {
          setChatSession(session);
          setChatMessages(messages || []);
        }
      } catch (e) {
        console.error("Poll chat error:", e);
      }
    };

    chatPollRef.current = setInterval(pollChat, 5000);
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); };
  }, [viewingTicket, chatSession]);

  // Poll FAQ unread count for the open ticket (answers to me + pending assigned to me)
  useEffect(() => {
    if (!viewingTicket?.id || !user || isDemoTicket(viewingTicket)) {
      setFaqUnreadCount(0);
      return;
    }
    const fetchCount = async () => {
      try {
        if (!viewingTicket?.id) return;
        const { data: { session: s } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-faq?action=list-by-ticket`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${s?.access_token ?? ""}` },
          body: JSON.stringify({ ticket_id: viewingTicket.id }),
        });
        const json = await res.json();
        if (!res.ok) return;
        const qs = (json.questions || []) as any[];
        const unread = qs.filter((q) =>
          (q.assigned_to === user.id && q.status === "pending") ||
          (q.submitted_by === user.id && q.status === "answered" && !q.read_at)
        ).length;
        setFaqUnreadCount(unread);
      } catch {}
    };
    fetchCount();
    const i = setInterval(fetchCount, 30000);
    return () => clearInterval(i);
  }, [viewingTicket, user, faqOpen]);

  const openTicketChat = async (ticket: Ticket) => {
    setViewingTicket(ticket);
    if (isDemoTicket(ticket)) {
      // Mock a demo conversation — no API call
      const mins = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();
      setChatSession({ id: "demo-session", status: "open", ai_enabled: true, human_requested: true });
      setChatMessages([
        { id: "d1", role: "user", content: "Hi — I had a concern about my last driver.", staff_name: null, created_at: mins(45) },
        { id: "d2", role: "assistant", content: "I'm sorry to hear that. Can you share what happened so I can help?", staff_name: null, created_at: mins(44) },
        { id: "d3", role: "user", content: "He took a long detour and I want a real person to look at this.", staff_name: null, created_at: mins(18) },
      ]);
      setChatLoading(false);
      return;
    }
    setChatLoading(true);
    try {
      const { session, messages } = await adminApi.getTicketChat(ticket.email);
      setChatSession(session || null);
      setChatMessages(messages || []);
    } catch (e) {
      console.error("Failed to load chat:", e);
      setChatSession(null);
      setChatMessages([]);
    }
    setChatLoading(false);
  };

  const handleStaffReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!replyText.trim() && pendingReplyAttachments.length === 0) || replying || !viewingTicket) return;
    setReplying(true);
    try {
      const staffName = (user?.user_metadata?.full_name as string)?.split(" ")[0]
        || user?.email?.split("@")[0]
        || "Support Agent";
      const atts = [...pendingReplyAttachments];
      await adminApi.staffReply(viewingTicket.id, replyText.trim(), staffName, atts);
      setReplyText("");
      setPendingReplyAttachments([]);
      // Refresh chat
      const { session, messages } = await adminApi.getTicketChat(viewingTicket.email);
      if (session) {
        setChatSession(session);
        setChatMessages(messages || []);
      }
    } catch (err) {
      console.error("Reply failed:", err);
      toast({ title: "Reply failed", variant: "destructive" });
    }
    setReplying(false);
  };

  const handleStaffFileUpload = async (files: FileList | null, isImage: boolean) => {
    if (!files || files.length === 0 || !chatSession) return;
    setUploadingReply(true);
    setShowAttachMenu(false);
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum 10MB.", variant: "destructive" });
        continue;
      }
      const ext = file.name.split(".").pop() || "bin";
      const filePath = `${chatSession.id}/staff/${crypto.randomUUID()}.${ext}`;
      try {
        const { error } = await supabase.storage.from("support-chat-attachments").upload(filePath, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("support-chat-attachments").getPublicUrl(filePath);
        const type: ChatAttachment["type"] = isImage || file.type.startsWith("image/") ? "image" : "file";
        setPendingReplyAttachments(prev => [...prev, { type, name: file.name, url: urlData.publicUrl }]);
      } catch (err) {
        console.error("Upload error:", err);
        toast({ title: "Upload failed", description: file.name, variant: "destructive" });
      }
    }
    setUploadingReply(false);
  };

  const handleAddReplyLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    const formatted = url.startsWith("http") ? url : `https://${url}`;
    setPendingReplyAttachments(prev => [...prev, { type: "link", name: formatted, url: formatted }]);
    setLinkInput("");
    setShowLinkInput(false);
  };

  const handleToggleAi = async () => {
    if (!chatSession || togglingAi) return;
    setTogglingAi(true);
    try {
      const newState = !chatSession.ai_enabled;
      await adminApi.toggleAi(chatSession.id, newState);
      setChatSession(prev => prev ? { ...prev, ai_enabled: newState } : null);
      toast({ title: `AI ${newState ? "enabled" : "disabled"}` });
    } catch (e) {
      toast({ title: "Failed to toggle AI", variant: "destructive" });
    }
    setTogglingAi(false);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await adminApi.updateTicketStatus(ticketId, newStatus);
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      if (viewingTicket?.id === ticketId) {
        setViewingTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const closeTicketView = () => {
    setViewingTicket(null);
    setChatSession(null);
    setChatMessages([]);
    setReplyText("");
    if (chatPollRef.current) clearInterval(chatPollRef.current);
  };

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase().trim();
    const qNum = q.replace(/^#/, "");
    const ticketNum = t.id.replace(/-/g, "").slice(0, 8).toLowerCase();
    const matchesSearch =
      q === "" ||
      t.subject.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) ||
      (qNum.length > 0 && ticketNum.includes(qNum));
    const matchesSource = sourceFilter === "all" || t.source === sourceFilter;
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesSource && matchesStatus;
  });

  const humanRequestedCount = tickets.filter(t => t.human_requested && t.status !== "closed").length;
  const attentionCount = tickets.filter(t => t.needs_staff_attention && !t.human_requested && t.status !== "closed").length;

  // ===== CHAT VIEW =====
  if (viewingTicket) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-tour="ticket-detail-header">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{viewingTicket.id.slice(0, 8).toUpperCase()}</span>
                <h3 className="font-semibold">{viewingTicket.first_name} {viewingTicket.last_name}</h3>
              </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <a href={`mailto:${viewingTicket.email}`} className="text-sm text-white font-semibold bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md border border-white/20 transition-colors">
                {viewingTicket.email}
              </a>
              <a href={`tel:${viewingTicket.phone}`} className="text-sm text-white font-semibold bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md border border-white/20 transition-colors">
                {viewingTicket.phone}
              </a>
            </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {/* Assign button */}
            <Popover open={assignOpen} onOpenChange={setAssignOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="fortiGhost"
                  size="sm"
                  title={viewingTicket.assigned_to_name ? `Assigned to ${viewingTicket.assigned_to_name}` : "Assign ticket"}
                  className={viewingTicket.assigned_to_user_id ? "text-emerald-400" : "text-sky-400"}
                  data-tour="ticket-detail-assign"
                  disabled={isDemoTicket(viewingTicket)}
                >
                  {viewingTicket.assignment_level === "admin" ? <ChevronUp className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  <span className="ml-1 text-xs">
                    {viewingTicket.assigned_to_user_id
                      ? viewingTicket.assignment_level === "admin"
                        ? "Escalated"
                        : "Assigned"
                      : "Assign"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="end">
                {viewingTicket.assigned_to_name && (
                  <div className="text-xs text-muted-foreground px-2 py-1.5 border-b border-border mb-1">
                    Currently {viewingTicket.assignment_level === "admin" ? "escalated" : "assigned"} to{" "}
                    <span className="text-foreground font-medium">{viewingTicket.assigned_to_name}</span>
                  </div>
                )}
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                  {isAdmin ? "Assign to Supervisor" : "Reassign to Admin"}
                </div>
                {!isAdmin ? (
                  admins.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-2">No admins available.</p>
                  ) : (
                    admins.map((a) => {
                      const name = a.full_name && a.full_name.trim() && a.full_name.trim().toLowerCase() !== a.email.toLowerCase() ? a.full_name.trim() : null;
                      return (
                        <button
                          key={a.user_id}
                          disabled={assigning}
                          onClick={() => handleAssign(a.user_id, "admin")}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex flex-col disabled:opacity-50"
                        >
                          {name && <span className="font-medium">{name}</span>}
                          <span className={name ? "text-[10px] text-muted-foreground" : "font-medium"}>{a.email}</span>
                        </button>
                      );
                    })
                  )
                ) : supervisors.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-2">
                    No supervisors yet. Tag users as supervisors in the Users module.
                  </p>
                ) : (
                  supervisors.map((s) => {
                    const name = s.full_name && s.full_name.trim() && s.full_name.trim().toLowerCase() !== s.email.toLowerCase() ? s.full_name.trim() : null;
                    return (
                      <button
                        key={s.user_id}
                        disabled={assigning}
                        onClick={() => handleAssign(s.user_id, "supervisor")}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex flex-col disabled:opacity-50"
                      >
                        {name && <span className="font-medium">{name}</span>}
                        <span className={name ? "text-[10px] text-muted-foreground" : "font-medium"}>{s.email}</span>
                      </button>
                    );
                  })
                )}
                {isAdmin && admins.length > 0 && (
                  <>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 mt-1 border-t border-border">
                      Escalate to Admin
                    </div>
                    {admins.map((a) => {
                      const name = a.full_name && a.full_name.trim() && a.full_name.trim().toLowerCase() !== a.email.toLowerCase() ? a.full_name.trim() : null;
                      return (
                        <button
                          key={a.user_id}
                          disabled={assigning}
                          onClick={() => handleAssign(a.user_id, "admin")}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex flex-col disabled:opacity-50"
                        >
                          {name && <span className="font-medium">{name}</span>}
                          <span className={name ? "text-[10px] text-muted-foreground" : "font-medium"}>{a.email}</span>
                        </button>
                      );
                    })}
                  </>
                )}
              </PopoverContent>
            </Popover>
            {/* Internal Notes button */}
            <Button
              variant="fortiGhost"
              size="sm"
              onClick={() => setNotesOpen(true)}
              title="Internal notes"
              className="text-blue-300"
            >
              <StickyNote className="h-4 w-4" />
              <span className="ml-1 text-xs">Notes</span>
            </Button>
            {/* AI Insights button */}
            <Button
              variant="fortiGhost"
              size="sm"
              onClick={() => setInsightsOpen(true)}
              title="AI insights for this conversation"
              className="text-purple-400"
            >
              <Sparkles className="h-4 w-4" />
              <span className="ml-1 text-xs">Insights</span>
            </Button>
            {/* FAQ button */}
            <Button
              variant="fortiGhost"
              size="sm"
              onClick={() => setFaqOpen(true)}
              title="Submit FAQ question"
              className="relative text-amber-400"
              data-tour="ticket-detail-faq"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="ml-1 text-xs">FAQ</span>
              {faqUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {faqUnreadCount}
                </span>
              )}
            </Button>
            {/* AI Toggle */}
            {chatSession && chatSession.status !== "closed" && (
              <Button
                variant="fortiGhost"
                size="sm"
                onClick={handleToggleAi}
                disabled={togglingAi}
                title={chatSession.ai_enabled ? "Disable AI Bot" : "Enable AI Bot"}
                className={chatSession.ai_enabled ? "text-green-400" : "text-muted-foreground"}
                data-tour="ticket-detail-ai-toggle"
              >
                {chatSession.ai_enabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                <span className="ml-1 text-xs">{chatSession.ai_enabled ? "AI On" : "AI Off"}</span>
              </Button>
            )}
            {/* Status */}
            <Select
              value={viewingTicket.status}
              onValueChange={(val) => handleStatusChange(viewingTicket.id, val)}
            >
              <SelectTrigger className={`w-[130px] h-7 text-xs border-0 ${statusColors[viewingTicket.status] || ""}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ticket info */}
        {(() => {
          const fmtDuration = (ms: number) => {
            if (ms < 0 || !isFinite(ms)) return "—";
            const totalMin = Math.floor(ms / 60000);
            const d = Math.floor(totalMin / 1440);
            const h = Math.floor((totalMin % 1440) / 60);
            const m = totalMin % 60;
            return `${d}d ${h}h ${m}m`;
          };
          const lastResponse = [...chatMessages]
            .reverse()
            .find((msg) => msg.role === "assistant" || msg.role === "staff");
          const lastResponseAt = lastResponse?.created_at ?? null;
          const openMs = now - new Date(viewingTicket.created_at).getTime();
          const sinceResponseMs = lastResponseAt
            ? now - new Date(lastResponseAt).getTime()
            : openMs;

          // Determine response tier for visual cue
          const respMin = Math.floor(sinceResponseMs / 60000);
          const respTier = escalation
            ? tierFor(respMin, {
                urgent: escalation.response_urgent_min,
                critical: escalation.response_critical_min,
                imminent: escalation.response_imminent_min,
                catastrophic: escalation.response_catastrophic_min,
              })
            : null;
          const ageMin = Math.floor(openMs / 60000);
          const ageTier = escalation
            ? tierFor(ageMin, {
                urgent: escalation.age_urgent_min,
                critical: escalation.age_critical_min,
                imminent: escalation.age_imminent_min,
                catastrophic: escalation.age_catastrophic_min,
              })
            : null;

          return (
            <div className="text-sm p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <p>
                <span className="text-muted-foreground">Subject:</span> {viewingTicket.subject}
              </p>
              <div className="flex flex-wrap gap-2 text-xs" data-tour="ticket-detail-timers">
                <span
                  className={`px-2 py-1 rounded-md border ${
                    ageTier ? TIER_STYLES[ageTier].cls : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  Open for: {fmtDuration(openMs)}
                </span>
                <span
                  className={`px-2 py-1 rounded-md border ${
                    respTier ? TIER_STYLES[respTier].cls : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {lastResponseAt ? "Since last response: " : "No response yet — waiting: "}
                  {fmtDuration(sinceResponseMs)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Source: {viewingTicket.source === "in-app" ? "In-App" : "Website"} • Created:{" "}
                {new Date(viewingTicket.created_at).toLocaleString()}
              </p>
            </div>
          );
        })()}

        {/* Chat thread */}
        <div className="border border-border rounded-lg overflow-hidden" style={{ height: "400px" }}>
          {chatLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" />
            </div>
          ) : !chatSession ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No chat session found for this ticket.
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
                <div className="space-y-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No messages yet.</p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role !== "user" && (
                          <div className="flex-shrink-0 mr-2 mt-1">
                            {msg.role === "staff" ? (
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                <UserCircle className="h-3.5 w-3.5 text-primary-foreground" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex flex-col max-w-[75%]">
                          {msg.role !== "user" && (
                            <span className="text-[10px] text-muted-foreground mb-0.5 ml-1">
                              {msg.role === "staff" ? (msg.staff_name || "Staff") : "AI Bot"}
                              <span className="ml-2">{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </span>
                          )}
                          <div
                            className={`px-3 py-2 rounded-2xl text-sm ${
                              msg.role === "user"
                                ? "bg-[#007AFF] text-white rounded-br-md"
                                : msg.role === "staff"
                                ? "bg-primary/20 text-foreground rounded-bl-md"
                                : "bg-muted text-foreground rounded-bl-md"
                            }`}
                          >
                            {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                              <div className="mt-1 space-y-1">
                                {msg.attachments.map((att, ai) => (
                                  <div key={ai}>
                                    {att.type === "image" ? (
                                      <a href={att.url} target="_blank" rel="noopener noreferrer">
                                        <img src={att.url} alt={att.name} className="max-w-[220px] max-h-[160px] rounded-lg mt-1 object-cover" />
                                      </a>
                                    ) : att.type === "link" ? (
                                      <a href={att.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 underline text-xs ${msg.role === "user" ? "text-blue-100" : "text-primary"}`}>
                                        <Link2 className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{att.name}</span>
                                      </a>
                                    ) : (
                                      <a href={att.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 underline text-xs ${msg.role === "user" ? "text-blue-100" : "text-primary"}`}>
                                        <Paperclip className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{att.name}</span>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {msg.role === "user" && (
                            <span className="text-[10px] text-muted-foreground mt-0.5 mr-1 text-right">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Staff reply input */}
              {chatSession.status !== "closed" && (
                <div className="border-t border-border p-3 space-y-2" data-tour="ticket-detail-reply">
                  {/* Pending attachments preview */}
                  {pendingReplyAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {pendingReplyAttachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-lg text-xs">
                          {att.type === "image" ? <ImageIcon className="h-3 w-3" /> : att.type === "link" ? <Link2 className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                          <span className="truncate max-w-[140px]">{att.name}</span>
                          <button type="button" onClick={() => setPendingReplyAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">
                            <XCircle className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Link input */}
                  {showLinkInput && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paste a URL"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddReplyLink(); } }}
                        className="flex-1 h-9"
                      />
                      <Button type="button" size="sm" variant="outline" onClick={handleAddReplyLink}>Add</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setShowLinkInput(false); setLinkInput(""); }}>Cancel</Button>
                    </div>
                  )}
                  <form onSubmit={handleStaffReply} className="flex gap-2 items-center">
                    <input ref={replyImageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleStaffFileUpload(e.target.files, true); e.target.value = ""; }} />
                    <input ref={replyFileInputRef} type="file" multiple className="hidden" onChange={(e) => { handleStaffFileUpload(e.target.files, false); e.target.value = ""; }} />
                    <Popover open={showAttachMenu} onOpenChange={setShowAttachMenu}>
                      <PopoverTrigger asChild>
                        <Button type="button" size="icon" variant="ghost" disabled={uploadingReply} title="Attach">
                          {uploadingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-44 p-1" align="start">
                        <button type="button" onClick={() => { replyImageInputRef.current?.click(); }} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded">
                          <ImageIcon className="h-4 w-4" /> Image
                        </button>
                        <button type="button" onClick={() => { replyFileInputRef.current?.click(); }} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded">
                          <Paperclip className="h-4 w-4" /> File
                        </button>
                        <button type="button" onClick={() => { setShowAttachMenu(false); setShowLinkInput(true); }} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded">
                          <Link2 className="h-4 w-4" /> Link
                        </button>
                      </PopoverContent>
                    </Popover>
                    <Input
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={(!replyText.trim() && pendingReplyAttachments.length === 0) || replying}
                      variant="forti"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {replying ? "..." : "Send"}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
        {user && (
          <TicketFaqDialog
            open={faqOpen}
            onOpenChange={(v) => { setFaqOpen(v); if (!v) setFaqUnreadCount(0); }}
            ticketId={viewingTicket.id}
            ticketNumber={viewingTicket.id.slice(0, 8).toUpperCase()}
            currentUserId={user.id}
          />
        )}
        <TicketsWalkthrough
          open={walkthroughOpen}
          onClose={() => setWalkthroughOpen(false)}
          onOpenDemoTicket={() => {
            if (!isDemoTicket(viewingTicket)) openTicketChat(DEMO_TICKET);
          }}
          onCloseDemoTicket={() => {
            if (isDemoTicket(viewingTicket)) closeTicketView();
          }}
          isViewingDemo={isDemoTicket(viewingTicket)}
        />
        <AdminInternalNotesPanel
          open={notesOpen}
          onOpenChange={setNotesOpen}
          ticketId={viewingTicket.id}
          ticketLabel={`#${viewingTicket.id.slice(0, 8).toUpperCase()} — ${viewingTicket.first_name} ${viewingTicket.last_name}`}
        />
        <AdminAiInsightsPanel
          open={insightsOpen}
          onOpenChange={setInsightsOpen}
          ticketId={viewingTicket.id}
          ticketLabel={`#${viewingTicket.id.slice(0, 8).toUpperCase()} — ${viewingTicket.first_name} ${viewingTicket.last_name}`}
        />
      </div>
    );
  }

  // ===== TICKET LIST VIEW =====
  return (
    <div className="space-y-4">
      {(humanRequestedCount > 0 || attentionCount > 0) && (
        <div className="flex gap-3">
          {humanRequestedCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/30 animate-pulse">
              <User className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">
                {humanRequestedCount} ticket{humanRequestedCount > 1 ? "s" : ""} — Human Agent Needed
              </span>
            </div>
          )}
          {attentionCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/15 border border-orange-500/30">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-medium text-orange-400">
                {attentionCount} ticket{attentionCount > 1 ? "s" : ""} need{attentionCount === 1 ? "s" : ""} attention
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="forti"
            size="sm"
            onClick={() => {
              if (onOpenKb) onOpenKb();
              else window.dispatchEvent(new CustomEvent("forti:open-support-kb"));
            }}
            className="gap-2 shadow-md"
            data-tour="tickets-ai-kb"
          >
            <Bot className="h-4 w-4" />
            AI Knowledge Base
          </Button>
          <Button
            variant="forti"
            size="sm"
            onClick={() => setWalkthroughOpen(true)}
            className="gap-2 shadow-md"
            data-tour="tickets-walkthrough"
          >
            <PlayCircle className="h-4 w-4" />
            Walkthrough
          </Button>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm" data-tour="tickets-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            {(["all", "open", "in_progress", "closed"] as const).map((s) => {
              const activeCls: Record<typeof s, string> = {
                all: "bg-foreground text-background",
                open: "bg-blue-500/20 text-blue-300 border-l border-blue-500/40",
                in_progress: "bg-blue-500/20 text-blue-300 border-l border-blue-500/40",
                closed: "bg-red-500/20 text-red-300 border-l border-red-500/40",
              };
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === s ? activeCls[s] : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              );
            })}
          </div>
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            {(["all", "website", "in-app"] as const).map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  sourceFilter === src ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {src === "all" ? "All" : src === "website" ? "Website" : "In-App"}
              </button>
            ))}
          </div>
          
          <Button
            size="sm"
            onClick={() => setUrgencyOpen(true)}
            className="bg-white text-black border border-white hover:bg-white/90 hover:text-black"
            data-tour="tickets-urgency"
          >
            <Timer className="h-4 w-4 mr-1.5" />
            Urgency
          </Button>
          <Button variant="fortiGhost" size="sm" onClick={() => fetchData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <UrgencyThresholdsDialog open={urgencyOpen} onOpenChange={setUrgencyOpen} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {(() => {
            const list = walkthroughOpen ? [DEMO_TICKET, ...filtered] : filtered;
            if (list.length === 0) {
              return <p className="text-center text-muted-foreground py-8">No tickets found.</p>;
            }
            return list.map((ticket) => {
              const isDemo = ticket.id === DEMO_TICKET.id;
              return (
                <button
                  key={ticket.id}
                  onClick={() => openTicketChat(ticket)}
                  data-tour={isDemo ? "tickets-demo-row" : undefined}
                  className={`w-full text-left rounded-lg border border-border p-4 hover:border-foreground/30 transition-all ${
                    ticket.human_requested && ticket.status !== "closed"
                      ? "animate-pulse bg-red-500/5 border-red-500/30"
                      : ticket.needs_staff_attention && ticket.status !== "closed"
                      ? "bg-orange-500/5 border-orange-500/30"
                      : "bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {ticket.human_requested && ticket.status !== "closed" ? (
                        <span className="relative flex h-3 w-3 mt-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      ) : ticket.needs_staff_attention && ticket.status !== "closed" ? (
                        <span className="relative flex h-3 w-3 mt-1">
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                        </span>
                      ) : (
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30">#{ticket.id.slice(0, 8).toUpperCase()}</span>
                          <span className="font-medium">{ticket.first_name} {ticket.last_name}</span>
                          {ticket.status === "open" && !ticket.assigned_to_user_id && (
                            <span className="relative inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              <span className="absolute inset-0 rounded animate-ping bg-emerald-500/30" />
                              <span className="relative">New</span>
                            </span>
                          )}
                          {isDemo && (
                            <span className="relative inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider bg-primary/20 text-primary border border-primary/40">
                              <span className="absolute inset-0 rounded animate-ping bg-primary/30" />
                              <span className="relative">Demo</span>
                            </span>
                          )}
                          {ticket.human_requested && ticket.status !== "closed" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold uppercase tracking-wider">
                              Human Needed
                            </span>
                          )}
                          {(() => {
                            const tier = ticketTier(ticket);
                            if (!tier) return null;
                            const s = TIER_STYLES[tier];
                            return (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider ${s.cls}`}>
                                {s.label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-sm text-muted-foreground">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">{ticket.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[ticket.status] || ""}`}>
                        {ticket.status === "in_progress" ? "In Progress" : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ticket.source === "in-app" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {ticket.source === "in-app" ? "In-App" : "Website"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </button>
              );
            });
          })()}
        </div>
      )}

      <TicketsWalkthrough
        open={walkthroughOpen}
        onClose={() => setWalkthroughOpen(false)}
        onOpenDemoTicket={() => {
          if (!isDemoTicket(viewingTicket)) openTicketChat(DEMO_TICKET);
        }}
        onCloseDemoTicket={() => {
          if (isDemoTicket(viewingTicket)) closeTicketView();
        }}
        isViewingDemo={isDemoTicket(viewingTicket)}
      />
    </div>
  );
};

export default AdminTickets;
