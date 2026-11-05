import { useEffect, useState } from "react";
import { Brain, Sparkles, RefreshCw, Plus, Upload, ThumbsUp, ThumbsDown, ShieldAlert, Search, X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Step = {
  title: string;
  body: string;
  icon: React.ReactNode;
  accent: string;
  visual: React.ReactNode;
};

const STEPS: Step[] = [
  {
    title: "Welcome to the AI Knowledge Base",
    body: "This is the brain behind the support AI. Every approved entry teaches it how to answer riders, drivers, and guards.",
    icon: <Brain className="h-6 w-6" />,
    accent: "from-amber-200 via-amber-100 to-amber-300",
    visual: (
      <div className="relative h-48 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-32 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/10 blur-2xl animate-pulse" />
        </div>
        <Brain className="relative h-24 w-24 text-amber-300 animate-[fade-in_0.6s_ease-out]" strokeWidth={1.2} />
      </div>
    ),
  },
  {
    title: "Auto-sync from your modules",
    body: "Every day at 3 AM the system pulls fresh content from FAQs, the Knowledge Center, and the Academy into a Pending queue. You can also trigger it manually from the top right.",
    icon: <RefreshCw className="h-6 w-6" />,
    accent: "from-slate-200 to-slate-400",
    visual: (
      <div className="relative h-48 flex items-center justify-center gap-4">
        {["FAQ", "Articles", "Academy"].map((label, i) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-card px-4 py-3 text-xs text-center animate-[fade-in_0.5s_ease-out_both]"
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            <div className="text-muted-foreground mb-1">{label}</div>
            <ChevronRight className="h-4 w-4 mx-auto text-amber-300 animate-pulse" />
          </div>
        ))}
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 animate-[fade-in_0.5s_ease-out_0.6s_both]">
          Pending
        </div>
      </div>
    ),
  },
  {
    title: "Approve or deny each entry",
    body: "Pending entries don't reach the AI until you approve them. Deny anything wrong and add a reason — the AI learns from your reasoning too.",
    icon: <ThumbsUp className="h-6 w-6" />,
    accent: "from-emerald-200 to-emerald-400",
    visual: (
      <div className="h-48 flex items-center justify-center">
        <div className="rounded-lg border border-border bg-card p-4 w-full max-w-sm animate-[scale-in_0.4s_ease-out]">
          <div className="text-sm font-medium mb-1">Sample policy entry</div>
          <div className="text-xs text-muted-foreground mb-3">Drivers must verify ride codes before pickup…</div>
          <div className="flex gap-2">
            <div className="flex-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs px-3 py-2 text-center flex items-center justify-center gap-1 animate-pulse">
              <ThumbsUp className="h-3.5 w-3.5" /> Approve
            </div>
            <div className="flex-1 rounded-md bg-red-500/20 text-red-300 text-xs px-3 py-2 text-center flex items-center justify-center gap-1">
              <ThumbsDown className="h-3.5 w-3.5" /> Deny + reason
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Add manual entries or upload files",
    body: "Use Add Entry for quick policies, scripts, and FAQs. Upload .txt, .md, .csv, .json files (up to 20MB) to bulk-train the AI.",
    icon: <Plus className="h-6 w-6" />,
    accent: "from-blue-200 to-blue-400",
    visual: (
      <div className="h-48 flex items-center justify-center gap-3">
        <div className="rounded-lg border border-border bg-card p-3 w-32 text-center animate-[fade-in_0.4s_ease-out]">
          <Plus className="h-6 w-6 mx-auto text-amber-300 mb-1" />
          <div className="text-xs">Add Entry</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 w-32 text-center animate-[fade-in_0.4s_ease-out_0.15s_both]">
          <Upload className="h-6 w-6 mx-auto text-amber-300 mb-1" />
          <div className="text-xs">Upload File</div>
        </div>
      </div>
    ),
  },
  {
    title: "Reinforce with global rules",
    body: "Global rules apply to every AI answer — perfect for tone, banned phrases, or escalation triggers. Find them under the Global Rules tab.",
    icon: <ShieldAlert className="h-6 w-6" />,
    accent: "from-purple-200 to-purple-400",
    visual: (
      <div className="h-48 flex items-center justify-center">
        <div className="rounded-lg border border-purple-400/40 bg-purple-500/10 p-4 max-w-sm animate-[scale-in_0.4s_ease-out]">
          <ShieldAlert className="h-5 w-5 text-purple-300 mb-2" />
          <div className="text-xs text-purple-100">
            "Never quote a price without confirming pickup ZIP first."
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Search & semantic match",
    body: "When a ticket comes in, the AI vector-searches approved entries and uses the best matches to draft a response. Higher reinforcement scores get prioritized.",
    icon: <Search className="h-6 w-6" />,
    accent: "from-amber-200 to-amber-400",
    visual: (
      <div className="h-48 flex flex-col items-center justify-center gap-2">
        <div className="rounded-full border border-amber-400/40 bg-card px-4 py-2 text-xs flex items-center gap-2 animate-[fade-in_0.4s_ease-out]">
          <Search className="h-3.5 w-3.5 text-amber-300" />
          "How do I cancel a scheduled ride?"
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90 animate-pulse" />
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200 max-w-sm text-center animate-[fade-in_0.4s_ease-out_0.3s_both]">
          <Sparkles className="h-3.5 w-3.5 inline mr-1" />
          AI drafts answer using top 3 approved entries
        </div>
      </div>
    ),
  },
  {
    title: "You're ready",
    body: "Start by approving the pending queue, then add a few manual entries unique to your team. The more you train, the smarter Forti's support gets.",
    icon: <Sparkles className="h-6 w-6" />,
    accent: "from-amber-200 via-yellow-100 to-amber-400",
    visual: (
      <div className="relative h-48 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-40 rounded-full bg-gradient-to-br from-amber-300/30 to-amber-500/10 blur-3xl animate-pulse" />
        </div>
        <Sparkles className="relative h-24 w-24 text-amber-300 animate-[scale-in_0.6s_ease-out]" strokeWidth={1.2} />
      </div>
    ),
  },
];

export default function KbWalkthrough({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, STEPS.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-[fade-in_0.2s_ease-out]">
      <div
        className="absolute inset-0 bg-background/85 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-[scale-in_0.25s_ease-out]">
        {/* Shimmer top bar */}
        <div className={`h-1 bg-gradient-to-r ${s.accent} bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]`} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label="Close walkthrough"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${s.accent} text-background`}>
              {s.icon}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-2 animate-[fade-in_0.3s_ease-out]" key={`title-${step}`}>
            {s.title}
          </h2>
          <p className="text-muted-foreground mb-6 animate-[fade-in_0.3s_ease-out]" key={`body-${step}`}>
            {s.body}
          </p>

          <div
            className="rounded-xl border border-border bg-background/40 p-6 mb-6"
            key={`visual-${step}`}
          >
            {s.visual}
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-8 bg-foreground" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex justify-between items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {isLast ? (
              <Button onClick={onClose} className="bg-gradient-to-r from-amber-300 to-amber-500 text-background hover:opacity-90">
                <Sparkles className="h-4 w-4 mr-1" /> Got it
              </Button>
            ) : (
              <Button onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
