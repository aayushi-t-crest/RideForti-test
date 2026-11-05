import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBackNav } from "@/contexts/BackNavContext";
import SupportLearningWalkthrough from "./SupportLearningWalkthrough";
import {
  BookOpen, CheckCircle2, Lock, Unlock, ArrowLeft, GraduationCap,
  Sparkles, MessageSquare, ShieldAlert, Headset, Bot, Clock, Tag,
  Users, ListChecks, AlertTriangle, Route, FileText, Bug, GitBranch,
  Smartphone, Heart, Award, RefreshCw, HelpCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Module content — written specifically for Forti's support tooling */
/* ------------------------------------------------------------------ */

interface LessonSection { heading: string; body: string; bullets?: string[]; }
interface Module {
  key: string;
  title: string;
  icon: typeof BookOpen;
  summary: string;
  sections: LessonSection[];
}

const MODULES: Module[] = [
  {
    key: "about-forti",
    title: "What is Forti / About Forti",
    icon: Sparkles,
    summary: "Understand the product you support before you ever touch a ticket.",
    sections: [
      {
        heading: "The product in one paragraph",
        body: "Forti is a premium transportation and personal-protection platform. Riders book luxury rides — sedan or SUV — with the option of an unarmed or armed protection professional. Subscriptions are tiered: Forti Black (free), Forti Black+ ($9.97/mo), and Forti Black X ($19.97/mo). Riders, drivers, and guards interact through the app and web while admins operate everything from this dashboard.",
      },
      {
        heading: "Who you talk to",
        bullets: [
          "Riders — booking issues, billing, ride safety, app questions",
          "Drivers — onboarding, payouts, Forti Driver Academy, vehicle approval",
          "Guards — armed/unarmed certification, dispatch, dress preference",
          "Brand ambassadors — referrals, app downloads, leaderboard",
        ],
        body: "",
      },
      {
        heading: "Brand voice",
        body: "Confident, calm, authoritative. No emojis, no slang, no salesy language. Riders pay for a premium feeling — your reply is part of that product.",
      },
    ],
  },
  {
    key: "welcome",
    title: "Welcome to Support",
    icon: Headset,
    summary: "Your role, your tools, and the standard you're held to.",
    sections: [
      {
        heading: "Your job in one sentence",
        body: "Resolve every contact in a way that leaves the rider feeling safer, smarter, and more loyal than before they reached out.",
      },
      {
        heading: "Where support happens",
        bullets: [
          "Live chat widget on the marketing site (white bubble, lower-right)",
          "Tickets created from chat handoffs, emails, app submissions",
          "FAQ submissions when a question can't be answered by AI or KB",
        ],
        body: "",
      },
      {
        heading: "Tools you'll use daily",
        bullets: [
          "Support Tickets dashboard (this module)",
          "Knowledge Base (source-of-truth articles + AI training)",
          "Internal Notes (private team-only thread per ticket)",
          "AI Insights panel (sentiment, churn risk, lead score, summary)",
          "Urgency Thresholds (auto-escalation rules)",
        ],
        body: "",
      },
    ],
  },
  {
    key: "chat-dashboard",
    title: "Support Chat Dashboard & How It Works",
    icon: MessageSquare,
    summary: "End-to-end walkthrough of the live chat + ticket interface.",
    sections: [
      {
        heading: "Lifecycle of a contact",
        body: "1) A visitor opens the floating widget. 2) AI greets and tries to resolve. 3) If the user types a handoff phrase or clicks 'speak to a human', the AI pauses and the session enters the staff queue. 4) A ticket is created automatically with a unique ID (shown as #XXXXXXXX in blue). 5) New unassigned open tickets show a pulsing emerald 'NEW' badge. 6) When you send your first staff reply, the ticket flips from 'open' to 'in_progress' and the badge disappears.",
      },
      {
        heading: "What you see on a ticket card",
        bullets: [
          "Blue ticket # — short ID for quick verbal reference",
          "Pulsing 'NEW' badge — open + unassigned (needs first response)",
          "Sentiment color strip from AI Insights (red = at-risk)",
          "Last message preview + age timer",
          "Assigned staff avatar (empty = unclaimed)",
        ],
        body: "",
      },
      {
        heading: "Working a ticket",
        body: "Open the ticket → read the full thread → check Internal Notes for prior team context → check AI Insights for tone/risk → reply. Use the AI toggle (Power icon) to pause the bot if it's interfering. Use the 'Pause AI' button when you need to take over without the bot replying simultaneously.",
      },
    ],
  },
  {
    key: "faq-system",
    title: "FAQ Submission System",
    icon: HelpCircle,
    summary: "How rider questions become permanent FAQ knowledge.",
    sections: [
      {
        heading: "Why it exists",
        body: "Every unanswered question is a future bug. The FAQ Submission System captures questions the AI can't confidently answer and routes them to a human for an authoritative answer that gets recycled into the bot.",
      },
      {
        heading: "The flow",
        bullets: [
          "On any ticket, click the FAQ icon to open the FAQ dialog",
          "Submit the customer's question + your draft answer",
          "It enters faq_patterns as 'pending approval'",
          "An admin approves → it becomes published FAQ + KB entry",
          "AI bot now uses it to answer future riders automatically",
        ],
        body: "",
      },
      {
        heading: "Demo tickets",
        body: "Demo/seed tickets have non-UUID IDs and cannot submit FAQs (you'll see a 'Demo ticket' toast). Only real tickets feed the knowledge loop.",
      },
    ],
  },
  {
    key: "ai-bot-kb",
    title: "AI Bot & Knowledge Base",
    icon: Bot,
    summary: "How the AI answers, where it gets its knowledge, and how to correct it.",
    sections: [
      {
        heading: "How the bot answers",
        body: "The bot uses semantic search (vector embeddings) over the support_kb_entries table — only entries marked 'approved' and 'active' are used. If similarity is below the threshold, the bot escalates to human or asks a clarifying question instead of guessing.",
      },
      {
        heading: "Adding KB entries",
        bullets: [
          "Open Support Knowledge Base module",
          "Create entry with title, summary, full content, category, source_ref",
          "Submit → enters 'pending review'",
          "Admin approves → becomes searchable to the AI",
          "Reinforcement score boosts entries that consistently resolve",
        ],
        body: "",
      },
      {
        heading: "Correcting bad AI answers",
        body: "If the AI gave a wrong reply, open the KB entry it cited and add a Correction (rule + reason). Corrections override conflicting content site-wide if marked 'applies_globally'. Never edit the underlying entry without leaving a correction trail.",
      },
    ],
  },
  {
    key: "urgency-sla",
    title: "Urgency & SLA Management",
    icon: Clock,
    summary: "How tickets escalate based on age and lack of response.",
    sections: [
      {
        heading: "The five urgency tiers",
        bullets: [
          "Standard — normal queue priority",
          "Urgent — visible flag, prioritize within shift",
          "Critical — must be addressed within hours, alerts go to leads",
          "Imminent — minutes-level response expected",
          "Catastrophic — safety/legal, alerts ALL escalation contacts immediately",
        ],
        body: "",
      },
      {
        heading: "How auto-escalation works",
        body: "support_escalation_settings stores two thresholds per tier: age-based (ticket sat unanswered too long) and response-based (no staff response in N minutes). When breached, the escalate-tickets edge function notifies everyone in support_escalation_contacts whose min_tier matches, via email, SMS, and/or Slack — channels they configured per person.",
      },
      {
        heading: "Configuring thresholds",
        body: "Open the 'Urgency Thresholds' dialog from the tickets dashboard. Lower numbers = more aggressive escalation. Every change is logged. Tighten thresholds during incidents; loosen during normal ops to avoid alert fatigue.",
      },
    ],
  },
  {
    key: "ticket-types",
    title: "Ticket Types & Sources",
    icon: Tag,
    summary: "Know where a ticket came from and how to triage it.",
    sections: [
      {
        heading: "Sources",
        bullets: [
          "Chat handoff — user requested a human in the live widget",
          "Email — inbound to support inbox, parsed into a ticket",
          "App submission — in-app 'Contact Support' form",
          "FAQ escalation — question routed up because no good answer exists",
          "Internal-created — staff opens a ticket on behalf of a user",
        ],
        body: "",
      },
      {
        heading: "Common categories",
        bullets: [
          "Booking — pickup/dropoff, vehicle type, dispatch",
          "Billing — subscription, refund, charge dispute",
          "Safety — incidents during a ride, guard issues",
          "Account — login, password, 2FA, profile",
          "Driver/Guard — onboarding, certification, payouts",
          "Bug — broken UI, app crash, payment failure",
          "Feedback — feature request, complaint, praise",
        ],
        body: "",
      },
    ],
  },
  {
    key: "comm-guide",
    title: "Customer Communication Guide",
    icon: Users,
    summary: "Tone, structure, and rules for every reply you send.",
    sections: [
      {
        heading: "The three-line reply formula",
        body: "Line 1: Acknowledge their specific issue in their words. Line 2: State what you're doing or have done. Line 3: Set expectation for next step + timeline. Anything beyond is optional context — never decoration.",
      },
      {
        heading: "Always do",
        bullets: [
          "Use the rider's first name once, naturally",
          "Confirm the action ('I've refunded $19.97')",
          "Give a concrete timeline ('within 5 business days')",
          "Offer a next step they can take",
          "Close internal notes after handoff",
        ],
        body: "",
      },
      {
        heading: "Never do",
        bullets: [
          "Apologize five times — once is enough, then act",
          "Use emojis or exclamation marks",
          "Promise something you can't verify",
          "Reply without checking AI Insights first",
          "Edit a customer's words inside an internal note",
        ],
        body: "",
      },
    ],
  },
  {
    key: "scenarios",
    title: "Common Support Scenarios",
    icon: ListChecks,
    summary: "Playbooks for the situations you'll see weekly.",
    sections: [
      {
        heading: "Refund request",
        body: "Verify the charge in their account → check ride/subscription history → if under $20 and within policy, refund immediately and note in internal thread. If over $20, escalate to lead via @mention in internal notes.",
      },
      {
        heading: "Driver no-show",
        body: "Pull the ride record → confirm dispatch logs → issue full refund + apology credit on next ride → flag the driver for ops via internal note tagged @ops.",
      },
      {
        heading: "Cannot log in",
        body: "First check if 2FA email is reaching them (check Resend logs via dev). If not, request alternate email to send manual reset link. Never share password reset tokens in chat — always email.",
      },
      {
        heading: "Subscription downgrade",
        body: "Confirm current tier → process downgrade in user record → set effective date to end of current billing cycle → confirm in writing.",
      },
    ],
  },
  {
    key: "difficult",
    title: "Difficult Conversations, Legal Threats & Safety",
    icon: ShieldAlert,
    summary: "When to stop replying and immediately escalate.",
    sections: [
      {
        heading: "Stop and escalate immediately if you see",
        bullets: [
          "Mention of injury, weapon use, or active danger",
          "Threats of lawsuit, lawyer, or media",
          "Allegations against a driver or guard (assault, harassment, theft)",
          "Suicidal ideation or self-harm language",
          "Anything that could become a news story",
        ],
        body: "",
      },
      {
        heading: "What to do",
        body: "1) Mark ticket Catastrophic (triggers all-hands escalation). 2) Reply ONCE with: 'Thank you for reporting this. We are taking it seriously. A senior team member will contact you within the next hour.' 3) Add internal note tagging @leadership with full context. 4) Do NOT speculate, admit fault, or offer settlements. 5) Preserve all chat history — never delete.",
      },
      {
        heading: "Hostile but non-threatening users",
        body: "Stay flat-toned. Do not match energy. Repeat the facts and the next step. If the user is abusive, you may say once: 'I want to help you. I cannot continue if the conversation remains abusive.' Then close the chat if it persists, with a note explaining why.",
      },
    ],
  },
  {
    key: "escalation",
    title: "Escalation Path & Procedures",
    icon: Route,
    summary: "Who to escalate to, when, and how.",
    sections: [
      {
        heading: "The chain",
        bullets: [
          "Tier 1 — You (frontline support)",
          "Tier 2 — Support lead (handles refunds >$20, complex billing)",
          "Tier 3 — Department head (legal, safety, PR-sensitive)",
          "Tier 4 — Founder/leadership (catastrophic only)",
        ],
        body: "",
      },
      {
        heading: "How to escalate inside the dashboard",
        body: "Use Internal Notes to @mention the next tier. The mention triggers email + SMS via the notification system. Bump the urgency tier on the ticket so the auto-escalation system also fires. Never escalate by tapping someone on Slack without leaving a paper trail in the ticket.",
      },
    ],
  },
  {
    key: "scripts",
    title: "Support Scripts (Reusable Replies)",
    icon: FileText,
    summary: "Approved templates you can copy, then personalize.",
    sections: [
      {
        heading: "Greeting (live chat)",
        body: "Hi {first_name} — thanks for reaching out. I'm reviewing your request now and will be back with a clear answer in a moment.",
      },
      {
        heading: "Refund issued",
        body: "Hi {first_name} — I've processed a full refund of {amount}. You'll see it on your original payment method within 5 business days. Let me know if you'd like anything else.",
      },
      {
        heading: "Driver investigation",
        body: "Hi {first_name} — thank you for the details. I've flagged this ride and the driver to our operations team for review. You'll hear back within 24 hours with the outcome.",
      },
      {
        heading: "Closing",
        body: "Anything else I can take care of for you, {first_name}? If not, I'll close this out — but you can reply anytime to reopen.",
      },
      {
        heading: "Catastrophic acknowledgment",
        body: "Thank you for reporting this, {first_name}. We are taking it very seriously. A senior team member will contact you within the next hour to follow up directly.",
      },
    ],
  },
  {
    key: "feedback-bugs",
    title: "Feedback & Bug Collection",
    icon: Bug,
    summary: "How to capture feature requests and bugs without losing them.",
    sections: [
      {
        heading: "Bugs",
        body: "When a rider reports something broken: capture device + OS + app version + reproducible steps in the ticket body. Add internal note tagging @development with the same details. Set urgency: Urgent if it blocks a booking, Standard if cosmetic.",
      },
      {
        heading: "Feature requests",
        body: "Acknowledge the request warmly but never promise it will ship. Add internal note tagging @product with the request and the rider's tier (Black / Black+ / Black X) — tier informs prioritization.",
      },
    ],
  },
  {
    key: "assignment",
    title: "Ticket Assignment & Handoff",
    icon: GitBranch,
    summary: "Claiming tickets, transferring them, and never dropping the ball.",
    sections: [
      {
        heading: "Claiming",
        body: "Click 'Assign to me' on any unassigned ticket — this also clears the NEW badge once you reply. Only claim what you can work in the next 30 minutes. Unclaim if you'll be away.",
      },
      {
        heading: "Handing off",
        body: "Before transferring: write an internal note summarizing what you've already tried and what the next agent should do. Then reassign. The assigned staff field is tracked in support_chat_sessions.assigned_staff_id.",
      },
      {
        heading: "Shift change",
        body: "End of shift: every open ticket you own should have a current internal note. Either close it, hand it off explicitly to the next shift, or leave a note saying when you'll resume.",
      },
    ],
  },
  {
    key: "unified-system",
    title: "Unified Web + App Ticket System",
    icon: Smartphone,
    summary: "Why every ticket lands in one place — and how to use that.",
    sections: [
      {
        heading: "One inbox, many sources",
        body: "Whether a rider used the web chat, the in-app form, sent an email, or a brand ambassador escalated something — every contact creates a row in support_tickets and a thread in support_chat_messages. There is no separate 'app inbox' to check.",
      },
      {
        heading: "Why it matters",
        body: "When the same rider contacts you twice from different surfaces, you can see the full history. Always search by email/phone before responding so you don't repeat or contradict prior staff.",
      },
    ],
  },
  {
    key: "retention",
    title: "Retention & Save Playbook",
    icon: Heart,
    summary: "Turning a cancellation request into a save.",
    sections: [
      {
        heading: "Detect intent",
        body: "Watch AI Insights' churn_risk score. Anything ≥0.6 should be treated as a save opportunity even if the rider hasn't said 'cancel' yet.",
      },
      {
        heading: "The save sequence",
        bullets: [
          "Ask the real reason (price? unused? bad experience?)",
          "Empathize with one sentence — no over-apologizing",
          "Offer the right tool: free month, downgrade, ride credit, or a real fix",
          "Confirm the outcome in writing and log the save reason in internal notes",
        ],
        body: "",
      },
      {
        heading: "When to let them go",
        body: "If the rider is firm or has had a serious negative experience, do not pressure. Cancel cleanly, thank them, and leave the door open. A graceful exit becomes a future return.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Knowledge Test — 20 questions, 85% to unlock                       */
/* ------------------------------------------------------------------ */

interface Question { q: string; choices: string[]; correct: number; }

const QUESTIONS: Question[] = [
  { q: "What status does a ticket have when it's brand new and unassigned?", choices: ["closed", "open", "resolved", "draft"], correct: 1 },
  { q: "What automatically happens when you send your first staff reply?", choices: ["Ticket is closed", "Status flips from open to in_progress and the NEW badge disappears", "Customer is auto-refunded", "Nothing changes"], correct: 1 },
  { q: "Which urgency tier triggers immediate notification of ALL escalation contacts?", choices: ["Urgent", "Critical", "Imminent", "Catastrophic"], correct: 3 },
  { q: "Where does the AI bot pull its answers from?", choices: ["ChatGPT directly", "Approved & active entries in support_kb_entries via vector search", "A static file", "The faq_patterns table only"], correct: 1 },
  { q: "What is the correct three-line reply formula?", choices: ["Apologize, apologize, apologize", "Acknowledge → action → next step + timeline", "Greeting → joke → close", "Question → question → question"], correct: 1 },
  { q: "A rider mentions a lawyer and threatens to sue. What do you do FIRST?", choices: ["Apologize and offer a refund", "Mark Catastrophic, send the approved acknowledgment, escalate via internal note", "Delete the chat", "Ignore until a manager sees it"], correct: 1 },
  { q: "Demo tickets (non-UUID IDs) can submit to the FAQ system.", choices: ["True", "False"], correct: 1 },
  { q: "Where do you correct a bad AI answer?", choices: ["Edit the AI prompt", "Add a Correction to the cited KB entry with rule + reason", "Delete the KB entry", "Reply to the customer with the right answer only"], correct: 1 },
  { q: "Which is NOT a Forti subscription tier?", choices: ["Forti Black", "Forti Black+", "Forti Black X", "Forti Platinum"], correct: 3 },
  { q: "When should you use Internal Notes vs. replying to the customer?", choices: ["They're the same thing", "Internal Notes are private team-only context, never shown to the customer", "Internal Notes are auto-emailed to the customer", "Only admins see Internal Notes"], correct: 1 },
  { q: "A bug blocks bookings. What urgency do you set?", choices: ["Standard", "Urgent", "Catastrophic", "It doesn't matter"], correct: 1 },
  { q: "What two threshold types power auto-escalation?", choices: ["Age-based and response-based", "Color and size", "Email and SMS", "Manual only"], correct: 0 },
  { q: "Before responding to a returning rider, you should...", choices: ["Reply immediately", "Search by email or phone to read prior history", "Ask them to repeat themselves", "Forward to the bot"], correct: 1 },
  { q: "AI Insights' churn_risk score of 0.7 means...", choices: ["Customer is happy", "High save opportunity — work the retention playbook", "Refund automatically", "Close the ticket"], correct: 1 },
  { q: "How is a feature request best captured?", choices: ["Promise it will ship next month", "Internal note tagging @product with rider tier", "Ignore it", "Tell the rider to email the CEO"], correct: 1 },
  { q: "Where do tickets created from web chat, in-app form, and email all live?", choices: ["Three separate inboxes", "One unified support_tickets table", "Only the web inbox", "Slack"], correct: 1 },
  { q: "Brand voice rule for replies?", choices: ["Lots of emojis and exclamation points", "Confident, calm, authoritative — no emojis or slang", "Very formal corporate-legal", "Match the customer's slang"], correct: 1 },
  { q: "When handing off a ticket to another agent, you must...", choices: ["Just reassign it", "Leave an internal note with what you tried and what's next, then reassign", "Email them privately", "Close the ticket first"], correct: 1 },
  { q: "Who handles refunds over $20?", choices: ["Anyone", "Frontline support", "Support lead (Tier 2)", "The customer"], correct: 2 },
  { q: "Approved acknowledgment for a catastrophic incident commits to a follow-up within...", choices: ["15 minutes", "1 hour", "24 hours", "Whenever possible"], correct: 1 },
];

const PASS_PCT = 85;
const STORAGE_KEY = (uid: string) => `forti_support_test_passed_${uid}`;

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

const SupportLearningCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const uid = user?.id || "anon";
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [showTest, setShowTest] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(QUESTIONS.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [passed, setPassed] = useState(false);

  // Load saved progress
  useEffect(() => {
    try {
      const c = localStorage.getItem(`forti_support_lessons_${uid}`);
      if (c) setCompleted(new Set(JSON.parse(c)));
      setPassed(localStorage.getItem(STORAGE_KEY(uid)) === "1");
    } catch { /* ignore */ }
  }, [uid]);

  const markComplete = (key: string) => {
    const next = new Set(completed);
    next.add(key);
    setCompleted(next);
    localStorage.setItem(`forti_support_lessons_${uid}`, JSON.stringify([...next]));
  };

  const score = useMemo(() => {
    const correct = answers.reduce((acc, a, i) => acc + (a === QUESTIONS[i].correct ? 1 : 0), 0);
    return Math.round((correct / QUESTIONS.length) * 100);
  }, [answers]);

  const submitTest = () => {
    if (answers.some((a) => a === null)) {
      toast({ title: "Answer all questions", description: "Please complete every question before submitting.", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    if (score >= PASS_PCT) {
      setPassed(true);
      localStorage.setItem(STORAGE_KEY(uid), "1");
      toast({ title: `Passed — ${score}%`, description: "Support ticket dashboard is now unlocked." });
    } else {
      toast({ title: `Did not pass — ${score}%`, description: `You need ${PASS_PCT}%. Review the modules and retake.`, variant: "destructive" });
    }
  };

  const resetTest = () => {
    setAnswers(new Array(QUESTIONS.length).fill(null));
    setSubmitted(false);
  };

  const completionPct = Math.round((completed.size / MODULES.length) * 100);

  // Unified back button: test view goes back to module list; module detail goes back to list
  const backFromTest = useCallback(() => { setShowTest(false); setSubmitted(false); }, []);
  const backFromModule = useCallback(() => setActiveModule(null), []);
  useBackNav("Back", showTest ? backFromTest : (activeModule ? backFromModule : null), showTest || !!activeModule);

  /* -------------------------------- TEST VIEW -------------------------------- */
  if (showTest) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            Pass with {PASS_PCT}% to unlock ticket dashboard
          </div>
        </div>

        {passed && !submitted && (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Award className="h-5 w-5 text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold">You've already passed this test.</p>
                <p className="text-xs text-muted-foreground">Retaking won't lock you out — your access remains.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <ScrollArea className="h-[60vh] pr-3">
          <div className="space-y-4">
            {QUESTIONS.map((q, i) => (
              <Card key={i} className={submitted ? (answers[i] === q.correct ? "border-emerald-500/40" : "border-red-500/40") : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {i + 1}. {q.q}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {q.choices.map((c, ci) => {
                    const selected = answers[i] === ci;
                    const isCorrect = submitted && ci === q.correct;
                    const isWrong = submitted && selected && ci !== q.correct;
                    return (
                      <button
                        key={ci}
                        disabled={submitted}
                        onClick={() => {
                          const next = [...answers];
                          next[i] = ci;
                          setAnswers(next);
                        }}
                        className={`w-full text-left text-xs px-3 py-2 rounded border transition-colors ${
                          isCorrect ? "border-emerald-500/60 bg-emerald-500/10" :
                          isWrong ? "border-red-500/60 bg-red-500/10" :
                          selected ? "border-primary bg-primary/10" :
                          "border-border bg-card hover:border-muted-foreground/40"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-sm">
            {submitted ? (
              <span className={score >= PASS_PCT ? "text-emerald-500 font-semibold" : "text-red-500 font-semibold"}>
                Score: {score}% {score >= PASS_PCT ? "— Passed" : `— Need ${PASS_PCT}%`}
              </span>
            ) : (
              <span className="text-muted-foreground">{answers.filter(a => a !== null).length} / {QUESTIONS.length} answered</span>
            )}
          </div>
          {submitted ? (
            <Button onClick={resetTest} variant="outline" size="sm">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retake
            </Button>
          ) : (
            <Button onClick={submitTest} variant="forti" size="sm">Submit test</Button>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------ MODULE DETAIL ------------------------------ */
  if (activeModule) {
    const Icon = activeModule.icon;
    const isDone = completed.has(activeModule.key);
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-black" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{activeModule.title}</h2>
            <p className="text-sm text-muted-foreground">{activeModule.summary}</p>
          </div>
          {isDone && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
        </div>

        <ScrollArea className="h-[55vh] pr-3">
          <div className="space-y-5">
            {activeModule.sections.map((s, i) => (
              <div key={i} className="space-y-2">
                <h3 className="font-semibold text-sm text-foreground">{s.heading}</h3>
                {s.body && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.body}</p>}
                {s.bullets && (
                  <ul className="space-y-1.5 pl-1">
                    {s.bullets.map((b, bi) => (
                      <li key={bi} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="pt-2 border-t border-border">
          <Button
            onClick={() => { markComplete(activeModule.key); setActiveModule(null); }}
            variant={isDone ? "outline" : "forti"}
            size="sm"
            className="w-full"
          >
            {isDone ? <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Completed — back to Learning Zone</> : "Mark as complete"}
          </Button>
        </div>
      </div>
    );
  }

  /* -------------------------------- LIST VIEW -------------------------------- */
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg" data-tour="slz-header">
          <BookOpen className="h-4 w-4 text-white" />
          <h2 className="font-semibold text-sm">Support Learning Zone</h2>
        </div>
        <Button
          size="sm"
          onClick={() => setWalkthroughOpen(true)}
          className="shrink-0 bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold border border-white/20 btn-shimmer hover:btn-shimmer active:btn-shimmer"
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          How it Works
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Complete the modules below, then pass the knowledge test with {PASS_PCT}% to unlock the live support ticket dashboard.
      </p>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="rounded-lg" data-tour="slz-progress">
            <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Module progress</span>
            <span className="text-xs text-muted-foreground">{completed.size} / {MODULES.length}</span>
            </div>
            <Progress value={completionPct} className="h-2 mt-3" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2 min-w-0" data-tour="slz-lock">
              {passed ? <Unlock className="h-4 w-4 text-emerald-500 shrink-0" /> : <Lock className="h-4 w-4 text-muted-foreground shrink-0" />}
              <span className="text-xs">
                Ticket dashboard: <span className={passed ? "text-emerald-500 font-semibold" : "text-muted-foreground"}>{passed ? "Unlocked" : "Locked"}</span>
              </span>
            </div>
            <Button data-tour="slz-test-btn" size="sm" variant={passed ? "outline" : "forti"} onClick={() => setShowTest(true)} className="w-full sm:w-auto justify-center">
              <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
              {passed ? "Retake test" : "Take knowledge test"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3 rounded-lg" data-tour="slz-modules">
        {MODULES.map((m, i) => {
          const Icon = m.icon;
          const isDone = completed.has(m.key);
          return (
            <button
              key={m.key}
              onClick={() => setActiveModule(m)}
              className="rounded-lg border border-border bg-card p-4 text-left hover:border-white hover:shadow-lg hover:shadow-white/10 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="h-4 w-4 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="font-semibold text-sm break-words">{m.title}</h3>
                    {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.summary}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <SupportLearningWalkthrough open={walkthroughOpen} onClose={() => setWalkthroughOpen(false)} />
    </div>
  );
};

export default SupportLearningCenter;

/* ------------------------------------------------------------------ */
/* Helper for ticket dashboard gating                                 */
/* ------------------------------------------------------------------ */
export const isSupportTestPassed = (uid: string | undefined) => {
  if (!uid) return false;
  try { return localStorage.getItem(`forti_support_test_passed_${uid}`) === "1"; } catch { return false; }
};
