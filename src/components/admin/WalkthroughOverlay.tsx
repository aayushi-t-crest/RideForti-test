import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

export interface WalkthroughStep {
  target: string;
  title: string;
  body: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  steps: WalkthroughStep[];
  onStepChange?: (stepIndex: number, step: WalkthroughStep) => void;
}

const PAD = 6;        // padding around the highlighted element
const TIP_W = 360;
const TIP_H = 200;
const GAP = 12;       // gap between target and tooltip

const WalkthroughOverlay = ({ open, onClose, steps, onStepChange }: Props) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 0);
  const [vh, setVh] = useState(typeof window !== "undefined" ? window.innerHeight : 0);

  const step = steps[stepIndex];

  useEffect(() => {
    if (!open || !step) return;
    onStepChange?.(stepIndex, step);
  }, [open, stepIndex, step, onStepChange]);

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;
    let raf: number;
    let cancelled = false;

    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    const tick = () => {
      if (cancelled) return;
      measure();
      raf = requestAnimationFrame(tick);
    };

    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    const t = setTimeout(() => tick(), 450);

    const onChange = () => measure();
    window.addEventListener("scroll", onChange, true);
    window.addEventListener("resize", onChange);

    return () => {
      cancelled = true;
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const next = () => {
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
    else handleClose();
  };
  const prev = () => stepIndex > 0 && setStepIndex(stepIndex - 1);
  const handleClose = () => {
    setStepIndex(0);
    onClose();
  };

  if (!open || !step || typeof document === "undefined") return null;

  // Compute hole bounds, clamped to viewport
  const hole = rect
    ? {
        top: Math.max(0, rect.top - PAD),
        left: Math.max(0, rect.left - PAD),
        right: Math.min(vw, rect.right + PAD),
        bottom: Math.min(vh, rect.bottom + PAD),
      }
    : null;

  // Tooltip position
  let tipTop = 80;
  let tipLeft = vw / 2 - TIP_W / 2;
  if (rect) {
    const spaceBelow = vh - rect.bottom;
    if (spaceBelow > TIP_H + GAP) tipTop = rect.bottom + GAP;
    else tipTop = Math.max(GAP, rect.top - TIP_H - GAP);
    tipLeft = Math.min(
      Math.max(GAP, rect.left + rect.width / 2 - TIP_W / 2),
      vw - TIP_W - GAP,
    );
  }

  const overlay = (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Four dark overlays around the highlighted rect — always perfectly aligned */}
      {hole ? (
        <>
          {/* top */}
          <div
            className="absolute bg-black/70 pointer-events-auto"
            onClick={handleClose}
            style={{ top: 0, left: 0, width: vw, height: hole.top }}
          />
          {/* bottom */}
          <div
            className="absolute bg-black/70 pointer-events-auto"
            onClick={handleClose}
            style={{ top: hole.bottom, left: 0, width: vw, height: Math.max(0, vh - hole.bottom) }}
          />
          {/* left */}
          <div
            className="absolute bg-black/70 pointer-events-auto"
            onClick={handleClose}
            style={{ top: hole.top, left: 0, width: hole.left, height: hole.bottom - hole.top }}
          />
          {/* right */}
          <div
            className="absolute bg-black/70 pointer-events-auto"
            onClick={handleClose}
            style={{
              top: hole.top,
              left: hole.right,
              width: Math.max(0, vw - hole.right),
              height: hole.bottom - hole.top,
            }}
          />

          {/* White pulsing ring drawn exactly on the hole */}
          <div
            className="absolute rounded-lg pointer-events-none"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.right - hole.left,
              height: hole.bottom - hole.top,
              boxShadow:
                "0 0 0 2px rgba(255,255,255,0.95), 0 0 0 6px rgba(255,255,255,0.25), 0 0 40px rgba(255,255,255,0.35)",
              animation: "tour-pulse 2s ease-in-out infinite",
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 bg-black/70 pointer-events-auto"
          onClick={handleClose}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute pointer-events-auto rounded-xl bg-card border border-white/15 shadow-2xl p-5 transition-all duration-300"
        style={{ top: tipTop, left: tipLeft, width: TIP_W }}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          aria-label="Close walkthrough"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-foreground/80" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Step {stepIndex + 1} of {steps.length}
          </span>
        </div>
        <h3 className="text-base font-medium mb-1.5">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
        <div className="flex items-center justify-between mt-4">
          <Button size="sm" variant="ghost" onClick={prev} disabled={stepIndex === 0} className="text-xs">
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === stepIndex ? "w-4 bg-white" : "w-1.5 bg-white/30"
                }`}
              />
            ))}
          </div>
          <Button size="sm" onClick={next} className="bg-white text-black hover:bg-white/90 text-xs">
            {stepIndex === steps.length - 1 ? "Done" : "Next"}
            {stepIndex < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes tour-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 6px rgba(255,255,255,0.25), 0 0 40px rgba(255,255,255,0.35); }
          50% { box-shadow: 0 0 0 2px rgba(255,255,255,1), 0 0 0 10px rgba(255,255,255,0.15), 0 0 60px rgba(255,255,255,0.5); }
        }
      `}</style>
    </div>
  );

  return createPortal(overlay, document.body);
};

export default WalkthroughOverlay;
