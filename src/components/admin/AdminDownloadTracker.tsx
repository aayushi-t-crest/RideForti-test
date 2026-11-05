import { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Download,
  TrendingUp,
  Users,
  Eye,
  Calendar as CalendarIcon,
  Search,
  X,
  Sparkles,
  Apple,
  Smartphone,
} from "lucide-react";
import DownloadTrackerWalkthrough from "@/components/admin/DownloadTrackerWalkthrough";

type Visit = {
  id: string;
  ambassador_id: string | null;
  device_type: string;
  platform: string | null;
  created_at: string;
  source_page: string | null;
  event_type: string | null;
  store: string | null;
  attribution_source: string | null;
};

type Ambassador = {
  id: string;
  name: string;
  city: string | null;
};

type RangeKey = "today" | "7d" | "30d" | "all" | "custom";
type SourceFilter = "all" | "download" | "swimweek";
type AttrFilter = "all" | "ambassador" | "email_sms" | "other";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "all", label: "All Time" },
  { key: "custom", label: "Custom" },
];

const SOURCES: { key: SourceFilter; label: string }[] = [
  { key: "all", label: "All Pages" },
  { key: "download", label: "/download" },
  { key: "swimweek", label: "/swimweek" },
];

const ATTRS: { key: AttrFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ambassador", label: "Ambassador" },
  { key: "email_sms", label: "Email / SMS" },
  { key: "other", label: "Other" },
];

function rangeToDates(range: RangeKey, from: string, to: string): { start: Date | null; end: Date | null } {
  const now = new Date();
  if (range === "all") return { start: null, end: null };
  if (range === "custom") {
    return {
      start: from ? new Date(from + "T00:00:00") : null,
      end: to ? new Date(to + "T23:59:59") : null,
    };
  }
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === "7d") start.setDate(start.getDate() - 6);
  if (range === "30d") start.setDate(start.getDate() - 29);
  return { start, end: now };
}

// Treat legacy rows (event_type NULL) as 'download' so historical data still counts.
const isDownload = (v: Visit) => (v.event_type ?? "download") === "download";
const isPageView = (v: Visit) => v.event_type === "page_view";

// Legacy rows: NULL attribution_source. Use ambassador_id presence as a fallback.
function attrOf(v: Visit): "ambassador" | "email_sms" | "other" {
  if (v.attribution_source === "ambassador" || v.attribution_source === "email_sms" || v.attribution_source === "other") {
    return v.attribution_source;
  }
  return v.ambassador_id ? "ambassador" : "other";
}

export default function AdminDownloadTracker() {
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [range, setRange] = useState<RangeKey>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [attrFilter, setAttrFilter] = useState<AttrFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedAmbassadorId, setSelectedAmbassadorId] = useState<string | "all">("all");
  const [tourOpen, setTourOpen] = useState(false);
  const [drilldownId, setDrilldownId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await adminApi.getDownloadTracker();
      if (cancelled) return;
      setVisits((data?.visits ?? []) as Visit[]);
      setAmbassadors((data?.ambassadors ?? []) as Ambassador[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Visits filtered by date + page + attribution + ambassador (used for everything except per-page visitor totals)
  const filtered = useMemo(() => {
    const { start, end } = rangeToDates(range, from, to);
    return visits.filter((v) => {
      const t = new Date(v.created_at).getTime();
      if (start && t < start.getTime()) return false;
      if (end && t > end.getTime()) return false;
      if (sourceFilter !== "all" && (v.source_page ?? "download") !== sourceFilter) return false;
      if (attrFilter !== "all" && attrOf(v) !== attrFilter) return false;
      if (selectedAmbassadorId !== "all" && v.ambassador_id !== selectedAmbassadorId) return false;
      return true;
    });
  }, [visits, range, from, to, sourceFilter, attrFilter, selectedAmbassadorId]);

  const downloads = useMemo(() => filtered.filter(isDownload), [filtered]);
  const pageViews = useMemo(() => filtered.filter(isPageView), [filtered]);
  const linksSent = useMemo(() => filtered.filter((v) => v.event_type === "link_sent"), [filtered]);

  const totalDownloads = downloads.length;
  const attributed = downloads.filter((v) => attrOf(v) === "ambassador").length;
  const emailSms = downloads.filter((v) => attrOf(v) === "email_sms").length;
  const other = downloads.filter((v) => attrOf(v) === "other").length;
  const totalLinksSent = linksSent.length;
  const linksSentDownload = linksSent.filter((v) => v.source_page === "download").length;
  const linksSentSwimweek = linksSent.filter((v) => v.source_page === "swimweek").length;

  // Page-view splits ignore the source filter for the "per page" breakdown
  const pageViewsForRange = useMemo(() => {
    const { start, end } = rangeToDates(range, from, to);
    return visits.filter((v) => {
      if (!isPageView(v)) return false;
      const t = new Date(v.created_at).getTime();
      if (start && t < start.getTime()) return false;
      if (end && t > end.getTime()) return false;
      return true;
    });
  }, [visits, range, from, to]);
  const pvDownload = pageViewsForRange.filter((v) => v.source_page === "download").length;
  const pvSwimweek = pageViewsForRange.filter((v) => v.source_page === "swimweek").length;

  const leaderboard = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of downloads) {
      if (!v.ambassador_id) continue;
      counts.set(v.ambassador_id, (counts.get(v.ambassador_id) ?? 0) + 1);
    }
    const rows = Array.from(counts.entries()).map(([id, count]) => {
      const a = ambassadors.find((x) => x.id === id);
      return {
        id,
        name: a ? a.name : "Unknown ambassador",
        city: a?.city ?? null,
        count,
      };
    });
    const q = search.trim().toLowerCase();
    const searched = q
      ? rows.filter((r) => r.name.toLowerCase().includes(q) || (r.city ?? "").toLowerCase().includes(q))
      : rows;
    searched.sort((x, y) => y.count - x.count);
    return searched;
  }, [downloads, ambassadors, search]);

  const ambassadorOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...ambassadors].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter((a) =>
      a.name.toLowerCase().includes(q) || (a.city ?? "").toLowerCase().includes(q)
    );
  }, [ambassadors, search]);

  // Drill-down details
  const drilldown = useMemo(() => {
    if (!drilldownId) return null;
    const amb = ambassadors.find((a) => a.id === drilldownId) ?? null;
    const rows = downloads.filter((v) => v.ambassador_id === drilldownId);
    const apple = rows.filter((r) => r.store === "apple").length;
    const google = rows.filter((r) => r.store === "google").length;
    const unknownStore = rows.length - apple - google;
    const fromDownload = rows.filter((r) => r.source_page === "download").length;
    const fromSwimweek = rows.filter((r) => r.source_page === "swimweek").length;
    const fromUnknown = rows.length - fromDownload - fromSwimweek;
    return { amb, rows, apple, google, unknownStore, fromDownload, fromSwimweek, fromUnknown };
  }, [drilldownId, downloads, ambassadors]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4" data-tour="dt-header">
        <div>
          <h2 className="text-2xl font-light tracking-wide metallic-shimmer">Download Tracker</h2>
          <p className="text-sm text-muted-foreground mt-1">
            App downloads attributed to brand ambassadors via referral links and QR codes.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setTourOpen(true)}
          className="shrink-0 bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold border border-white/20 btn-shimmer hover:btn-shimmer active:btn-shimmer"
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          How it Works
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-card/50 border-white/10 space-y-3">
        <div className="flex flex-wrap items-center gap-2" data-tour="dt-range">
          <CalendarIcon className="h-4 w-4 text-muted-foreground mr-1" />
          {RANGES.map((r) => (
            <Button
              key={r.key}
              size="sm"
              variant={range === r.key ? "default" : "outline"}
              onClick={() => setRange(r.key)}
              className={range === r.key ? "bg-white text-black hover:bg-white/90" : ""}
            >
              {r.label}
            </Button>
          ))}
          {range === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Source</span>
          {SOURCES.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={sourceFilter === s.key ? "default" : "outline"}
              onClick={() => setSourceFilter(s.key)}
              className={sourceFilter === s.key ? "bg-white text-black hover:bg-white/90" : ""}
            >
              {s.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Attribution</span>
          {ATTRS.map((a) => (
            <Button
              key={a.key}
              size="sm"
              variant={attrFilter === a.key ? "default" : "outline"}
              onClick={() => setAttrFilter(a.key)}
              className={attrFilter === a.key ? "bg-white text-black hover:bg-white/90" : ""}
            >
              {a.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2" data-tour="dt-search">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search ambassador by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={selectedAmbassadorId}
            onChange={(e) => setSelectedAmbassadorId(e.target.value as string | "all")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-[260px]"
          >
            <option value="all">All ambassadors</option>
            {ambassadorOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.city ? ` — ${a.city}` : ""}
              </option>
            ))}
          </select>
          {selectedAmbassadorId !== "all" && (
            <Button size="sm" variant="ghost" onClick={() => setSelectedAmbassadorId("all")}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-card/50 border-white/10" data-tour="dt-stat-total">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Downloads</div>
              <div className="text-3xl font-light mt-1">{loading ? "—" : totalDownloads}</div>
            </div>
            <Download className="h-5 w-5 text-secondary-foreground" />
          </div>
        </Card>
        <Card className="p-5 bg-card/50 border-white/10" data-tour="dt-stat-attributed">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Attributed</div>
              <div className="text-3xl font-light mt-1">{loading ? "—" : attributed}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">to an ambassador</div>
            </div>
            <Users className="h-5 w-5 text-destructive-foreground" />
          </div>
        </Card>
        <Card className="p-5 bg-card/50 border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Email / SMS</div>
              <div className="text-3xl font-light mt-1">{loading ? "—" : emailSms}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">invited via email/text</div>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-5 bg-card/50 border-white/10" data-tour="dt-stat-unattributed">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Other</div>
              <div className="text-3xl font-light mt-1">{loading ? "—" : other}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">"Other / Not sure"</div>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Page visitor stats */}
      <Card className="p-5 bg-card/50 border-white/10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Page Visitors</div>
              <div className="text-xs text-muted-foreground/70 mt-0.5">Unique visitors (deduped per IP & page)</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">/download</div>
              <div className="text-2xl font-light">{loading ? "—" : pvDownload}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">/swimweek</div>
              <div className="text-2xl font-light">{loading ? "—" : pvSwimweek}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="text-2xl font-light">{loading ? "—" : pvDownload + pvSwimweek}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Links sent (SMS + Email) from the Outbound Call Tracker */}
      <Card className="p-5 bg-card/50 border-white/10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Links Sent</div>
              <div className="text-xs text-muted-foreground/70 mt-0.5">Referral links sent to leads via SMS + Email</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">/download</div>
              <div className="text-2xl font-light">{loading ? "—" : linksSentDownload}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">/swimweek</div>
              <div className="text-2xl font-light">{loading ? "—" : linksSentSwimweek}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="text-2xl font-light">{loading ? "—" : totalLinksSent}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card className="p-0 bg-card/50 border-white/10 overflow-hidden" data-tour="dt-leaderboard">
        <div className="px-5 py-4 border-b border-white/10">
          <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/90">
            Ambassador Leaderboard
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">Click a row to see Apple vs Google split & source page.</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No attributed downloads yet for this period.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {leaderboard.map((row, i) => (
              <button
                type="button"
                key={row.id}
                onClick={() => setDrilldownId(row.id)}
                className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.04] text-left transition-colors"
              >
                <div className="w-8 text-center text-sm font-medium text-muted-foreground">#{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{row.name}</div>
                  {row.city && <div className="text-xs text-muted-foreground">{row.city}</div>}
                </div>
                <div className="text-right">
                  <div className="text-lg font-light">{row.count}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">downloads</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Drill-down drawer */}
      <Sheet open={!!drilldownId} onOpenChange={(o) => !o && setDrilldownId(null)}>
        <SheetContent className="bg-popover border-l border-white/10 w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{drilldown?.amb?.name ?? "Ambassador"}</SheetTitle>
            <SheetDescription>
              {drilldown?.amb?.city ? `${drilldown.amb.city} · ` : ""}
              Download breakdown for the current filter range.
            </SheetDescription>
          </SheetHeader>

          {drilldown && (
            <div className="mt-6 space-y-6">
              {/* Store split */}
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">By Store</div>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4 bg-card/50 border-white/10">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                      <Apple className="h-4 w-4" /> App Store
                    </div>
                    <div className="text-2xl font-light mt-1">{drilldown.apple}</div>
                  </Card>
                  <Card className="p-4 bg-card/50 border-white/10">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                      <Smartphone className="h-4 w-4" /> Google Play
                    </div>
                    <div className="text-2xl font-light mt-1">{drilldown.google}</div>
                  </Card>
                </div>
                {drilldown.unknownStore > 0 && (
                  <div className="text-[11px] text-muted-foreground mt-2">
                    {drilldown.unknownStore} legacy download(s) without store info.
                  </div>
                )}
              </div>

              {/* Source page split */}
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">By Source Page</div>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4 bg-card/50 border-white/10">
                    <div className="text-muted-foreground text-xs uppercase tracking-wider">/download</div>
                    <div className="text-2xl font-light mt-1">{drilldown.fromDownload}</div>
                  </Card>
                  <Card className="p-4 bg-card/50 border-white/10">
                    <div className="text-muted-foreground text-xs uppercase tracking-wider">/swimweek</div>
                    <div className="text-2xl font-light mt-1">{drilldown.fromSwimweek}</div>
                  </Card>
                </div>
                {drilldown.fromUnknown > 0 && (
                  <div className="text-[11px] text-muted-foreground mt-2">
                    {drilldown.fromUnknown} legacy download(s) without source page.
                  </div>
                )}
              </div>

              {/* Recent timeline */}
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recent Downloads</div>
                {drilldown.rows.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No downloads in this range.</div>
                ) : (
                  <div className="divide-y divide-white/5 border border-white/10 rounded-md">
                    {drilldown.rows.slice(0, 25).map((r) => (
                      <div key={r.id} className="px-3 py-2 flex items-center gap-3 text-sm">
                        <div className="w-16 text-muted-foreground text-xs">
                          {r.store === "apple" ? "Apple" : r.store === "google" ? "Google" : "—"}
                        </div>
                        <div className="flex-1 text-muted-foreground text-xs">
                          {r.source_page ?? "—"} · {r.platform ?? r.device_type}
                        </div>
                        <div className="text-xs text-muted-foreground/70 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <DownloadTrackerWalkthrough open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
