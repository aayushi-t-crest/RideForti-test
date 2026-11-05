import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type BackEntry = { id: string; label: string; handler: () => void };

interface BackNavContextValue {
  push: (entry: BackEntry) => void;
  remove: (id: string) => void;
}

const BackNavContext = createContext<BackNavContextValue | null>(null);

export const BackNavProvider = ({ children }: { children: ReactNode }) => {
  const [stack, setStack] = useState<BackEntry[]>([]);

  const push = useCallback((entry: BackEntry) => {
    setStack((prev) => {
      const filtered = prev.filter((e) => e.id !== entry.id);
      return [...filtered, entry];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setStack((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const value = useMemo(() => ({ push, remove }), [push, remove]);

  const top = stack[stack.length - 1];

  return (
    <BackNavContext.Provider value={value}>
      {top && (
        <div className="mb-4">
          <Button variant="fortiGhost" size="sm" onClick={top.handler}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      )}
      {children}
    </BackNavContext.Provider>
  );
};

/**
 * Register a back handler. Only the most-recently-registered handler is shown.
 * Pass `active=false` to skip registration (e.g. when not in a nested view).
 */
export const useBackNav = (label: string, handler: (() => void) | null | undefined, active = true) => {
  const ctx = useContext(BackNavContext);
  const idRef = useRef<string>(`${Math.random().toString(36).slice(2)}-${Date.now()}`);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!ctx || !active || !handler) return;
    const id = idRef.current;
    ctx.push({ id, label, handler: () => handlerRef.current?.() });
    return () => ctx.remove(id);
  }, [ctx, active, label, handler]);
};
