import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBackNav } from "@/contexts/BackNavContext";
import {
  BookOpen, CheckCircle2, Lock, Unlock, GraduationCap,
  Sparkles, Megaphone, Users, MessageCircle, QrCode,
  Smile, Shirt, ShieldCheck, MapPin, Eye, ShieldAlert,
  Camera, Handshake, Star, Mic, Gift, Video, Target, Award,
  RefreshCw, Crown, Info, Layers, Rocket, Smartphone, Download,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Forti Ambassador Academy (FAA) — Core Curriculum + Activation Layer */
/* ------------------------------------------------------------------ */

interface LessonSection { heading: string; body?: string; bullets?: string[]; }
interface Module {
  key: string;
  title: string;
  icon: typeof BookOpen;
  summary: string;
  group: "core" | "activation";
  comingSoon?: boolean;
  sections: LessonSection[];
}

const MODULES: Module[] = [
  /* ---------------- FORTI FOUNDATIONS ---------------- */
  {
    key: "what-is-forti",
    title: "What is Forti?",
    icon: Info,
    group: "core",
    summary: "Start here. Know the brand before you represent it.",
    sections: [
      { heading: "The one-line answer", body: "Forti is a private, security-first rideshare platform built for high-trust mobility — executive-level drivers, optional armed and unarmed protection, and a luxury experience from booking to drop-off." },
      { heading: "Who it's for", bullets: [
        "Executives, professionals, and high-net-worth riders",
        "Nightlife guests who want a safer, premium way home",
        "Families and parents who want vetted, accountable drivers",
        "Anyone tired of the standard rideshare experience",
      ]},
      { heading: "What makes Forti different", bullets: [
        "Vetted, trained drivers — not gig drivers",
        "Optional security guards (armed or unarmed) on any ride",
        "Premium fleet — Sedan and SUV, never compromised",
        "Tiered membership: Forti Black, Forti Black+, Forti Black X",
        "Built-in support and accountability — every ride is logged",
      ]},
      { heading: "What Forti is NOT", bullets: [
        "Not a budget rideshare",
        "Not Uber or Lyft with a coat of paint",
        "Not a livery service — it's on-demand, app-based",
        "Not for everyone — and that's the point",
      ]},
      { heading: "Your job as an ambassador", body: "You don't sell Forti. You introduce people to a higher standard and let the product close itself. Your role is to make Forti unforgettable in the first 10 seconds." },
    ],
  },
  {
    key: "how-forti-works",
    title: "How Forti Works",
    icon: Layers,
    group: "core",
    summary: "Walk a guest through the experience end-to-end.",
    sections: [
      { heading: "Step 1 — Download & sign up", body: "Rider downloads the app, creates an account, verifies their phone, and chooses a membership tier (Free, Forti+, or Forti X)." },
      { heading: "Step 2 — Book a ride", bullets: [
        "Choose vehicle type: Sedan or SUV",
        "Add a security guard if desired (armed or unarmed)",
        "Pick guard attire: Civilian, Tactical, or Suit",
        "Set pickup and drop-off, confirm the price",
      ]},
      { heading: "Step 3 — Match & ETA", body: "A vetted Forti driver (and guard, if requested) is dispatched. Rider sees driver photo, vehicle, plate, and live ETA." },
      { heading: "Step 4 — The ride", body: "Driver arrives in uniform, in a clean premium vehicle. Guard (if booked) handles the door and any pickup security. The ride runs in silence unless the rider opens conversation." },
      { heading: "Step 5 — Drop-off & rating", body: "Driver hands off cleanly. Rider rates the driver and the experience. Every ride is logged for accountability." },
      { heading: "What you tell guests", body: "\"Download, pick your car, add security if you want it, ride. That's it.\" Then stop talking." },
    ],
  },
  {
    key: "features-overview",
    title: "Forti Features Overview",
    icon: Rocket,
    group: "core",
    summary: "Know every feature so you can answer fast.",
    sections: [
      { heading: "Membership tiers", bullets: [
        "Forti Black (Free) — pay-per-ride, full access to vetted drivers",
        "Forti Black+ ($9.97/mo) — priority dispatch, member pricing",
        "Forti Black X ($19.97/mo) — top-tier perks, included guard discounts, premium support",
      ]},
      { heading: "Vehicle options", bullets: [
        "Sedan — discreet, executive, daily-driver luxury",
        "SUV — for groups, gear, or higher-profile rides",
      ]},
      { heading: "Security add-ons", bullets: [
        "Unarmed guard — presence, escort, door service",
        "Armed guard — licensed, vetted, situational protection",
        "Attire choice: Civilian, Tactical, or Suit",
      ]},
      { heading: "Trust & safety", bullets: [
        "Every driver background-checked and trained at the Forti Driver Academy",
        "Every guard licensed and certified",
        "24/7 in-app support with human handoff",
        "Live ride tracking, share-trip with contacts",
      ]},
      { heading: "Use cases", bullets: [
        "Nightlife — safer than driving, more discreet than Uber",
        "Executive travel — airport, meetings, off-sites",
        "Events — VIP arrivals, post-event pickups",
        "Family — vetted drivers for partners, parents, teens",
      ]},
      { heading: "Coming up later in the academy", body: "You'll get an in-app walkthrough showing exactly what the rider sees, plus your personal QR + download links to share." },
    ],
  },
  {
    key: "app-walkthrough",
    title: "App Walkthrough",
    icon: Smartphone,
    group: "core",
    comingSoon: true,
    summary: "Coming soon — a guided tour of the rider app.",
    sections: [
      { heading: "What this module will cover", bullets: [
        "Screen-by-screen walkthrough of the Forti rider app",
        "Booking flow demo: vehicle, security, pickup, dropoff",
        "Membership upgrade flow",
        "How riders add a guard and choose attire",
        "Live trip view, share-trip, and in-app support",
      ]},
      { heading: "Why it matters", body: "When a guest hesitates at install, you'll be able to walk them through exactly what happens next. Confidence in the product = confidence in the pitch." },
      { heading: "Status", body: "We're recording the production app walkthrough now. This module will unlock automatically once published — you'll see it appear in your Academy." },
    ],
  },
  {
    key: "download-links-qr",
    title: "Download Links & QR Codes",
    icon: Download,
    group: "core",
    summary: "Your toolkit for every install — iOS, Android, and your personal QR.",
    sections: [
      { heading: "Where to find your links", body: "Your personal QR code and unique referral link live in your Ambassador dashboard. Every download from these tools is tracked to you and feeds your Forti Ambassador Score." },
      { heading: "What we host for you", bullets: [
        "Apple App Store download link (iOS)",
        "Google Play download link (Android)",
        "Universal smart link — auto-detects the device",
        "Your personal QR code (printable + on-screen)",
        "Your unique referral URL with attribution baked in",
      ]},
      { heading: "When to use which", bullets: [
        "QR code — in-person at events, the default tool",
        "Smart link — DMs, texts, social bios (auto-routes iOS vs Android)",
        "Direct App Store / Play Store links — when a guest asks specifically",
      ]},
      { heading: "Best practices", bullets: [
        "Always confirm the install on-screen before walking away",
        "Carry a printed QR card as a backup to your phone",
        "Test your links weekly — broken links cost you credit",
        "Never share another ambassador's link or QR",
      ]},
      { heading: "Tracking", body: "Every QR scan and link click is attributed to you in real time. Check your dashboard after each event to see scans, installs, and conversion rate." },
      { heading: "Support", body: "If your QR or link ever fails, contact ops immediately — do not improvise with a generic store link, or you lose attribution on every install." },
    ],
  },

  /* ---------------- CORE CURRICULUM ---------------- */
  {
    key: "brand-standard",
    title: "Forti Brand Standard & Presence",
    icon: Crown,
    group: "core",
    summary: "Carry the brand before the app is ever downloaded.",
    sections: [
      { heading: "What Forti is", body: "Forti is an experience, not transportation. Every interaction reinforces a luxury, executive-level standard." },
      { heading: "Energy you must project", bullets: [
        "Composed — never frantic or eager",
        "Confident — own the room without performing",
        "Intentional — every word and movement has purpose",
      ]},
      { heading: "First impression control", body: "You are the brand before the app is downloaded. Posture, eye contact, and tone shape perception in the first three seconds." },
    ],
  },
  {
    key: "guest-interaction",
    title: "Guest Interaction & Conversion",
    icon: Users,
    group: "core",
    summary: "Sales without feeling like sales.",
    sections: [
      { heading: "Approach without pressure", body: "Open with observation, not pitch. Compliment the moment, the venue, or the energy — never the person physically." },
      { heading: "Open conversations naturally", bullets: [
        "\"How's your night going?\" — never \"Hey, can I tell you about…\"",
        "Mirror their energy level",
        "Hold a relaxed stance — angled, not face-to-face",
      ]},
      { heading: "Explain Forti in <10 seconds", body: "\"It's a private rideshare with executive drivers and optional security — built for nights like this.\" Then stop talking." },
      { heading: "Transition to download", body: "When they ask one follow-up question, that's your green light to surface the QR." },
    ],
  },
  {
    key: "download-system",
    title: "Download Conversion System",
    icon: QrCode,
    group: "core",
    summary: "Every interaction is measurable.",
    sections: [
      { heading: "Use your QR every time", body: "Your personal QR + referral link tracks every download to you. No QR scan = no credit." },
      { heading: "When to push vs step back", bullets: [
        "Push when they ask a second question",
        "Step back if they look at their phone or partner",
        "Never chase — exit cleanly with \"Have a great night.\"",
      ]},
      { heading: "Close cleanly", body: "After the scan: confirm install on screen, thank them, then disengage. Lingering kills the luxury feel." },
    ],
  },
  {
    key: "social-awareness",
    title: "High-End Social Awareness",
    icon: Eye,
    group: "core",
    summary: "Reading the room is the entire skill.",
    sections: [
      { heading: "VIP vs casual crowd", body: "VIPs respond to discretion and brevity. Casual crowds respond to energy and curiosity. Calibrate before you open your mouth." },
      { heading: "Who to approach", bullets: [
        "Groups already engaged in conversation, not isolated individuals",
        "People glancing around — they're between moments",
        "Avoid intoxicated, distressed, or already-leaving guests",
      ]},
      { heading: "Timing > volume", body: "Ten high-quality interactions outperform fifty low-quality ones. Quality protects the brand." },
    ],
  },
  {
    key: "appearance",
    title: "Appearance & Presentation",
    icon: Shirt,
    group: "core",
    summary: "This is not optional — this is the product.",
    sections: [
      { heading: "Dress code by event", bullets: [
        "Default: all-black, tailored, no logos",
        "VIP/flagship: Forti-issued blazer, polished shoes",
        "Casual day events: Forti tee + black pants, clean sneakers",
      ]},
      { heading: "Grooming expectations", body: "Hair styled, facial hair trimmed, nails clean, fragrance light. No exceptions on event nights." },
      { heading: "Body language", bullets: [
        "Shoulders back, chin level",
        "Open stance — never crossed arms",
        "Smile with your eyes, not your teeth",
      ]},
    ],
  },
  {
    key: "uniform-expectations",
    title: "Uniform Expectations",
    icon: Shirt,
    group: "core",
    summary: "Event-specific. Issued at least 72 hours before call time.",
    sections: [
      { heading: "How uniform calls work", body: "Uniform is never one-size-fits-all. Every event has its own dress standard based on venue, crowd, and brand goals — and you'll receive your specific uniform expectation no later than 72 hours before the event start time." },
      { heading: "Why event-based", bullets: [
        "VIP/flagship events require Forti-issued blazer and polished shoes",
        "Nightlife activations may call for all-black tailored streetwear",
        "Daytime / lifestyle events shift to Forti tee + black pants + clean sneakers",
        "Brand partnerships may require co-branded apparel issued on-site",
      ]},
      { heading: "The 72-hour rule", body: "Ops will push your uniform brief at least 72 hours before the event via email and your ambassador dashboard. You are responsible for confirming receipt and flagging any sizing or availability issues immediately — not the day of." },
      { heading: "What you must do", bullets: [
        "Acknowledge the uniform brief within 24 hours of receiving it",
        "Have the full kit cleaned, pressed, and ready the night before",
        "Bring a backup (extra shirt, lint roller, spare laces)",
        "Arrive in uniform — never change on-site unless instructed",
      ]},
      { heading: "Non-compliance", body: "Showing up out-of-uniform is treated the same as missing the shift. Repeat issues lower your Forti Ambassador Score and affect tier eligibility." },
    ],
  },
  {
    key: "conduct",
    title: "Professional Conduct & Boundaries",
    icon: ShieldCheck,
    group: "core",
    summary: "Behavior that protects the brand and you.",
    sections: [
      { heading: "Hard rules", bullets: [
        "No drinking on shift, ever",
        "No phone numbers exchanged with guests",
        "No flirting or physical contact",
        "No promoting other brands or side hustles",
      ]},
      { heading: "Why these exist", body: "One viral clip of an ambassador crossing a line undoes months of brand work. The standard is non-negotiable." },
    ],
  },
  {
    key: "ops-flow",
    title: "Event Operations & Flow",
    icon: MapPin,
    group: "core",
    summary: "Work with — not against — drivers and guards.",
    sections: [
      { heading: "Your zone", body: "You'll be assigned a position by the lead. Stay in your zone unless the lead moves you." },
      { heading: "Working with drivers + guards", bullets: [
        "Never block the pickup curb",
        "Hand off VIP guests to the guard, not the driver, first",
        "Use radio/group chat for status — no shouting",
      ]},
      { heading: "Don't disrupt operations", body: "If a pickup is in motion, pause your pitch. Forti's job is the ride; yours is the pipeline." },
    ],
  },
  {
    key: "safety",
    title: "Safety & Situational Awareness",
    icon: ShieldAlert,
    group: "core",
    summary: "Stay aware. Disengage early. Escalate fast.",
    sections: [
      { heading: "Stay aware", body: "Scan exits, watch for crowd shifts, note who looks agitated. Awareness is non-tactical — you observe, you don't intervene." },
      { heading: "Disengage early", bullets: [
        "If someone is intoxicated or aggressive, end the interaction politely",
        "Move toward staff or a guard, never toward an exit alone with a stranger",
      ]},
      { heading: "Escalation", body: "Flag the on-site lead or guard immediately. Do not handle conflict yourself." },
    ],
  },
  {
    key: "messaging",
    title: "Brand Protection & Messaging",
    icon: Megaphone,
    group: "core",
    summary: "Stay aligned with Forti positioning.",
    sections: [
      { heading: "Say", bullets: [
        "\"Private rideshare with executive drivers.\"",
        "\"Optional armed and unarmed protection.\"",
        "\"Built for high-trust mobility.\"",
      ]},
      { heading: "Never say", bullets: [
        "Pricing comparisons to Uber/Lyft",
        "Promises about wait times, driver availability, or guarantees",
        "Anything about future features that aren't live",
      ]},
    ],
  },
  {
    key: "social-media",
    title: "Social Media & Content Conduct",
    icon: Camera,
    group: "core",
    summary: "Protect the brand image online.",
    sections: [
      { heading: "What you can post", body: "Behind-the-scenes shots of yourself in uniform, vehicle exteriors at events, cleared interview clips." },
      { heading: "What requires approval", bullets: [
        "Anything featuring guests' faces",
        "Anything with the Forti logo as the focus",
        "Captions naming partners, venues, or sponsors",
      ]},
      { heading: "Exclusivity protection", body: "Never use volume hashtags or low-tier promo language. Forti's tone is selective." },
    ],
  },
  {
    key: "boundaries",
    title: "Professional Boundaries",
    icon: Handshake,
    group: "core",
    summary: "No side deals. No off-platform promotion.",
    sections: [
      { heading: "Hard lines", bullets: [
        "No soliciting clients for personal services",
        "No \"text me directly\" arrangements",
        "No leveraging Forti events for outside business",
      ]},
      { heading: "Why", body: "Side deals fracture trust with venues, partners, and the platform. Violations end the relationship." },
    ],
  },
  {
    key: "advanced",
    title: "Advanced Modules (Optional)",
    icon: Star,
    group: "core",
    summary: "Unlock for Premium and Elite tiers.",
    sections: [
      { heading: "VIP psychology", body: "High-net-worth guests value discretion, low-pressure interaction, and being recognized without being named." },
      { heading: "Event hosting presence", body: "Learn to anchor a Forti zone — guests come to you because the energy is right." },
      { heading: "B2B lead spotting", bullets: [
        "Identify promoters, venue owners, sponsors",
        "Capture name + venue + context — pass to ops, never pitch them yourself",
      ]},
    ],
  },

  /* ---------------- ACTIVATION LAYER ---------------- */
  {
    key: "street-interviews",
    title: "Street Interview System",
    icon: Mic,
    group: "activation",
    summary: "Controlled, brand-safe interview formats.",
    sections: [
      { heading: "Format A — Luxury vs Reality", body: "\"What's the nicest car you've ever been in?\" / \"What's your worst Uber experience?\" Transition: \"That's exactly why Forti exists.\"" },
      { heading: "Format B — This or That", body: "Rolls Royce vs G-Wagon. Black car vs standard ride. Easy engagement, low friction." },
      { heading: "Format C — Night Out Check", body: "\"How are you getting home tonight?\" Then introduce Forti." },
      { heading: "Hard rules", bullets: [
        "Clips: 10–20 seconds max",
        "Always get verbal consent on camera",
        "No harassment, no pressure, brand-safe language only",
      ]},
    ],
  },
  {
    key: "rewards",
    title: "Interactive Reward System",
    icon: Gift,
    group: "activation",
    summary: "Drive downloads fast — without cheapening the brand.",
    sections: [
      { heading: "Instant rewards", body: "\"Download Forti → get [perk].\" Free ride credit, VIP access, drink ticket (if venue-allowed)." },
      { heading: "Gamified interactions", bullets: [
        "Spin the wheel",
        "Trivia: \"Guess the car price\"",
        "Reward unlock requires the install",
      ]},
      { heading: "Tiered referral", body: "Download = entry. Refer 3 friends = bigger reward. They become mini-ambassadors." },
    ],
  },
  {
    key: "tracking",
    title: "QR & Tracking Activation",
    icon: Target,
    group: "activation",
    summary: "Every download must be tracked to you.",
    sections: [
      { heading: "Your kit", bullets: [
        "Unique QR code (printed + on-screen)",
        "Unique referral link",
        "Event-based tracking enabled before doors",
      ]},
      { heading: "What we measure", bullets: [
        "Downloads per ambassador",
        "Engagement rate (scans / interactions)",
        "Conversion rate (installs / scans)",
      ]},
      { heading: "Why", body: "These three numbers feed your Forti Ambassador Score. No tracking, no tier movement." },
    ],
  },
  {
    key: "content",
    title: "Content Engine",
    icon: Video,
    group: "activation",
    summary: "Every activation = content pipeline.",
    sections: [
      { heading: "Capture types", bullets: [
        "Street clips — interviews, reactions, quick takes",
        "Luxury visuals — vehicles arriving, guest reactions",
        "Social proof — \"I just downloaded it\" / \"this is fire\"",
      ]},
      { heading: "Where it goes", body: "Captured clips become paid ads, organic posts, and event recap reels. You're feeding the marketing machine." },
    ],
  },
  {
    key: "behavior-modes",
    title: "Ambassador Behavior Strategy",
    icon: Smile,
    group: "activation",
    summary: "Operate in three deliberate modes.",
    sections: [
      { heading: "Mode 1 — Attraction", body: "Look the part. Create curiosity by simply being present, composed, and on-brand." },
      { heading: "Mode 2 — Engagement", body: "Initiate. Run interview scripts, open conversations, work the reward system." },
      { heading: "Mode 3 — Conversion", body: "Push the QR. Close the install. Most brands fail because they stop at Mode 1 — you don't." },
    ],
  },
];

/* --------------------------- FINAL CERTIFICATION --------------------------- */
const PASS_PCT = 85;
const STORAGE_KEY = (uid: string) => `forti_ambassador_cert_${uid}`;

interface Question { q: string; choices: string[]; correct: number; }
const QUESTIONS: Question[] = [
  {
    q: "A guest asks how Forti is different from Uber. Best response?",
    choices: [
      "\"It's cheaper than Uber Black.\"",
      "\"Private rideshare with executive drivers and optional security — built for nights like this.\"",
      "\"Faster than Uber, guaranteed under 5 minutes.\"",
      "\"It's an app, you should just try it.\"",
    ],
    correct: 1,
  },
  {
    q: "You scanned three QRs but none installed. What now?",
    choices: [
      "Stop using the QR — switch to verbal pitches only",
      "Pressure the next group harder until one installs",
      "Step back, reset your energy, and re-engage with a new opener",
      "Tell ops the QR is broken",
    ],
    correct: 2,
  },
  {
    q: "An intoxicated guest gets aggressive after a pitch. You should:",
    choices: [
      "De-escalate verbally and try to recover the install",
      "Disengage politely and notify the on-site lead or guard",
      "Walk to a quiet corner with them to talk",
      "Film it for content",
    ],
    correct: 1,
  },
  {
    q: "Which is a violation of professional boundaries?",
    choices: [
      "Handing a VIP guest to the assigned guard before the driver",
      "Giving a guest your personal number to \"book direct\"",
      "Wearing the Forti-issued blazer at a flagship event",
      "Capturing a 15-second consented interview clip",
    ],
    correct: 1,
  },
  {
    q: "You spot a venue owner at the event. Correct action?",
    choices: [
      "Pitch them on a partnership immediately",
      "Note name + venue + context and pass it to ops as a B2B lead",
      "Take a selfie and post it",
      "Offer them a download bonus",
    ],
    correct: 1,
  },
  {
    q: "Which clip is safe to post without approval?",
    choices: [
      "A guest's face during a download moment",
      "The Forti logo as the focal point of the post",
      "A behind-the-scenes shot of yourself in uniform at your zone",
      "A caption naming the venue and sponsor",
    ],
    correct: 2,
  },
  {
    q: "Best opener for an unfamiliar group?",
    choices: [
      "\"Hey, can I tell you about Forti real quick?\"",
      "\"You guys downloaded Forti yet?\"",
      "\"How's your night going?\"",
      "\"You look like you'd love this app…\"",
    ],
    correct: 2,
  },
  {
    q: "Which behavior matches Mode 3 — Conversion?",
    choices: [
      "Standing near the entrance looking polished",
      "Running an interview format with a small crowd",
      "Surfacing the QR and confirming the install on-screen",
      "Reviewing your Ambassador Score",
    ],
    correct: 2,
  },
  {
    q: "Which is consistent with Forti's tone on social?",
    choices: [
      "Volume hashtags and trend-jacking",
      "\"DM us for promo!\" captions",
      "Selective, exclusive language with cinematic visuals",
      "Tagging every guest you interact with",
    ],
    correct: 2,
  },
  {
    q: "What primarily controls your tier (CA → PA → EA)?",
    choices: [
      "Hours logged at events",
      "Training completion + downloads + event rating + conduct",
      "Number of selfies posted",
      "Friendship with the ops lead",
    ],
    correct: 1,
  },
];

const AmbassadorLearningCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const uid = user?.id || "anon";
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [showTest, setShowTest] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(QUESTIONS.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    try {
      const c = localStorage.getItem(`forti_ambassador_lessons_${uid}`);
      if (c) setCompleted(new Set(JSON.parse(c)));
      setPassed(localStorage.getItem(STORAGE_KEY(uid)) === "1");
    } catch { /* ignore */ }
  }, [uid]);

  const markComplete = (key: string) => {
    const next = new Set(completed);
    next.add(key);
    setCompleted(next);
    localStorage.setItem(`forti_ambassador_lessons_${uid}`, JSON.stringify([...next]));
  };

  const score = useMemo(() => {
    const correct = answers.reduce<number>((acc, a, i) => acc + (a === QUESTIONS[i].correct ? 1 : 0), 0);
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
      toast({ title: `Passed — ${score}%`, description: "Forti Ambassador certification unlocked." });
    } else {
      toast({ title: `Did not pass — ${score}%`, description: `You need ${PASS_PCT}%. Review the modules and retake.`, variant: "destructive" });
    }
  };

  const resetTest = () => {
    setAnswers(new Array(QUESTIONS.length).fill(null));
    setSubmitted(false);
  };

  const trackableModules = MODULES.filter((m) => !m.comingSoon);
  const completionPct = Math.round((completed.size / trackableModules.length) * 100);

  // Unified back button
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
            Pass with {PASS_PCT}% to certify
          </div>
        </div>

        {passed && !submitted && (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Award className="h-5 w-5 text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold">You've already passed this test.</p>
                <p className="text-xs text-muted-foreground">Retaking won't lock you out — your certification remains.</p>
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border">
          <div className="text-sm">
            {submitted ? (
              <span className={score >= PASS_PCT ? "text-emerald-500 font-semibold" : "text-red-500 font-semibold"}>
                Score: {score}% {score >= PASS_PCT ? "— Passed" : `— Need ${PASS_PCT}%`}
              </span>
            ) : (
              <span className="text-muted-foreground">{answers.filter((a) => a !== null).length} / {QUESTIONS.length} answered</span>
            )}
          </div>
          {submitted ? (
            <Button onClick={resetTest} variant="outline" size="sm" className="w-full sm:w-auto">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retake
            </Button>
          ) : (
            <Button onClick={submitTest} variant="forti" size="sm" className="w-full sm:w-auto">Submit test</Button>
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
                        <span className="text-white mt-1">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end pt-2 border-t border-border">
          <Button
            variant="forti"
            size="sm"
            onClick={() => { markComplete(activeModule.key); setActiveModule(null); }}
            className="w-full sm:w-auto"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark complete
          </Button>
        </div>
      </div>
    );
  }

  /* -------------------------------- LIST VIEW -------------------------------- */
  const coreModules = MODULES.filter((m) => m.group === "core");
  const activationModules = MODULES.filter((m) => m.group === "activation");
  const allDone = completed.size >= trackableModules.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-white" />
        <h2 className="font-semibold text-sm">Forti Ambassador Academy</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Complete the core curriculum and the activation layer, then pass the certification with {PASS_PCT}% to earn your Certified Ambassador (CA) badge.
      </p>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Module progress</span>
            <span className="text-xs text-muted-foreground">{completed.size} / {trackableModules.length}</span>
          </div>
          <Progress value={completionPct} className="h-2" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
            <div className="flex items-center gap-2 text-xs">
              {passed ? (
                <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                  <Unlock className="h-3.5 w-3.5" /> Certified Ambassador
                </span>
              ) : allDone ? (
                <span className="inline-flex items-center gap-1 text-primary font-semibold">
                  <Sparkles className="h-3.5 w-3.5" /> Ready to certify
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" /> Finish modules to unlock
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant={allDone || passed ? "forti" : "outline"}
              disabled={!allDone && !passed}
              onClick={() => setShowTest(true)}
              className="w-full sm:w-auto"
            >
              <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
              {passed ? "Review certification" : "Take certification"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Core Curriculum</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {coreModules.map((m) => {
            const Icon = m.icon;
            const done = completed.has(m.key);
            const locked = !!m.comingSoon;
            return (
              <button
                key={m.key}
                onClick={() => { if (!locked) setActiveModule(m); }}
                disabled={locked}
                className={`text-left rounded-lg border border-border bg-card p-3 transition-colors flex items-start gap-3 ${
                  locked ? "opacity-60 cursor-not-allowed" : "hover:border-white/40 hover:bg-card/80"
                }`}
              >
                <div className="h-9 w-9 rounded-md bg-white flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm truncate">{m.title}</h4>
                    {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                    {locked && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/20 text-muted-foreground">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{m.summary}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activation Layer</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {activationModules.map((m) => {
            const Icon = m.icon;
            const done = completed.has(m.key);
            return (
              <button
                key={m.key}
                onClick={() => setActiveModule(m)}
                className="text-left rounded-lg border border-border bg-card p-3 hover:border-white/40 hover:bg-card/80 transition-colors flex items-start gap-3"
              >
                <div className="h-9 w-9 rounded-md bg-white flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">{m.title}</h4>
                    {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{m.summary}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AmbassadorLearningCenter;
