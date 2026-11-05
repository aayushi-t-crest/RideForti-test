import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Copy,
  ChevronLeft,
  ChevronRight,
  Check,
  Phone,
  MapPin,
  DollarSign,
  Download,
  CheckCircle2,
  Car,
} from "lucide-react";

export type CallScriptPhase =
  | {
      type: "pitch";
      title: string;
      eyebrow?: string;
      icon?: "phone" | "sparkles" | "car";
      paragraphs: string[];
    }
  | {
      type: "pricing";
      title: string;
      eyebrow?: string;
      icon?: "map" | "dollar";
      groups: {
        label: string;
        rows: { range: string; discount: string; highlight?: boolean }[];
        note?: string;
      }[];
    }
  | {
      type: "checklist";
      title: string;
      eyebrow?: string;
      icon?: "check" | "download";
      items: { label: string; sub?: string }[];
    };

export type StructuredCallScript = {
  title: string;
  subtitle?: string;
  phases: CallScriptPhase[];
};

const iconFor = (name?: string) => {
  switch (name) {
    case "phone":
      return Phone;
    case "car":
      return Car;
    case "map":
      return MapPin;
    case "dollar":
      return DollarSign;
    case "download":
      return Download;
    case "check":
      return CheckCircle2;
    default:
      return Sparkles;
  }
};

function flattenToText(script: StructuredCallScript): string {
  const parts: string[] = [script.title, ""];
  script.phases.forEach((p, i) => {
    parts.push(`— ${i + 1}. ${p.title} —`);
    if (p.type === "pitch") {
      parts.push(...p.paragraphs, "");
    } else if (p.type === "pricing") {
      p.groups.forEach((g) => {
        parts.push(g.label);
        g.rows.forEach((r) => parts.push(`  • ${r.range} → ${r.discount}`));
        if (g.note) parts.push(`  ${g.note}`);
        parts.push("");
      });
    } else {
      p.items.forEach((it, idx) => {
        parts.push(`${idx + 1}. ${it.label}${it.sub ? ` — ${it.sub}` : ""}`);
      });
      parts.push("");
    }
  });
  return parts.join("\n").trim();
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  script: StructuredCallScript | null;
}

export default function CallScriptDialog({ open, onOpenChange, script }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setStep(0);
      setChecked({});
    }
  }, [open, script]);

  const total = script?.phases.length || 0;
  const phase = script?.phases[step];
  const progress = total ? ((step + 1) / total) * 100 : 0;

  const fullText = useMemo(() => (script ? flattenToText(script) : ""), [script]);

  if (!script) return null;

  const Icon = phase ? iconFor((phase as any).icon) : Sparkles;

  const copyCurrent = async () => {
    if (!phase) return;
    let txt = "";
    if (phase.type === "pitch") txt = phase.paragraphs.join("\n\n");
    else if (phase.type === "pricing")
      txt = phase.groups
        .map(
          (g) =>
            `${g.label}\n${g.rows.map((r) => `• ${r.range} → ${r.discount}`).join("\n")}${
              g.note ? `\n${g.note}` : ""
            }`,
        )
        .join("\n\n");
    else
      txt = phase.items
        .map((it, i) => `${i + 1}. ${it.label}${it.sub ? ` — ${it.sub}` : ""}`)
        .join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      toast({ title: "Section copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      toast({ title: "Full script copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[calc(100vw-1.5rem)] sm:w-auto h-[calc(100svh-5rem)] max-h-[calc(100svh-5rem)] sm:h-auto sm:max-h-[92vh] !top-[max(3.5rem,calc(env(safe-area-inset-top)+2rem))] !translate-y-0 sm:!top-[50%] sm:!translate-y-[-50%] bg-popover border-white/10 p-0 overflow-hidden flex flex-col">
        {/* Animated gradient header */}
        <div className="relative px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-white/10 bg-gradient-to-br from-white/[0.04] via-transparent to-white/[0.02] overflow-hidden">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[hsl(45,60%,55%)]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-foreground/50 mb-2">
              <Sparkles className="h-3 w-3" />
              <span>Live Call Playbook</span>
            </div>
            <DialogTitle className="metallic-shimmer text-xl sm:text-2xl font-light tracking-wide text-left">
              {script.title}
            </DialogTitle>
            <DialogDescription className="text-foreground/60 text-xs sm:text-sm text-left">
              {script.subtitle || "Step through the call like a pro. Tap, copy, close."}
            </DialogDescription>
          </DialogHeader>

          {/* Current section title */}
          {phase && (
            <div className="relative mt-4 flex items-center gap-2 text-foreground">
              <Icon className="h-4 w-4 text-[hsl(45,60%,65%)] shrink-0" />
              <span className="text-sm font-medium tracking-wide">
                {step + 1}. {phase.title}
              </span>
              <span className="ml-auto text-[10px] uppercase tracking-[0.2em] text-foreground/50">
                {step + 1} / {total}
              </span>
            </div>
          )}

          {/* Progress bar */}
          <div className="relative mt-3 h-[2px] bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[hsl(45,60%,55%)] via-white to-[hsl(45,60%,55%)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          {phase && (
            <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-white/15 to-white/[0.02] border border-white/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-foreground/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-foreground/50">
                    Step {step + 1} of {total}
                  </div>
                  <div className="text-sm sm:text-base font-medium text-foreground truncate">{phase.title}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyCurrent}
                  className="h-8 text-xs gap-1.5 text-foreground/70 hover:text-foreground shrink-0 px-2"
                >
                  <Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Copy section</span><span className="sm:hidden">Copy</span>
                </Button>
              </div>

              {phase.type === "pitch" && (
                <div className="space-y-3">
                  {phase.paragraphs.map((para, i) => (
                    <div
                      key={i}
                      className="relative rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4 text-sm leading-relaxed text-foreground/90 hover:border-white/20 transition-colors"
                    >
                      <div className="absolute -left-px top-3 bottom-3 w-[2px] bg-gradient-to-b from-[hsl(45,60%,55%)] to-transparent rounded-full" />
                      {para}
                    </div>
                  ))}
                </div>
              )}

              {phase.type === "pricing" && (
                <div className="grid gap-4 md:grid-cols-2">
                  {phase.groups.map((g, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-[hsl(45,60%,65%)]" />
                        <div className="text-sm font-medium">{g.label}</div>
                      </div>
                      <div className="space-y-2">
                        {g.rows.map((r, j) => (
                          <div
                            key={j}
                            className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5 hover:bg-white/[0.06] hover:border-white/15 transition-colors"
                          >
                            <span className="text-xs text-foreground/70">{r.range}</span>
                            <span className="text-sm font-semibold metallic-shimmer">
                              {r.discount}
                            </span>
                          </div>
                        ))}
                      </div>
                      {g.note && (
                        <div className="mt-3 text-[11px] text-foreground/50 italic">{g.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {phase.type === "checklist" && (
                <div className="space-y-2">
                  {phase.items.map((it, i) => {
                    const key = `${step}-${i}`;
                    const isChecked = !!checked[key];
                    return (
                      <button
                        key={i}
                        onClick={() =>
                          setChecked((c) => ({ ...c, [key]: !c[key] }))
                        }
                        className={`w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-all ${
                          isChecked
                            ? "bg-white/[0.06] border-white/20"
                            : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div
                          className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                            isChecked
                              ? "bg-white border-white text-black scale-110"
                              : "border-white/30"
                          }`}
                        >
                          {isChecked && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`text-sm ${
                              isChecked
                                ? "text-foreground/50 line-through"
                                : "text-foreground/90"
                            }`}
                          >
                            <span className="text-foreground/40 mr-1.5">{i + 1}.</span>
                            {it.label}
                          </div>
                          {it.sub && (
                            <div className="mt-0.5 text-[11px] text-foreground/50">{it.sub}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t border-white/10 bg-background/40 flex-row flex-wrap sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="gap-1 px-2.5"
            >
              <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Prev</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
              disabled={step >= total - 1}
              className="gap-1 px-2.5"
            >
              <span className="hidden sm:inline">Next</span> <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)} className="px-2.5">
              Close
            </Button>
            <Button
              size="sm"
              onClick={copyAll}
              className="bg-gradient-to-b from-[hsl(0,0%,90%)] via-[hsl(0,0%,75%)] to-[hsl(0,0%,82%)] text-black font-bold gap-1.5 hover:opacity-90 px-2.5"
            >
              <Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Copy Full Script</span><span className="sm:hidden">Copy All</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
