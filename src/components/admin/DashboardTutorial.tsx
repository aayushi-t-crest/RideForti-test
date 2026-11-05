import { useEffect, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft } from "lucide-react";

interface Step {
  selector: string;
  title: string;
  body: string;
  /** Optional side-effect run before highlighting (e.g. open a dialog, switch tab). */
  before?: () => void;
  /** Wait this many ms after `before` before measuring the target (default 450). */
  delay?: number;
}

interface Props {
  steps: Step[];
  onClose: () => void;
}

const PAD = 6;
const GAP = 12;
const MARGIN = 12;
const MAX_TOOLTIP_WIDTH = 360;
const ESTIMATED_TOOLTIP_HEIGHT = 240;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const DashboardTutorial = ({ steps, onClose }: Props) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  const step = steps[index];

  useLayoutEffect(() => {
    let cancelled = false;
    let raf = 0;

    const measure = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      setViewport({ width: window.innerWidth, height: window.innerHeight });

      if (el) {
        const r = el.getBoundingClientRect();
        setRect(r);
      } else {
        setRect(null);
      }
    };

    const scrollAndMeasure = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        try {
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        } catch {}
      }

      const tick = () => {
        if (cancelled) return;
        measure();
        raf = requestAnimationFrame(tick);
      };

      raf = requestAnimationFrame(tick);
    };

    if (step.before) {
      try { step.before(); } catch {}
    }

    const wait = step.before ? (step.delay ?? 450) : 150;
    const timer = setTimeout(scrollAndMeasure, wait);

    const onUpdate = () => measure();
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
    };
  }, [step.selector, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, steps.length]);

  const next = () => {
    if (index === steps.length - 1) onClose();
    else setIndex((i) => i + 1);
  };
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  if (typeof document === "undefined") return null;

  const tooltipWidth = Math.min(MAX_TOOLTIP_WIDTH, Math.max(280, viewport.width - MARGIN * 2));

  const hole = rect
    ? {
        top: clamp(rect.top - PAD, 0, viewport.height),
        left: clamp(rect.left - PAD, 0, viewport.width),
        right: clamp(rect.right + PAD, 0, viewport.width),
        bottom: clamp(rect.bottom + PAD, 0, viewport.height),
      }
    : null;

  let tipTop = MARGIN;
  let tipLeft = MARGIN;

  if (rect) {
    const spaceBelow = viewport.height - rect.bottom;
    const placeBelow = spaceBelow >= ESTIMATED_TOOLTIP_HEIGHT + GAP || rect.top < ESTIMATED_TOOLTIP_HEIGHT + GAP;

    tipTop = placeBelow
      ? rect.bottom + GAP
      : rect.top - ESTIMATED_TOOLTIP_HEIGHT - GAP;

    tipTop = clamp(tipTop, MARGIN, Math.max(MARGIN, viewport.height - ESTIMATED_TOOLTIP_HEIGHT - MARGIN));
    tipLeft = clamp(
      rect.left + rect.width / 2 - tooltipWidth / 2,
      MARGIN,
      Math.max(MARGIN, viewport.width - tooltipWidth - MARGIN),
    );
  }

  const overlay = (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {hole ? (
        <>
          <div
            className="absolute bg-background/85 pointer-events-auto"
            onClick={onClose}
            style={{ top: 0, left: 0, width: viewport.width, height: hole.top }}
          />
          <div
            className="absolute bg-background/85 pointer-events-auto"
            onClick={onClose}
            style={{ top: hole.bottom, left: 0, width: viewport.width, height: Math.max(0, viewport.height - hole.bottom) }}
          />
          <div
            className="absolute bg-background/85 pointer-events-auto"
            onClick={onClose}
            style={{ top: hole.top, left: 0, width: hole.left, height: Math.max(0, hole.bottom - hole.top) }}
          />
          <div
            className="absolute bg-background/85 pointer-events-auto"
            onClick={onClose}
            style={{ top: hole.top, left: hole.right, width: Math.max(0, viewport.width - hole.right), height: Math.max(0, hole.bottom - hole.top) }}
          />
          <div
            className="absolute rounded-xl pointer-events-none transition-all duration-300 ease-out"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.right - hole.left,
              height: hole.bottom - hole.top,
              boxShadow: "0 0 0 2px hsl(var(--foreground)), 0 0 0 6px hsl(var(--foreground) / 0.22), 0 0 36px hsl(var(--foreground) / 0.45)",
              animation: "dashboard-tour-pulse 2s ease-in-out infinite",
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-background/85 pointer-events-auto" onClick={onClose} />
      )}

      {rect && (
        <div
          className="absolute pointer-events-auto bg-popover border-2 border-foreground/80 rounded-lg shadow-2xl p-4 animate-fade-in"
          style={{ top: tipTop, left: tipLeft, width: tooltipWidth, maxHeight: `calc(100vh - ${MARGIN * 2}px)`, overflowY: "auto" }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-foreground font-semibold">
                Step {index + 1} of {steps.length}
              </p>
              <h4 className="font-semibold text-sm mt-0.5">{step.title}</h4>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close tutorial"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{step.body}</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 min-w-0 flex-wrap">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === index ? "w-5 bg-foreground" : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-1.5 shrink-0">
              {index > 0 && (
                <Button variant="fortiGhost" size="sm" onClick={prev}>
                  <ArrowLeft className="h-3 w-3 mr-1" /> Back
                </Button>
              )}
              <Button variant="forti" size="sm" onClick={next}>
                {index === steps.length - 1 ? "Finish" : (<>Next <ArrowRight className="h-3 w-3 ml-1" /></>)}
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dashboard-tour-pulse {
          0%, 100% { box-shadow: 0 0 0 2px hsl(var(--foreground)), 0 0 0 6px hsl(var(--foreground) / 0.22), 0 0 36px hsl(var(--foreground) / 0.45); }
          50% { box-shadow: 0 0 0 2px hsl(var(--foreground)), 0 0 0 10px hsl(var(--foreground) / 0.14), 0 0 56px hsl(var(--foreground) / 0.55); }
        }
      `}</style>
    </div>
  );

  return createPortal(overlay, document.body);
};

export default DashboardTutorial;
