import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { GraduationCap, ShieldCheck, Car, Megaphone, Plus, Trash2, ExternalLink, Play, FileText, Link2, ArrowLeft, Pencil, Award, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useBackNav } from "@/contexts/BackNavContext";
import { lazy, Suspense } from "react";

const AdminAcademy = lazy(() => import("@/components/admin/AdminAcademy"));
const AdminAmbassadorAcademy = lazy(() => import("@/components/admin/AdminAmbassadorAcademy"));
const AmbassadorLearningCenter = lazy(() => import("@/components/admin/content/AmbassadorLearningCenter"));

type TrackKey = "guards" | "drivers" | "brand_ambassadors";

interface TrainingItem {
  id: string;
  title: string;
  description: string;
  url: string;
  type: "video" | "document" | "link";
  createdAt: string;
}

const STORAGE_KEY = "forti_ops_learning_center_v1";

const TRACKS: { key: TrackKey; label: string; description: string; icon: typeof ShieldCheck; color: string }[] = [
  {
    key: "guards",
    label: "Guards",
    description: "Training, SOPs, and certifications for armed and unarmed guards.",
    icon: ShieldCheck,
    color: "bg-primary/10 text-primary border-primary/20",
  },
  {
    key: "drivers",
    label: "Drivers",
    description: "Driver onboarding, defensive driving, and Forti service standards.",
    icon: Car,
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
];

type Store = Record<TrackKey, TrainingItem[]>;

const loadStore = (): Store => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { guards: [], drivers: [], brand_ambassadors: [] };
};

const saveStore = (store: Store) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const detectType = (url: string): TrainingItem["type"] => {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be") || u.includes("vimeo.com") || u.includes("loom.com") || u.match(/\.(mp4|mov|webm)$/)) return "video";
  if (u.includes("docs.google.com") || u.includes("notion.so") || u.match(/\.(pdf|docx?|xlsx?|pptx?)$/)) return "document";
  return "link";
};

const TypeBadge = ({ type }: { type: TrainingItem["type"] }) => {
  const map = {
    video: { Icon: Play, cls: "bg-pink-500/20 text-pink-400" },
    document: { Icon: FileText, cls: "bg-blue-500/20 text-blue-400" },
    link: { Icon: Link2, cls: "bg-muted text-muted-foreground" },
  } as const;
  const { Icon, cls } = map[type];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${cls}`}>
      <Icon className="h-2.5 w-2.5" />
      {type}
    </span>
  );
};

const TrackView = ({ trackKey, onBack }: { trackKey: TrackKey; onBack: () => void }) => {
  const track = TRACKS.find((t) => t.key === trackKey)!;
  const Icon = track.icon;
  const [store, setStore] = useState<Store>(() => loadStore());
  const items = store[trackKey] || [];

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  useBackNav("Back to Learning Center", onBack);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setUrl("");
    setEditingId(null);
  };

  const openAdd = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (it: TrainingItem) => {
    setEditingId(it.id);
    setTitle(it.title);
    setDescription(it.description);
    setUrl(it.url);
    setOpen(true);
  };

  const save = () => {
    if (!title.trim()) return;
    setStore((prev) => {
      const list = [...(prev[trackKey] || [])];
      if (editingId) {
        const idx = list.findIndex((x) => x.id === editingId);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            title: title.trim(),
            description: description.trim(),
            url: url.trim(),
            type: detectType(url),
          };
        }
      } else {
        list.unshift({
          id: crypto.randomUUID(),
          title: title.trim(),
          description: description.trim(),
          url: url.trim(),
          type: detectType(url),
          createdAt: new Date().toISOString(),
        });
      }
      return { ...prev, [trackKey]: list };
    });
    setOpen(false);
    resetForm();
  };

  const remove = (id: string) => {
    setStore((prev) => ({ ...prev, [trackKey]: (prev[trackKey] || []).filter((x) => x.id !== id) }));
  };

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white">
            <Icon className="h-5 w-5 text-black" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{track.label} Training</h2>
            <p className="text-xs text-muted-foreground">{track.description}</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="forti" size="sm" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Training
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-popover">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Add"} {track.label} Training</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Title</label>
                <Input placeholder="e.g. Defensive Driving Fundamentals" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea placeholder="Short description of what this training covers..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">URL (Video, Doc, or Link)</label>
                <Input placeholder="https://youtube.com/... or https://docs.google.com/..." value={url} onChange={(e) => setUrl(e.target.value)} />
                {url && <p className="text-[10px] text-muted-foreground">Detected as: <span className="text-foreground">{detectType(url)}</span></p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="fortiGhost" size="sm" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
              <Button variant="forti" size="sm" disabled={!title.trim()} onClick={save}>{editingId ? "Save Changes" : "Add Training"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
          <GraduationCap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No training materials yet for {track.label}.</p>
          <p className="text-xs text-muted-foreground">Click "Add Training" to upload your first video, doc, or link.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((it, i) => (
            <div key={it.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-primary">{i + 1}</span>
                  </div>
                  <h4 className="font-medium text-sm truncate">{it.title}</h4>
                </div>
                <TypeBadge type={it.type} />
              </div>
              {it.description && <p className="text-xs text-muted-foreground line-clamp-3">{it.description}</p>}
              <div className="flex items-center gap-2 pt-1">
                {it.url && (
                  <Button variant="forti" size="sm" className="flex-1" onClick={() => window.open(it.url, "_blank")}>
                    <ExternalLink className="h-3 w-3 mr-1.5" />
                    Open
                  </Button>
                )}
                <Button variant="fortiGhost" size="icon" className="h-8 w-8" onClick={() => openEdit(it)} title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(it.id)} title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const OpsLearningCenter = () => {
  const [active, setActive] = useState<TrackKey | "academy" | "ambassador_academy" | null>(null);
  const [store, setStore] = useState<Store>(() => loadStore());

  useEffect(() => {
    const onStorage = () => setStore(loadStore());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Refresh count when returning from a track
  useEffect(() => {
    if (active === null) setStore(loadStore());
  }, [active]);

  if (active === "academy") {
    return (
      <AcademyWrapper onBack={() => setActive(null)} />
    );
  }

  if (active === "ambassador_academy") {
    return <AmbassadorAcademyWrapper onBack={() => setActive(null)} />;
  }

  if (active === "brand_ambassadors") {
    return <AmbassadorWrapper onBack={() => setActive(null)} />;
  }

  if (active) {
    return <TrackView trackKey={active as TrackKey} onBack={() => setActive(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-destructive-foreground" />
          <h3 className="font-semibold text-sm">Training Center</h3>
        </div>
        <HowItWorksButton />
      </div>
      <p className="text-xs text-muted-foreground">
        Host training materials, videos, and documents for each operations role.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TRACKS.map((t) => {
          const Icon = t.icon;
          const count = (store[t.key] || []).length;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className="rounded-lg border border-border bg-card p-5 text-left hover:border-white hover:shadow-lg hover:shadow-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:border-white transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white group-hover:scale-105 transition-transform">
                  <Icon className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3 className="font-semibold">{t.label}</h3>
                  <p className="text-[10px] text-muted-foreground">{count} training {count === 1 ? "item" : "items"}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </button>
          );
        })}

        {/* Forti Driver Academy tile */}
        <button
          onClick={() => setActive("academy")}
          className="rounded-lg border border-border bg-card p-5 text-left hover:border-white hover:shadow-lg hover:shadow-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:border-white transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white group-hover:scale-105 transition-transform">
              <Award className="h-5 w-5 text-black" />
            </div>
            <div>
              <h3 className="font-semibold">Forti Driver Academy</h3>
              <p className="text-[10px] text-muted-foreground">Certification & Forti Score</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Invite drivers, manage levels (CD/AO/EO), review firearm compliance, monitor scores.</p>
        </button>

      </div>
    </div>
  );
};

const AcademyWrapper = ({ onBack }: { onBack: () => void }) => {
  useBackNav("Back to Learning Center", onBack);
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" /></div>}>
      <AdminAcademy />
    </Suspense>
  );
};

const AmbassadorAcademyWrapper = ({ onBack }: { onBack: () => void }) => {
  useBackNav("Back to Learning Center", onBack);
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" /></div>}>
      <AdminAmbassadorAcademy />
    </Suspense>
  );
};

const AmbassadorWrapper = ({ onBack }: { onBack: () => void }) => {
  useBackNav("Back to Learning Center", onBack);
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" /></div>}>
      <AmbassadorLearningCenter />
    </Suspense>
  );
};

/* ---------------- HOW IT WORKS WALKTHROUGH ---------------- */
const STEPS: { title: string; body: string; icon: typeof ShieldCheck; tone: string }[] = [
  {
    title: "Welcome to the Training Center",
    body: "One home for every training resource — Guards, Drivers, Brand Ambassadors, and the Forti Driver Academy. Pick a role to manage its materials.",
    icon: GraduationCap,
    tone: "from-zinc-200 to-zinc-400",
  },
  {
    title: "Role tiles = quick access",
    body: "Each tile (Guards, Drivers, Brand Ambassadors) holds videos, docs, and links specific to that team. The counter shows how many items live inside.",
    icon: ShieldCheck,
    tone: "from-zinc-200 to-zinc-500",
  },
  {
    title: "Add training in seconds",
    body: "Open a role → click 'Add Training' → drop a YouTube, Loom, Google Doc, or PDF link. We auto-detect the type and attach the right badge.",
    icon: Plus,
    tone: "from-zinc-100 to-zinc-400",
  },
  {
    title: "Forti Driver Academy",
    body: "A full certification engine — invite drivers via magic link, run adaptive quizzes, manage levels (CD / AO / EO), review firearm compliance, and monitor Forti Scores.",
    icon: Award,
    tone: "from-zinc-200 to-zinc-500",
  },
  {
    title: "Brand Ambassador Academy",
    body: "Open the Brand Ambassadors tile → launch the Ambassador Academy: foundations, brand standards, activation modules, and final certification at 85%.",
    icon: Megaphone,
    tone: "from-zinc-200 to-zinc-400",
  },
];

const HowItWorksButton = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="shrink-0 bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold border border-white/20 hover:btn-shimmer active:btn-shimmer">
          <GraduationCap className="h-4 w-4 mr-1.5" />
          Learn More
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-popover w-[calc(100vw-2rem)] max-w-lg p-0 overflow-hidden border-border">
        <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 sm:p-8">
          {/* animated background orbs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
            <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/5 blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          </div>

          <DialogHeader className="relative z-10 mb-4">
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Training Center — How it works
            </DialogTitle>
          </DialogHeader>

          {/* Step card with fade/scale animation, keyed on step */}
          <div key={step} className="relative z-10 animate-scale-in">
            <div className={`mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br ${current.tone} flex items-center justify-center mb-4 shadow-lg shadow-white/10`}>
              <Icon className="h-7 w-7 text-zinc-900" />
            </div>
            <h4 className="text-center text-base font-semibold mb-2 animate-fade-in">{current.title}</h4>
            <p className="text-center text-xs sm:text-sm text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
              {current.body}
            </p>
          </div>

          {/* progress dots */}
          <div className="relative z-10 flex items-center justify-center gap-1.5 mt-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-white" : "w-1.5 bg-white/25 hover:bg-white/50"
                }`}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>

          {/* nav */}
          <div className="relative z-10 flex items-center justify-between gap-2 mt-5 pt-4 border-t border-white/10">
            <Button
              variant="fortiGhost"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {step + 1} / {STEPS.length}
            </span>
            {isLast ? (
              <Button variant="forti" size="sm" onClick={() => setOpen(false)}>
                Got it
              </Button>
            ) : (
              <Button variant="forti" size="sm" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OpsLearningCenter;
