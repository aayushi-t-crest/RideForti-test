import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  FileText,
  Zap,
  Plus,
  Trash2,
  ExternalLink,
  Play,
  Link2,
  Pencil,
  Target,
  Building2,
  ShieldCheck,
  Code2,
  Plane,
  Server,
} from "lucide-react";
import { useBackNav } from "@/contexts/BackNavContext";
import CompaniesOutboundSop from "./CompaniesOutboundSop";
import UnifiedEnvAccessSop from "./UnifiedEnvAccessSop";
import DeveloperOnboardingManual from "./DeveloperOnboardingManual";
import TechnicalWhitepaper from "./TechnicalWhitepaper";
import TestFlightAccessGuide from "./TestFlightAccessGuide";
import BackendTechStack from "./BackendTechStack";
import DocRemindersDialog from "./DocRemindersDialog";

type TrackKey = "documentation" | "automations" | "leadGenSop";

interface TrainingItem {
  id: string;
  title: string;
  description: string;
  url: string;
  type: "video" | "document" | "link";
  createdAt: string;
}

const STORAGE_KEY = "forti_dev_learning_center_v1";

type TrackDef = {
  key: TrackKey;
  label: string;
  description: string;
  icon: typeof FileText;
};

const TRACKS: TrackDef[] = [
  {
    key: "documentation",
    label: "App Documentation",
    description: "Engineering docs, API references, schema notes, and architecture guides.",
    icon: FileText,
  },
  {
    key: "automations",
    label: "Automations",
    description: "Cron jobs, edge function workflows, and automated pipelines.",
    icon: Zap,
  },
];

// Sub-tracks nested inside a parent track
const SUB_TRACKS: Partial<Record<TrackKey, TrackDef[]>> = {
  automations: [
    {
      key: "leadGenSop",
      label: "Lead Gen SOP",
      description: "Standard operating procedures for lead generation workflows and outreach.",
      icon: Target,
    },
  ],
};

const ALL_TRACKS: TrackDef[] = [
  ...TRACKS,
  ...Object.values(SUB_TRACKS).flat().filter(Boolean) as TrackDef[],
];

type Store = Record<TrackKey, TrainingItem[]>;

const loadStore = (): Store => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { documentation: [], automations: [], leadGenSop: [] };
};

const saveStore = (store: Store) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const detectType = (url: string): TrainingItem["type"] => {
  const u = url.toLowerCase();
  if (
    u.includes("youtube.com") ||
    u.includes("youtu.be") ||
    u.includes("vimeo.com") ||
    u.includes("loom.com") ||
    u.match(/\.(mp4|mov|webm)$/)
  )
    return "video";
  if (
    u.includes("docs.google.com") ||
    u.includes("notion.so") ||
    u.match(/\.(pdf|docx?|xlsx?|pptx?)$/)
  )
    return "document";
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

const TrackView = ({
  trackKey,
  onBack,
  backLabel = "Back to Learning Center",
}: {
  trackKey: TrackKey;
  onBack: () => void;
  backLabel?: string;
}) => {
  const track = ALL_TRACKS.find((t) => t.key === trackKey)!;
  const Icon = track.icon;
  const [store, setStore] = useState<Store>(() => loadStore());
  const items = store[trackKey] || [];

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  useBackNav(backLabel, onBack);

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
    setStore((prev) => ({
      ...prev,
      [trackKey]: (prev[trackKey] || []).filter((x) => x.id !== id),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white">
            <Icon className="h-5 w-5 text-black" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{track.label}</h2>
            <p className="text-xs text-muted-foreground">{track.description}</p>
          </div>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="forti" size="sm" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-popover">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit" : "Add"} {track.label} Item
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Title</label>
                <Input
                  placeholder="e.g. Edge Function Architecture"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea
                  placeholder="Short description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">URL (Video, Doc, or Link)</label>
                <Input
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                {url && (
                  <p className="text-[10px] text-muted-foreground">
                    Detected as: <span className="text-foreground">{detectType(url)}</span>
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="fortiGhost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button variant="forti" size="sm" disabled={!title.trim()} onClick={save}>
                {editingId ? "Save Changes" : "Add Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
          <Icon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No items yet for {track.label}.</p>
          <p className="text-xs text-muted-foreground">
            Click "Add Item" to add your first video, doc, or link.
          </p>
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
              {it.description && (
                <p className="text-xs text-muted-foreground line-clamp-3">{it.description}</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                {it.url && (
                  <Button
                    variant="forti"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(it.url, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3 mr-1.5" />
                    Open
                  </Button>
                )}
                <Button
                  variant="fortiGhost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(it)}
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => remove(it.id)}
                  title="Delete"
                >
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

// Custom interactive modules nested inside a leaf track
type CustomModuleDef = {
  id: string;
  parent: TrackKey;
  label: string;
  description: string;
  icon: typeof FileText;
  Component: React.ComponentType;
};

const CUSTOM_MODULES: CustomModuleDef[] = [
  {
    id: "companies-outbound",
    parent: "leadGenSop",
    label: "Companies Outbound",
    description:
      "Interactive SOP for the Instantly companies outbound workflow — templates, schedule, options, pre-launch checklist, and troubleshooting.",
    icon: Building2,
    Component: CompaniesOutboundSop,
  },
  {
    id: "unified-env-access-sop",
    parent: "documentation",
    label: "Unified Environment Access SOP",
    description:
      "Ride Forti SOP-RF-001 — environments, roles, provisioning, TestFlight/APK, API, AWS, DB, third-party, security, RACI, and glossary.",
    icon: ShieldCheck,
    Component: UnifiedEnvAccessSop,
  },
  {
    id: "developer-onboarding-manual",
    parent: "documentation",
    label: "Developer Onboarding Manual",
    description:
      "Complete RideForti developer onboarding — tools, access, repos, architecture, environments, infra/keys, tech stack, local setup, env config, build/run, folder structure, and CI/CD.",
    icon: Code2,
    Component: DeveloperOnboardingManual,
  },
  {
    id: "technical-whitepaper",
    parent: "documentation",
    label: "Technical White Paper",
    description:
      "RideForti ecosystem white paper — architecture, workflows, access matrix, integrations, local dev, QA, scalability/DR, security, and roadmap.",
    icon: FileText,
    Component: TechnicalWhitepaper,
  },
  {
    id: "testflight-access-guide",
    parent: "documentation",
    label: "TestFlight Access Guide",
    description:
      "Internal tester onboarding — Apple Developer invitation, TestFlight install, accepting invites, installing builds, updates, and bug reporting.",
    icon: Plane,
    Component: TestFlightAccessGuide,
  },
  {
    id: "backend-tech-stack",
    parent: "documentation",
    label: "Backend Tech Stack",
    description:
      "RideForti backend tech stack — Laravel core, MySQL/Firestore, third-party APIs, queues/workers, request flow, security, and AWS infrastructure.",
    icon: Server,
    Component: BackendTechStack,
  },
];

const SubTrackGrid = ({
  parentKey,
  store,
  onSelect,
  onSelectCustom,
  onBack,
}: {
  parentKey: TrackKey;
  store: Store;
  onSelect: (k: TrackKey) => void;
  onSelectCustom: (id: string) => void;
  onBack: () => void;
}) => {
  const parent = ALL_TRACKS.find((t) => t.key === parentKey)!;
  const ParentIcon = parent.icon;
  const subs = SUB_TRACKS[parentKey] || [];
  const customForParent = CUSTOM_MODULES.filter((m) => m.parent === parentKey);
  // Only show the parent self-card when it has real sub-tracks; otherwise the parent
  // is already represented by the header and would be redundant alongside custom modules.
  const cards: TrackDef[] = subs.length > 0 ? [parent, ...subs] : [...subs];
  // Determine back label based on whether this parent is itself nested
  const grandParentKey = (Object.entries(SUB_TRACKS).find(([, sList]) =>
    (sList || []).some((s) => s.key === parentKey)
  )?.[0]) as TrackKey | undefined;
  const grandParentLabel = grandParentKey
    ? ALL_TRACKS.find((t) => t.key === grandParentKey)?.label
    : null;
  useBackNav(grandParentLabel ? `Back to ${grandParentLabel}` : "Back to Learning Center", onBack);

  const docModules = parentKey === "documentation"
    ? CUSTOM_MODULES.filter((m) => m.parent === "documentation").map((m) => ({ id: m.id, label: m.label }))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ParentIcon className="h-4 w-4 text-foreground" />
          <h3 className="font-semibold text-sm">{parent.label}</h3>
        </div>
        {parentKey === "documentation" && <DocRemindersDialog modules={docModules} />}
      </div>
      <p className="text-xs text-muted-foreground">{parent.description}</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((t) => {
          const Icon = t.icon;
          const count = (store[t.key] || []).length;
          const customForThis = CUSTOM_MODULES.filter((m) => m.parent === t.key);
          return (
            <Fragment key={t.key}>
              <button
                key={t.key}
                onClick={() => onSelect(t.key)}
                className="rounded-lg border border-border bg-card p-5 text-left hover:border-white hover:shadow-lg hover:shadow-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:border-white transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white group-hover:scale-105 transition-transform">
                    <Icon className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t.label}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {count} {count === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </button>
              {customForThis.map((m) => {
                const MIcon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => onSelectCustom(m.id)}
                    className="rounded-lg border border-border bg-card p-5 text-left hover:border-white hover:shadow-lg hover:shadow-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:border-white transition-all group relative"
                  >
                    <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
                      Interactive
                    </span>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white group-hover:scale-105 transition-transform">
                        <MIcon className="h-5 w-5 text-black" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{m.label}</h3>
                        <p className="text-[10px] text-muted-foreground">Module</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                  </button>
                );
              })}
            </Fragment>
          );
        })}
        {subs.length === 0 &&
          customForParent.map((m) => {
            const MIcon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => onSelectCustom(m.id)}
                className="rounded-lg border border-border bg-card p-5 text-left hover:border-white hover:shadow-lg hover:shadow-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:border-white transition-all group relative"
              >
                <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
                  Interactive
                </span>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white group-hover:scale-105 transition-transform">
                    <MIcon className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{m.label}</h3>
                    <p className="text-[10px] text-muted-foreground">Module</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </button>
            );
          })}
      </div>
    </div>
  );
};

const CustomModuleView = ({
  moduleId,
  parentLabel,
  onBack,
}: {
  moduleId: string;
  parentLabel: string | null;
  onBack: () => void;
}) => {
  const mod = CUSTOM_MODULES.find((m) => m.id === moduleId);
  useBackNav(parentLabel ? `Back to ${parentLabel}` : "Back to Learning Center", onBack);
  if (!mod) return null;
  const Comp = mod.Component;
  return <Comp />;
};

const DevelopmentLearningCenter = () => {
  const [activeParent, setActiveParent] = useState<TrackKey | null>(null);
  const [activeLeaf, setActiveLeaf] = useState<TrackKey | null>(null);
  const [activeCustom, setActiveCustom] = useState<string | null>(null);
  const [store, setStore] = useState<Store>(() => loadStore());

  useEffect(() => {
    const onStorage = () => setStore(loadStore());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (activeParent === null && activeLeaf === null && activeCustom === null)
      setStore(loadStore());
  }, [activeParent, activeLeaf, activeCustom]);

  // Custom interactive module
  if (activeCustom) {
    const mod = CUSTOM_MODULES.find((m) => m.id === activeCustom);
    const parentLeafLabel = mod
      ? ALL_TRACKS.find((t) => t.key === mod.parent)?.label || null
      : null;
    return (
      <CustomModuleView
        moduleId={activeCustom}
        parentLabel={parentLeafLabel}
        onBack={() => setActiveCustom(null)}
      />
    );
  }

  // Drilled into a leaf (items list)
  if (activeLeaf) {
    const parentLabel = activeParent
      ? ALL_TRACKS.find((t) => t.key === activeParent)?.label
      : null;
    return (
      <TrackView
        trackKey={activeLeaf}
        backLabel={parentLabel ? `Back to ${parentLabel}` : "Back to Learning Center"}
        onBack={() => setActiveLeaf(null)}
      />
    );
  }

  // Drilled into a parent that has sub-tracks OR custom modules
  if (
    activeParent &&
    ((SUB_TRACKS[activeParent]?.length || 0) > 0 ||
      CUSTOM_MODULES.some((m) => m.parent === activeParent))
  ) {
    return (
      <SubTrackGrid
        parentKey={activeParent}
        store={store}
        onSelect={(k) => {
          // If the selected sub-track itself has custom modules, drill in as a parent again
          if (CUSTOM_MODULES.some((m) => m.parent === k)) {
            setActiveParent(k);
          } else {
            setActiveLeaf(k);
          }
        }}
        onSelectCustom={(id) => setActiveCustom(id)}
        onBack={() => {
          // If we drilled from automations -> leadGenSop, go back to automations
          const parentOfThis = Object.entries(SUB_TRACKS).find(([, subs]) =>
            (subs || []).some((s) => s.key === activeParent)
          )?.[0] as TrackKey | undefined;
          setActiveParent(parentOfThis || null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-destructive-foreground" />
        <h3 className="font-semibold text-sm">Learning Center</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Engineering documentation and automation playbooks for the development team.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TRACKS.map((t) => {
          const Icon = t.icon;
          const hasSubs = (SUB_TRACKS[t.key]?.length || 0) > 0;
          const hasCustom = CUSTOM_MODULES.some((m) => m.parent === t.key);
          const hasChildren = hasSubs || hasCustom;
          const customCount = CUSTOM_MODULES.filter((m) => m.parent === t.key).length;
          const subCustomCount = (SUB_TRACKS[t.key] || []).reduce(
            (sum, s) => sum + CUSTOM_MODULES.filter((m) => m.parent === s.key).length,
            0
          );
          const count = hasSubs
            ? [t.key, ...(SUB_TRACKS[t.key] || []).map((s) => s.key)].reduce(
                (sum, k) => sum + (store[k]?.length || 0),
                0
              ) + customCount + subCustomCount
            : (store[t.key] || []).length + customCount;
          return (
            <button
              key={t.key}
              onClick={() => {
                if (hasChildren) setActiveParent(t.key);
                else setActiveLeaf(t.key);
              }}
              className="rounded-lg border border-border bg-card p-5 text-left hover:border-white hover:shadow-lg hover:shadow-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:border-white transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white group-hover:scale-105 transition-transform">
                  <Icon className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3 className="font-semibold">{t.label}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {count} {count === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DevelopmentLearningCenter;
