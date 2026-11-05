import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Link2, Bot, ExternalLink, ClipboardList, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";


const AdminWaitlist = lazy(() => import("@/components/admin/AdminWaitlist"));
const AdminTickets = lazy(() => import("@/components/admin/AdminTickets"));

const AdminUsers = lazy(() => import("@/components/admin/AdminUsers"));
const AdminKnowledge = lazy(() => import("@/components/admin/AdminKnowledge"));
const AdminContent = lazy(() => import("@/components/admin/AdminContent"));
const EventCalendar = lazy(() => import("@/components/admin/EventCalendar"));
const OkrTracker = lazy(() => import("@/components/admin/OkrTracker"));
const AdminDownloadTracker = lazy(() => import("@/components/admin/AdminDownloadTracker"));
const AdminOutboundCallTracker = lazy(() => import("@/components/admin/AdminOutboundCallTracker"));
const AmbassadorLearningCenter = lazy(() => import("@/components/admin/content/AmbassadorLearningCenter"));
const OpsLearningCenter = lazy(() => import("@/components/admin/content/OpsLearningCenter"));
const SupportLearningCenter = lazy(() => import("@/components/admin/content/SupportLearningCenter"));
const DevelopmentLearningCenter = lazy(() => import("@/components/admin/content/DevelopmentLearningCenter"));
const AdminSupportKnowledge = lazy(() => import("@/components/admin/AdminSupportKnowledge"));
const AdminAccountLedger = lazy(() => import("@/components/admin/AdminAccountLedger"));
const TeamIdeas = lazy(() => import("@/components/admin/TeamIdeas"));
import { Input } from "@/components/ui/input";
import { useBackNav } from "@/contexts/BackNavContext";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  type: "link" | "video" | "document" | "note";
  isModule?: boolean;
  moduleKey?: string;
}

interface LearningItemPlaceholder {}


interface LearningItem {
  id: string;
  title: string;
  description: string;
  url?: string;
}

// Placeholder data per department — in a real setup this would come from the DB
const DEPT_DATA: Record<string, {
  learning: LearningItem[];
  resources: ResourceItem[];
  gptPrompt: string;
}> = {
  support: {
    learning: [
      { id: "s1", title: "Support Chat System Overview", description: "How the AI support chat and ticket system works." },
      { id: "s2", title: "Handling Escalations", description: "When and how to escalate tickets to human agents." },
      { id: "s3", title: "Knowledge Base Management", description: "Updating FAQs and knowledge articles for AI accuracy." },
    ],
    resources: [
      { id: "sr0", title: "Support Tickets", description: "Review and respond to support requests.", type: "link", isModule: true, moduleKey: "tickets" },
      { id: "srokr", title: "OKRs & Projects", description: "Objectives → Projects → Tasks. Manage everything in one place.", type: "link", isModule: true, moduleKey: "okr" },
    ],
    gptPrompt: "You are a Forti support operations assistant. Help with ticket management, customer communication templates, escalation procedures, and support best practices for a luxury rideshare and personal protection platform.",
  },
  admin: {
    learning: [
      { id: "a1", title: "Admin Dashboard Guide", description: "Navigating the admin panel and its modules." },
      { id: "a2", title: "User Management & Permissions", description: "Creating users, assigning roles, and module permissions." },
      { id: "a3", title: "Security & 2FA Setup", description: "Understanding the 2FA login flow and trusted devices." },
    ],
    resources: [
      { id: "ar0", title: "User Management", description: "Create users and manage permissions.", type: "link", isModule: true, moduleKey: "users" },
      { id: "ark", title: "Knowledge Center", description: "Manage Forti's source of truth.", type: "link", isModule: true, moduleKey: "knowledge" },
      { id: "arokr", title: "OKR Tracker", description: "Track goals, projects, and tasks with reminders.", type: "link", isModule: true, moduleKey: "okr" },
      { id: "arledger", title: "Account Ledger", description: "Shared platform credentials and monthly costs.", type: "link", isModule: true, moduleKey: "account-ledger" },
    ],
    gptPrompt: "You are a Forti admin operations assistant. Help with user management, permissions, security policies, admin dashboard operations, and internal processes for a luxury rideshare platform.",
  },
  development: {
    learning: [
      { id: "d1", title: "Tech Stack Overview", description: "React, Vite, Tailwind CSS, TypeScript, and Supabase architecture." },
      { id: "d2", title: "Edge Functions Guide", description: "How backend functions are structured and deployed." },
      { id: "d3", title: "Database Schema", description: "Understanding the database tables and relationships." },
    ],
    resources: [
      { id: "drokr", title: "OKRs & Projects", description: "Objectives → Projects → Tasks. Manage everything in one place.", type: "link", isModule: true, moduleKey: "okr" },
      
      
    ],
    gptPrompt: "You are a Forti development assistant. Help with React/TypeScript code, Supabase Edge Functions, database queries, component architecture, and technical debugging for a luxury rideshare and personal protection platform.",
  },
  marketing: {
    learning: [
      { id: "m1", title: "Content SOP", description: "The full content operations standard operating procedure." },
      { id: "m2", title: "Brand Guidelines", description: "Forti's visual identity, tone, and messaging standards." },
      { id: "m3", title: "Social Media Algorithm Strategy", description: "How to work with IG/FB algorithms through volume posting." },
    ],
    resources: [
      { id: "mr0", title: "Waitlist Management", description: "View and manage waitlist signups.", type: "link", isModule: true, moduleKey: "waitlist" },
      
      { id: "mrokr", title: "OKRs & Projects", description: "Objectives → Projects → Tasks. Manage everything in one place.", type: "link", isModule: true, moduleKey: "okr" },
      
      
      
    ],
    gptPrompt: "You are a Forti marketing and content assistant. Help with social media captions, content ideas, hashtag strategies, campaign concepts, and brand messaging for a luxury rideshare, concierge, and personal protection platform. Forti posts 10 pieces of content per day across 10 categories: Informational, Armed Vehicles, Humor, Stills, Entertainment, News, Protection Tips, Industry, Custom Content, and Text-Based.",
  },
  ops: {
    learning: [
      { id: "o1", title: "Operations Overview", description: "How Forti's day-to-day operations are structured." },
      { id: "o2", title: "Fleet & Driver Management", description: "Managing driver onboarding, vehicles, and guard assignments." },
      { id: "o3", title: "Service Level Standards", description: "Quality standards for the luxury rideshare experience." },
    ],
    resources: [
      { id: "orokr", title: "OKRs & Projects", description: "Objectives → Projects → Tasks. Manage everything in one place.", type: "link", isModule: true, moduleKey: "okr" },
      { id: "orc", title: "Event Calendar", description: "Track events, meetings, and deadlines.", type: "link", isModule: true, moduleKey: "calendar" },
      { id: "orideas", title: "Team Ideas", description: "Submit ideas — admins and supervisors review and decide.", type: "link", isModule: true, moduleKey: "team-ideas" },
    ],
    gptPrompt: "You are a Forti operations assistant. Help with logistics, fleet management, driver and guard onboarding, service quality standards, and operational processes for a luxury rideshare and personal protection platform.",
  },
  sales: {
    learning: [
      { id: "sl1", title: "Sales Playbook", description: "Core sales methodology, pitch decks, and closing strategies for Forti's services." },
      { id: "sl2", title: "Lead Qualification Framework", description: "How to identify and qualify high-value prospects for luxury rideshare and protection services." },
      { id: "sl3", title: "Client Onboarding Process", description: "Steps for onboarding new enterprise and individual clients." },
    ],
    resources: [
      { id: "slr0", title: "OKRs & Projects", description: "Objectives → Projects → Tasks. Manage everything in one place.", type: "link", isModule: true, moduleKey: "okr" },
      { id: "slr1", title: "Download Tracker", description: "Track total app downloads per brand ambassador with date range filters.", type: "link", isModule: true, moduleKey: "download-tracker" },
      { id: "slr2", title: "Outbound Call Tracker", description: "Upload contact lists, log call outcomes, and see who booked rides per agent.", type: "link", isModule: true, moduleKey: "outbound-call-tracker" },
    ],
    gptPrompt: "You are a Forti sales assistant. Help with lead qualification, proposal writing, objection handling, pricing strategy, client outreach scripts, and enterprise sales tactics for a luxury rideshare, concierge, and personal protection platform.",
  },
};

const SECTION_CONFIG = {
  learning: { icon: BookOpen, title: "Learning Zone", description: "Training materials and guides for this department." },
  resources: { icon: Link2, title: "Resources", description: "Quick links, documents, and reference materials." },
  gpt: { icon: Bot, title: "GPT Assistant", description: "AI-powered assistant tailored to this department." },
};

interface Props {
  department: string;
  departmentLabel?: string;
  section?: "resources" | "gpt" | "learning_center";
  onBackToDashboard?: () => void;
}

const SectionRenderer = ({ department, section, onBack }: { department: string; section: "learning" | "resources" | "gpt"; onBack?: () => void }) => {
  const data = DEPT_DATA[department] || DEPT_DATA.support;
  const config = SECTION_CONFIG[section];
  const { user, isAdmin } = useAuth();

  const [gptInput, setGptInput] = useState("");
  const [gptMessages, setGptMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [gptLoading, setGptLoading] = useState(false);
  const [activeSubModule, setActiveSubModule] = useState<string | null>(null);
  useBackNav(
    "Back to Resources",
    () => {
      // Clear deep-link params so they don't re-fire next time
      const url = new URL(window.location.href);
      ["module", "event"].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.toString());
      setActiveSubModule(null);
    },
    !!activeSubModule,
  );

  useEffect(() => {
    const handler = () => setActiveSubModule("support-kb");
    window.addEventListener("forti:open-support-kb", handler);
    return () => window.removeEventListener("forti:open-support-kb", handler);
  }, []);

  // Deep-link: open ?module=<key> for this department on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mod = params.get("module");
    if (mod && !activeSubModule) setActiveSubModule(mod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [gptMessages, gptLoading]);

  const sendMessage = async (input: string) => {
    if (!input.trim() || gptLoading) return;
    const userMsg = input.trim();
    const newMessages = [...gptMessages, { role: "user" as const, content: userMsg }];
    setGptMessages(newMessages);
    setGptInput("");
    setGptLoading(true);

    let assistantSoFar = "";
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/department-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          department,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || `Error ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setGptMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setGptMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${err.message || "Failed to get response. Please try again."}` }]);
      }
    }
    abortRef.current = null;
    setGptLoading(false);
  };

  if (section === "gpt") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{config.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{config.description}</p>
        <div className="rounded-lg border border-border bg-card">
          <div className="p-3 border-b border-border bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">System Prompt</p>
            <p className="text-xs text-muted-foreground italic">{data.gptPrompt}</p>
          </div>
          <div className="min-h-[300px] max-h-[400px] overflow-y-auto p-4 space-y-3">
            {gptMessages.length === 0 && (
              <div className="flex items-center justify-center h-[250px]">
                <div className="text-center space-y-2">
                  <Bot className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">Ask anything about {department} operations.</p>
                </div>
              </div>
            )}
            {gptMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {gptLoading && gptMessages[gptMessages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground animate-pulse">Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              placeholder={`Ask about ${department}...`}
              value={gptInput}
              onChange={(e) => setGptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage(gptInput);
              }}
              className="flex-1"
            />
            <Button variant="forti" size="sm" disabled={!gptInput.trim() || gptLoading} onClick={() => sendMessage(gptInput)}>
              Send
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (section === "learning") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{config.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{config.description}</p>
        <div className="space-y-3">
          {data.learning.map((item, i) => (
            <div key={item.id} className="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-black">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              {item.url && (
                <Button variant="fortiGhost" size="sm" onClick={() => window.open(item.url, "_blank")}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeSubModule) {
    // Gate: support tickets requires passing the Support Learning Zone test
    if (activeSubModule === "tickets" && department === "support") {
      const passed = (() => {
        if (isAdmin) return true;
        // Hardcoded bypass for primary admin
        if (user?.email?.toLowerCase() === "tori@rideforti.com") return true;
        if (!user?.id) return false;
        try {
          return localStorage.getItem(`forti_support_test_passed_${user.id}`) === "1";
        } catch {
          return false;
        }
      })();
      if (!passed) {
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-6 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 mx-auto flex items-center justify-center">
                <span className="text-xl">🔒</span>
              </div>
              <h3 className="font-semibold text-base">Ticket dashboard locked</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Complete the Support Learning Zone modules and pass the knowledge test with at least 85% to unlock access to live customer tickets.
              </p>
              <Button variant="forti" size="sm" onClick={() => { setActiveSubModule(null); window.dispatchEvent(new CustomEvent("forti:open-support-learning")); }}>
                Go to Learning Zone
              </Button>
            </div>
          </div>
        );
      }
    }
    const ModuleComponent = activeSubModule === "waitlist" ? AdminWaitlist : activeSubModule === "tickets" ? AdminTickets : activeSubModule === "users" ? AdminUsers : activeSubModule === "knowledge" ? AdminKnowledge : activeSubModule === "support-kb" ? AdminSupportKnowledge : activeSubModule === "content" ? AdminContent : activeSubModule === "calendar" ? EventCalendar : activeSubModule === "okr" ? OkrTracker : activeSubModule === "download-tracker" ? AdminDownloadTracker : activeSubModule === "outbound-call-tracker" ? AdminOutboundCallTracker : activeSubModule === "brand-ambassadors" ? AmbassadorLearningCenter : activeSubModule === "account-ledger" ? AdminAccountLedger : activeSubModule === "team-ideas" ? TeamIdeas : null;
    if (ModuleComponent) {
      return (
        <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" /></div>}>
          {activeSubModule === "calendar" ? <EventCalendar department={department} /> : activeSubModule === "okr" ? <OkrTracker department={department} /> : activeSubModule === "tickets" ? <AdminTickets onOpenKb={() => setActiveSubModule("support-kb")} /> : <ModuleComponent />}
        </Suspense>
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-destructive-foreground" />
          <h3 className="font-semibold text-sm">{config.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{config.description}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {data.resources.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.isModule && <ClipboardList className="h-3.5 w-3.5 text-destructive-foreground" />}
                  <h4 className="font-medium text-sm">{item.title}</h4>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.type === "link" ? "bg-blue-500/20 text-blue-400" : item.type === "video" ? "bg-pink-500/20 text-pink-400" : "bg-muted text-muted-foreground"}`}>
                  {item.isModule ? "module" : item.type}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{item.description}</p>
              {item.isModule ? (
                <Button variant="forti" size="sm" className="w-full" onClick={() => setActiveSubModule(item.moduleKey!)}>
                  Open Module
                </Button>
              ) : item.url ? (
                <Button variant="fortiGhost" size="sm" className="w-full" onClick={() => window.open(item.url, "_blank")}>
                  <ExternalLink className="h-3 w-3 mr-1.5" />
                  Open
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

type SubKey = "resources" | "hr" | "gpt" | "learning_center" | "support_learning" | "sales_learning" | "dev_learning";
const SUB_MODULE_CARDS: { key: SubKey; label: string; description: string; icon: typeof BookOpen; comingSoon?: boolean }[] = [
  { key: "resources", label: "Resources", description: "Manage admin, team, and master tasks", icon: Link2 },
  { key: "support_learning", label: "Learning Zone", description: "17 modules + 85% knowledge test to unlock the ticket dashboard", icon: BookOpen },
  { key: "sales_learning", label: "Learning Zone", description: "Brand Ambassador training, certification & Forti Score", icon: BookOpen },
  { key: "dev_learning", label: "Learning Center", description: "Documentation and automation playbooks for engineering", icon: BookOpen },
  { key: "learning_center", label: "Training Center", description: "Training for Guards, Drivers & Brand Ambassadors", icon: BookOpen, comingSoon: true },
];

const HRCompliance = ({ department }: { department: string }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">HR & Compliance</h3>
      </div>
      <p className="text-xs text-muted-foreground">Human resources and compliance documentation for {department}.</p>
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
        <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No HR & Compliance documents yet.</p>
        <p className="text-xs text-muted-foreground">Add policies, handbooks, and compliance materials here.</p>
      </div>
    </div>
  );
};

const DepartmentModule = ({ department, departmentLabel, section, onBackToDashboard }: Props) => {
  const [activeSection, setActiveSection] = useState<SubKey | null>((section as SubKey) || null);

  const deptName = departmentLabel || department.charAt(0).toUpperCase() + department.slice(1);

  // Deep-link: open ?section=<key> for this department on first load
  useEffect(() => {
    if (activeSection) return;
    const params = new URLSearchParams(window.location.search);
    const sec = params.get("section");
    if (sec) setActiveSection(sec as SubKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => setActiveSection("support_learning");
    window.addEventListener("forti:open-support-learning", handler);
    return () => window.removeEventListener("forti:open-support-learning", handler);
  }, []);

  // Unified back: when in a sub-section, go back one level; otherwise back to dashboard.
  useBackNav(
    activeSection ? `Back to ${deptName}` : "Back to Dashboard",
    activeSection
      ? () => {
          // Clear deep-link query params so re-entering the dept doesn't re-trigger them
          const url = new URL(window.location.href);
          ["section", "module", "event"].forEach((k) => url.searchParams.delete(k));
          window.history.replaceState({}, "", url.toString());
          setActiveSection(null);
        }
      : () => {
          const url = new URL(window.location.href);
          ["dept", "section", "module", "event"].forEach((k) => url.searchParams.delete(k));
          window.history.replaceState({}, "", url.toString());
          onBackToDashboard?.();
        },
  );

  if (activeSection) {
    return (
      <div className="space-y-4">
        {activeSection === "hr" ? (
          <HRCompliance department={department} />
        ) : activeSection === "learning_center" ? (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" /></div>}>
            <OpsLearningCenter />
          </Suspense>
        ) : activeSection === "support_learning" ? (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" /></div>}>
            <SupportLearningCenter />
          </Suspense>
        ) : activeSection === "sales_learning" ? (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" /></div>}>
            <AmbassadorLearningCenter />
          </Suspense>
        ) : activeSection === "dev_learning" ? (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" /></div>}>
            <DevelopmentLearningCenter />
          </Suspense>
        ) : (
          <SectionRenderer department={department} section={activeSection as "resources" | "gpt"} onBack={() => setActiveSection(null)} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">{deptName}</h2>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SUB_MODULE_CARDS.filter((card) => {
          if (card.key === "hr") return department === "ops";
          if (card.key === "learning_center") return department === "ops";
          if (card.key === "support_learning") return department === "support";
          if (card.key === "sales_learning") return department === "sales";
          if (card.key === "dev_learning") return department === "development";
          return true;
        }).map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              onClick={() => !card.comingSoon && setActiveSection(card.key)}
              disabled={card.comingSoon}
              className={`relative rounded-lg border border-border bg-card p-5 text-left transition-all group ${
                card.comingSoon
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:border-white hover:shadow-lg hover:shadow-white/10"
              }`}
            >
              {card.comingSoon && (
                <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-white text-black">
                  Coming Soon
                </span>
              )}
              <div className={`h-10 w-10 rounded-lg bg-white flex items-center justify-center mb-3 transition-transform ${card.comingSoon ? "" : "group-hover:scale-105"}`}>
                <Icon className="h-5 w-5 text-black" />
              </div>
              <h3 className="font-semibold text-sm">{card.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DepartmentModule;
