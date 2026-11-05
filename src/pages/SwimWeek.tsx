import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackDownload } from "@/lib/trackDownload";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useIsMobile } from "@/hooks/use-mobile";
import fortiLogo from "@/assets/forti-logo.png";
import appStoreBadge from "@/assets/app-store-badge.svg";
import googlePlayBadge from "@/assets/google-play-badge.png";
import { Settings, X, Copy, RotateCcw, UserCheck, ChevronsUpDown, Check } from "lucide-react";
import ShareWidget from "@/components/ShareWidget";

type AmbassadorOption = {
  id: string;
  name: string;
  qr_code: string | null;
  city: string | null;
};

const BG_VIDEO = "/videos/swimweek-bg.mp4";
const BG_POSTER = "/videos/swimweek-bg-poster.jpg";

const APP_STORE_URL = "https://apps.apple.com/us/app/ride-forti/id6753171574";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.blacktruck.app&pli=1";

const DEFAULTS = {
  logoHeight: 99,
  logoMarginBottom: 73,
  badgeContainerWidth: 322,
  badgeGap: 10,
  badgeOffsetY: 7,
  appStoreHeight: 62,
  googlePlayHeight: 82,
  btnMarginTop: 22,
  btnPaddingX: 52,
  btnPaddingY: 6,
  btnFontSize: 15,
  btnText: "Homepage",
  btnVisible: false,
  copyrightVisible: true,
};

function getDeviceType(width: number): string {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function getPlatform(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "unknown";
}

const SwimWeek = () => {
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";
  const [showEditor, setShowEditor] = useState(isEditMode);
  const [needsTapForSound, setNeedsTapForSound] = useState(false);
  const [activeTab, setActiveTab] = useState<"badges" | "button">("badges");

  // Badge states
  const [logoHeight, setLogoHeight] = useState(DEFAULTS.logoHeight);
  const [logoMarginBottom, setLogoMarginBottom] = useState(DEFAULTS.logoMarginBottom);
  const [badgeContainerWidth, setBadgeContainerWidth] = useState(DEFAULTS.badgeContainerWidth);
  const [badgeGap, setBadgeGap] = useState(DEFAULTS.badgeGap);
  const [badgeOffsetY, setBadgeOffsetY] = useState(DEFAULTS.badgeOffsetY);
  const [appStoreHeight, setAppStoreHeight] = useState(DEFAULTS.appStoreHeight);
  const [googlePlayHeight, setGooglePlayHeight] = useState(DEFAULTS.googlePlayHeight);

  // Button states
  const [btnMarginTop, setBtnMarginTop] = useState(DEFAULTS.btnMarginTop);
  const [btnPaddingX, setBtnPaddingX] = useState(DEFAULTS.btnPaddingX);
  const [btnPaddingY, setBtnPaddingY] = useState(DEFAULTS.btnPaddingY);
  const [btnFontSize, setBtnFontSize] = useState(DEFAULTS.btnFontSize);
  const [btnText, setBtnText] = useState(DEFAULTS.btnText);
  const [btnVisible, setBtnVisible] = useState(DEFAULTS.btnVisible);
  const [copyrightVisible, setCopyrightVisible] = useState(DEFAULTS.copyrightVisible);
  const [trackingDownload, setTrackingDownload] = useState(false);

  const configSnippet = useMemo(() => {
    return JSON.stringify({
      logo: { height: logoHeight, marginBottom: logoMarginBottom },
      badges: { containerWidth: badgeContainerWidth, gap: badgeGap, offsetY: badgeOffsetY, appStore: appStoreHeight, googlePlay: googlePlayHeight },
      button: { visible: btnVisible, text: btnText, marginTop: btnMarginTop, paddingX: btnPaddingX, paddingY: btnPaddingY, fontSize: btnFontSize },
      copyright: { visible: copyrightVisible },
    }, null, 2);
  }, [logoHeight, logoMarginBottom, badgeContainerWidth, badgeGap, badgeOffsetY, appStoreHeight, googlePlayHeight, btnMarginTop, btnPaddingX, btnPaddingY, btnFontSize, btnText, btnVisible, copyrightVisible]);

  const resetAll = () => {
    setLogoHeight(DEFAULTS.logoHeight);
    setLogoMarginBottom(DEFAULTS.logoMarginBottom);
    setBadgeContainerWidth(DEFAULTS.badgeContainerWidth);
    setBadgeGap(DEFAULTS.badgeGap);
    setBadgeOffsetY(DEFAULTS.badgeOffsetY);
    setAppStoreHeight(DEFAULTS.appStoreHeight);
    setGooglePlayHeight(DEFAULTS.googlePlayHeight);
    setBtnMarginTop(DEFAULTS.btnMarginTop);
    setBtnPaddingX(DEFAULTS.btnPaddingX);
    setBtnPaddingY(DEFAULTS.btnPaddingY);
    setBtnFontSize(DEFAULTS.btnFontSize);
    setBtnText(DEFAULTS.btnText);
    setBtnVisible(DEFAULTS.btnVisible);
    setCopyrightVisible(DEFAULTS.copyrightVisible);
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(configSnippet);
  };

  const isMobile = useIsMobile();

  // Brand ambassador referral popup state
  const [referralOpen, setReferralOpen] = useState(false);
  const [pendingStoreUrl, setPendingStoreUrl] = useState<string | null>(null);
  const [pendingStore, setPendingStore] = useState<"apple" | "google" | null>(null);

  // Ambassadors loaded from DB (populated from magic-link invites)
  const [ambassadors, setAmbassadors] = useState<AmbassadorOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("other");
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadAmbassadors = async () => {
    const [driversRes, portalRes] = await Promise.all([
      supabase
        .from("ambassador_drivers")
        .select("id, first_name, last_name, qr_code, city, status")
        .eq("status", "active")
        .order("first_name", { ascending: true }),
      supabase.rpc("get_portal_ambassadors"),
    ]);

    const fromDrivers: AmbassadorOption[] = (driversRes.data ?? []).map((d) => ({
      id: d.id,
      name: `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Ambassador",
      qr_code: d.qr_code,
      city: d.city,
    }));

    const fromPortal: AmbassadorOption[] = (portalRes.data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name || "Ambassador",
      qr_code: null,
      city: p.city,
    }));

    // Merge + de-dupe by id (drivers take precedence if same id ever overlaps)
    const seen = new Set<string>();
    const merged = [...fromDrivers, ...fromPortal].filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
    merged.sort((a, b) => a.name.localeCompare(b.name));
    setAmbassadors(merged);
    return merged;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const merged = await loadAmbassadors();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, []);


  // Track a page view (deduped per visitor per page server-side)
  useEffect(() => {
    trackDownload({
      event_type: "page_view",
      source_page: "swimweek",
      device_type: getDeviceType(window.screen.width),
      platform: getPlatform(),
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
    }).catch((e) => console.error("Page-view tracking failed:", e));
  }, []);

  // Always refresh ambassador list when the referral popup opens so new
  // additions (like a brand-new ambassador) are immediately selectable.
  useEffect(() => {
    if (referralOpen) {
      loadAmbassadors();
    }
  }, [referralOpen]);

  // Pre-select ambassador from ?ref=<qr_code>
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (!refCode || ambassadors.length === 0) return;
    const match = ambassadors.find((a) => a.qr_code?.toLowerCase() === refCode.toLowerCase());
    if (match) setSelectedId(match.id);
  }, [searchParams, ambassadors]);

  const selectedAmbassador = useMemo(() => {
    if (selectedId === "other") {
      return {
        name: "Other / Not sure",
        role: "Forti Brand Ambassador",
        message: "Welcome to Forti. We'll still record your download — let us know who sent you anytime.",
      };
    }
    if (selectedId === "email_sms") {
      return {
        name: "Email / SMS",
        role: "Forti Brand Ambassador",
        message: "You were invited via email or text message. Welcome to Forti.",
      };
    }
    const a = ambassadors.find((x) => x.id === selectedId);
    return {
      name: a?.name ?? "Forti Brand Ambassador",
      role: a?.city ? `Forti Brand Ambassador · ${a.city}` : "Forti Brand Ambassador",
      message: "You were personally referred to download Forti. Welcome to the experience.",
    };
  }, [selectedId, ambassadors]);

  const openReferral = (url: string, store: "apple" | "google") => {
    setPendingStoreUrl(url);
    setPendingStore(store);
    setReferralOpen(true);
  };

  const continueToStore = async () => {
    if (trackingDownload) return;
    const storeUrl = pendingStoreUrl;
    const store = pendingStore;
    if (!storeUrl || !store) return;

    const isRealAmbassador = selectedId !== "other" && selectedId !== "email_sms";
    const ambassador_id = isRealAmbassador ? selectedId : null;
    const attribution_source: "ambassador" | "email_sms" | "other" = isRealAmbassador
      ? "ambassador"
      : selectedId === "email_sms"
        ? "email_sms"
        : "other";

    setTrackingDownload(true);

    // Fire tracking with keepalive — does NOT block navigation, survives page redirect.
    trackDownload({
      event_type: "download",
      source_page: "swimweek",
      store,
      attribution_source,
      ambassador_id,
      device_type: getDeviceType(window.screen.width),
      platform: getPlatform(),
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
    }).then((r) => {
      if (!r.ok) console.error("[SwimWeek] tracking did not persist:", r);
      else console.log("[SwimWeek] tracked via", r.via);
    });

    window.open(storeUrl, "_blank", "noopener,noreferrer");

    setTrackingDownload(false);
    setReferralOpen(false);
    setPendingStoreUrl(null);
    setPendingStore(null);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Background video – swimweek only */}
      <video
        ref={(el) => {
          if (!el) return;
          (window as any).__swVideo = el;
          const tryUnmuted = async () => {
            try {
              el.muted = false;
              el.volume = 1;
              await el.play();
              setNeedsTapForSound(false);
            } catch {
              el.muted = true;
              try { await el.play(); } catch {}
              setNeedsTapForSound(true);
              const unmute = async () => {
                el.muted = false;
                el.volume = 1;
                try { await el.play(); } catch {}
                setNeedsTapForSound(false);
                evts.forEach((ev) => window.removeEventListener(ev, unmute as any));
              };
              const evts = ["pointerdown","touchstart","touchend","mousedown","click","keydown","scroll","wheel","mousemove"];
              evts.forEach((ev) => window.addEventListener(ev, unmute as any, { once: true, passive: true } as any));
            }
          };
          tryUnmuted();
        }}
        src={BG_VIDEO}
        poster={BG_POSTER}
        autoPlay
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ backgroundImage: `url(${BG_POSTER})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="absolute inset-0 bg-black/60 z-[1]" />

      {/* Tap-for-sound hint */}
      {needsTapForSound && (
        <button
          type="button"
          onClick={() => {
            const el = (window as any).__swVideo as HTMLVideoElement | undefined;
            if (el) { el.muted = false; el.volume = 1; el.play().catch(() => {}); }
            setNeedsTapForSound(false);
          }}
          className="absolute top-4 right-4 z-[5] rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs text-white border border-white/20"
        >
          Tap for sound
        </button>
      )}


      {/* Foreground content */}
      <div className="relative z-10 flex flex-col items-center">
      {/* Logo */}
      <div style={{ marginBottom: logoMarginBottom }}>
        <img src={fortiLogo} alt="Forti" style={{ height: logoHeight }} className="w-auto" />
      </div>

      {/* Download Badges */}
      <div
        className="flex flex-col w-full"
        style={{
          gap: badgeGap,
          maxWidth: badgeContainerWidth,
          transform: `translateY(${badgeOffsetY}px)`,
        }}
      >
        <button
          type="button"
          onClick={() => openReferral(APP_STORE_URL, "apple")}
          className="transition-transform hover:scale-105 active:scale-95"
          aria-label="Download on the App Store"
        >
          <img src={appStoreBadge} alt="Download on the App Store" style={{ height: appStoreHeight }} className="w-full object-contain" />
        </button>
        <button
          type="button"
          onClick={() => openReferral(PLAY_STORE_URL, "google")}
          className="transition-transform hover:scale-105 active:scale-95"
          aria-label="Get it on Google Play"
        >
          <img src={googlePlayBadge} alt="Get it on Google Play" style={{ height: googlePlayHeight }} className="w-full object-contain" />
        </button>
      </div>

      {/* Homepage Button (hidden by default — replaced by referral popup flow) */}
      {btnVisible && (
        <Link to="/" style={{ marginTop: btnMarginTop, transform: `translateY(${badgeOffsetY}px)` }}>
          <button
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold rounded-md shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.7)] transition-all"
            style={{
              paddingLeft: btnPaddingX,
              paddingRight: btnPaddingX,
              paddingTop: btnPaddingY,
              paddingBottom: btnPaddingY,
              fontSize: btnFontSize,
            }}
          >
            {btnText}
          </button>
        </Link>
      )}

      {/* Copyright */}
      {copyrightVisible && (
        <div className="mt-16 text-xs text-muted-foreground/50">
          © 2026 Forti. All rights reserved.
        </div>
      )}
      </div>

      {/* Brand Ambassador Referral Popup */}
      <Dialog open={referralOpen} onOpenChange={setReferralOpen}>
        <DialogContent className="bg-popover border-border max-w-sm w-[calc(100%-2.5rem)] z-[9999] p-8 sm:p-10 gap-6 rounded-3xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <UserCheck className="h-5 w-5 text-white" />
              You were referred
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Who referred you?
            </DialogDescription>
          </DialogHeader>

          {/* Searchable ambassador picker */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Who referred you?
            </label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-3 text-left hover:bg-background/60 transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{selectedAmbassador.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{selectedAmbassador.role}</div>
                    </div>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border z-[10000]" align="start">
                <Command>
                  <CommandInput placeholder="Search by name..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No ambassador found.</CommandEmpty>
                    <CommandGroup>
                      {ambassadors.map((a) => (
                        <CommandItem
                          key={a.id}
                          // Include id in the value so cmdk's onSelect callback
                          // can recover it reliably even if names overlap.
                          value={`${a.name} ${a.city ?? ""} ${a.id}`}
                          onSelect={() => { setSelectedId(a.id); setPickerOpen(false); }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${selectedId === a.id ? "opacity-100" : "opacity-0"}`} />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">{a.name}</span>
                            {a.city && <span className="text-xs text-muted-foreground truncate">{a.city}</span>}
                          </div>
                        </CommandItem>
                      ))}
                      <CommandItem value="email sms" onSelect={() => { setSelectedId("email_sms"); setPickerOpen(false); }}>
                        <Check className={`mr-2 h-4 w-4 ${selectedId === "email_sms" ? "opacity-100" : "opacity-0"}`} />
                        Email / SMS
                      </CommandItem>
                      <CommandItem value="other not sure" onSelect={() => { setSelectedId("other"); setPickerOpen(false); }}>
                        <Check className={`mr-2 h-4 w-4 ${selectedId === "other" ? "opacity-100" : "opacity-0"}`} />
                        Other / Not sure
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>


          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-1">
            <Button variant="outline" onClick={() => setReferralOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={continueToStore} disabled={trackingDownload} className="w-full sm:w-auto bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold">
              {trackingDownload ? "Opening…" : "Continue to download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {isEditMode && !showEditor && (
        <button
          onClick={() => setShowEditor(true)}
          className="fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:opacity-90 transition-opacity"
        >
          <Settings className="h-5 w-5" />
        </button>
      )}

      {/* Editor Panel */}
      {isEditMode && showEditor && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl max-h-[55vh] overflow-y-auto">
          <div className="max-w-lg mx-auto p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Layout Editor</h3>
              <div className="flex gap-2">
                <button onClick={resetAll} className="text-muted-foreground hover:text-foreground p-1" title="Reset">
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button onClick={copyConfig} className="text-muted-foreground hover:text-foreground p-1" title="Copy config">
                  <Copy className="h-4 w-4" />
                </button>
                <button onClick={() => setShowEditor(false)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-muted/50 rounded-md p-0.5">
              <button
                onClick={() => setActiveTab("badges")}
                className={`flex-1 text-xs py-1.5 rounded transition-colors ${activeTab === "badges" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Logo & Badges
              </button>
              <button
                onClick={() => setActiveTab("button")}
                className={`flex-1 text-xs py-1.5 rounded transition-colors ${activeTab === "button" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Button & Footer
              </button>
            </div>

            {/* Badge Controls */}
            {activeTab === "badges" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SliderControl label="Logo Height" value={logoHeight} min={24} max={120} onChange={setLogoHeight} />
                <SliderControl label="Logo → Badges Gap" value={logoMarginBottom} min={0} max={100} onChange={setLogoMarginBottom} />
                <SliderControl label="Container Width" value={badgeContainerWidth} min={200} max={500} onChange={setBadgeContainerWidth} />
                <SliderControl label="Badge Spacing" value={badgeGap} min={0} max={48} onChange={setBadgeGap} />
                <SliderControl label="Vertical Offset" value={badgeOffsetY} min={-100} max={100} onChange={setBadgeOffsetY} />
                <SliderControl label="App Store Height" value={appStoreHeight} min={32} max={100} onChange={setAppStoreHeight} />
                <SliderControl label="Google Play Height" value={googlePlayHeight} min={32} max={100} onChange={setGooglePlayHeight} />
              </div>
            )}

            {/* Button Controls */}
            {activeTab === "button" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Show Button</span>
                  <Switch checked={btnVisible} onCheckedChange={setBtnVisible} />
                </div>
                {btnVisible && (
                  <>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Button Text</span>
                      <Input value={btnText} onChange={(e) => setBtnText(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <SliderControl label="Top Margin" value={btnMarginTop} min={0} max={80} onChange={setBtnMarginTop} />
                      <SliderControl label="Font Size" value={btnFontSize} min={12} max={24} onChange={setBtnFontSize} />
                      <SliderControl label="Padding X" value={btnPaddingX} min={8} max={64} onChange={setBtnPaddingX} />
                      <SliderControl label="Padding Y" value={btnPaddingY} min={4} max={24} onChange={setBtnPaddingY} />
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">Show Copyright</span>
                  <Switch checked={copyrightVisible} onCheckedChange={setCopyrightVisible} />
                </div>
              </div>
            )}

            {/* Config output */}
            <details className="text-[10px]">
              <summary className="text-muted-foreground cursor-pointer">Current config</summary>
              <pre className="text-muted-foreground bg-muted/50 rounded p-2 font-mono break-all mt-1 max-h-24 overflow-auto">
                {configSnippet}
              </pre>
            </details>
          </div>
        </div>
      )}
      <ShareWidget />
    </div>
  );
};


function SliderControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-mono">{value}px</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
    </div>
  );
}

export default SwimWeek;
