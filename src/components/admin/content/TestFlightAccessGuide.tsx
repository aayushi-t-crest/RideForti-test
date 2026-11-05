import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Plane,
  Search,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ListChecks,
  Mail,
  PlayCircle,
  Download,
  RefreshCw,
  Bug,
} from "lucide-react";

import p1Icon from "@/assets/testflight/p1-icon.jpg";
import p3_1 from "@/assets/testflight/p3-1.jpg";
import p3_2 from "@/assets/testflight/p3-2.jpg";
import p4Email from "@/assets/testflight/p4-email.jpg";
import p5Icon from "@/assets/testflight/p5-icon.jpg";
import p5Invite from "@/assets/testflight/p5-invite.jpg";
import p6AppStore from "@/assets/testflight/p6-appstore.jpg";
import p7_2 from "@/assets/testflight/p7-2.jpg";
import p7_3 from "@/assets/testflight/p7-3.jpg";
import p8Accept from "@/assets/testflight/p8-accept.jpg";
import p9Install from "@/assets/testflight/p9-install.jpg";
import p11App from "@/assets/testflight/p11-app.jpg";
import p12Auto from "@/assets/testflight/p12-autoupdate.jpg";
import p13Feedback from "@/assets/testflight/p13-feedback.jpg";
import p14Share from "@/assets/testflight/p14-share.jpg";

const META = {
  name: "RideForti – TestFlight Access Guide",
  scope: "Internal Testers Only",
  tagline: "Fully Stupid-Proof • Step-by-Step • Clean Visual Flow",
};

const Img = ({ src, alt }: { src: string; alt: string }) => (
  <figure className="rounded-md border border-border bg-background/40 p-2 inline-block max-w-full">
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="rounded max-h-[420px] w-auto mx-auto"
    />
    <figcaption className="text-[10px] text-muted-foreground mt-1.5 text-center">
      {alt}
    </figcaption>
  </figure>
);

const ImgGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap gap-3 items-start">{children}</div>
);

const Bullets = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground/90">
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ul>
);

const SubHead = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mt-3 mb-1.5">
    {children}
  </h4>
);

type Section = {
  id: string;
  num: string;
  title: string;
  icon: typeof HelpCircle;
  body: React.ReactNode;
  searchText: string;
};

const SECTIONS: Section[] = [
  {
    id: "what-is-testflight",
    num: "1",
    title: "What Is TestFlight?",
    icon: HelpCircle,
    searchText:
      "what is testflight apple app install staging production beta builds report bugs screenshots",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-foreground/90">
          TestFlight is an Apple app that lets you install apps that are not yet in the App Store.
        </p>
        <p className="text-sm text-foreground/90">You will use it to:</p>
        <Bullets
          items={[
            <>Install <span className="font-semibold">RideForti Staging</span></>,
            <>Install <span className="font-semibold">RideForti Production Beta</span></>,
            <>Receive new builds automatically</>,
            <>Report bugs with screenshots</>,
          ]}
        />
        <Img src={p1Icon} alt="TestFlight App Icon" />
      </div>
    ),
  },
  {
    id: "before-you-start",
    num: "2",
    title: "Before You Start",
    icon: ListChecks,
    searchText:
      "before you start apple developer account user testflight internal tester step a step b apple id email full name invitation no redeem codes no public links",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-foreground/90">
          RideForti internal testers must be added in <span className="font-semibold">two steps</span>:
        </p>
        <SubHead>STEP A — Added as an Apple Developer Account User</SubHead>
        <p className="text-sm text-foreground/90">Our team adds your:</p>
        <Bullets items={[<>Apple ID email</>, <>Full name</>]} />
        <p className="text-sm text-foreground/90">
          This step must be completed <span className="font-semibold">before</span> TestFlight will work.
        </p>
        <SubHead>STEP B — Added as a TestFlight Internal Tester</SubHead>
        <p className="text-sm text-foreground/90">
          Once you accept Step A, we will send you a TestFlight invitation.
        </p>
        <Bullets
          items={[
            <>No redeem codes</>,
            <>No public TestFlight links</>,
            <>Only internal invitations</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "what-you-receive",
    num: "3",
    title: "What You Will Receive",
    icon: Mail,
    searchText:
      "what you will receive two emails apple developer invitation testflight app invitation rideforti has invited you to test the app",
    body: (
      <div className="space-y-4">
        <p className="text-sm text-foreground/90">
          You will receive <span className="font-semibold">two emails</span>:
        </p>

        <SubHead>Email #1 — Apple Developer Invitation</SubHead>
        <p className="text-sm text-foreground/90">
          Subject: <span className="italic">"You've been invited to join the Apple Developer Program"</span>
        </p>
        <div className="rounded-md border border-border bg-background/40 p-3 space-y-2 text-sm text-foreground/90">
          <p className="text-xs text-muted-foreground">
            From: <span className="text-foreground">Apple Developer &lt;no_reply@email.apple.com&gt;</span>
          </p>
          <div className="flex items-center gap-2">
            <img src={p3_2} alt="Apple Developer logo" className="h-6 w-auto" />
            <span className="font-semibold">Developer</span>
          </div>
          <p>Dear letian,</p>
          <p>
            You're invited to join a development team, <mark className="bg-muted text-foreground px-1">[Redacted]</mark>{" "}
            in the Apple Developer Program so you can help develop, distribute, and manage their
            apps on the App Store. As a member of this team, you'll have access to development
            resources, tools, and events. Please accept this invitation within three days.
          </p>
          <p className="font-semibold">Accept invitation</p>
          <p>If you have any questions, contact us.</p>
          <p>Best regards,<br />Apple Developer Relations</p>
          <hr className="border-border" />
          <div className="flex items-center gap-2">
            <img src={p3_1} alt="Apple Developer logo" className="h-6 w-auto" />
            <span className="font-semibold">Developer</span>
          </div>
          <p className="font-semibold">You Have Been Invited to Join an Apple Developer Program</p>
          <p>Dear <mark className="bg-muted text-foreground px-1">[Redacted]</mark>,</p>
          <p>
            <mark className="bg-muted text-foreground px-1">[Redacted]</mark> has invited you to
            join their team in the iOS Developer Program. As a Program participant, you can access
            a wealth of development tools and resources. If you have already registered as an Apple
            Developer and are interested in accepting this invitation, click the invitation code
            below:
          </p>
          <p><mark className="bg-muted text-foreground px-1">[Redacted]</mark></p>
          <p>
            If you have not registered as an Apple Developer, you will be taken through the
            registration process after clicking the invitation code above.
          </p>
          <p>
            Please contact your Team Administrator,{" "}
            <mark className="bg-muted text-foreground px-1">[Redacted]</mark> with any questions.
            You have 30 days to respond. After 30 days, your invitation will expire.
          </p>
          <p>Best regards,<br />Apple Developer Program Support</p>
          <p className="text-[10px] text-muted-foreground">
            TM and copyright © 2013 Apple Inc. 1 Infinite Loop, MS 96-DM, Cupertino, CA 95014. All
            Rights Reserved / Keep Informed / Privacy Policy / My Apple ID
          </p>
        </div>

        <SubHead>Email #2 — TestFlight App Invitation</SubHead>
        <p className="text-sm text-foreground/90">
          Subject: <span className="italic">"RideForti has invited you to test the app"</span>
        </p>
        <ImgGrid>
          <Img src={p4Email} alt="Email invitation on a mobile device" />
          <Img src={p5Invite} alt="TestFlight email invitation with View in TestFlight button" />
          <Img src={p5Icon} alt="TestFlight App Icon" />
        </ImgGrid>
        <div className="rounded-md border border-border bg-background/40 p-3 text-sm text-foreground/90 space-y-1">
          <p>
            To start testing, open the invitation email on your iOS device and tap{" "}
            <span className="font-semibold">Open in TestFlight</span>.
          </p>
          <p>
            You must have <mark className="bg-muted text-foreground px-1">TestFlight</mark>{" "}
            installed on your device. TestFlight requires iOS 8 or later.
          </p>
          <p className="text-xs text-muted-foreground">
            To test this app, you must have TestFlight installed on your iOS device running 13.0 or
            later, Mac using macOS 12.0 or later, or Apple TV using tvOS 13.0 or later.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "step-1-accept-dev-invite",
    num: "4.1",
    title: "Step 1 — Accept the Apple Developer Invitation",
    icon: PlayCircle,
    searchText:
      "step 1 accept apple developer invitation join the team sign in apple id accept terms mandatory testflight access",
    body: (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground/90">What to do:</p>
        <Bullets
          items={[
            <>Open Email #1</>,
            <>Tap <span className="font-semibold">Join the Team</span></>,
            <>Sign in with your Apple ID</>,
            <>Accept the terms</>,
          ]}
        />
        <p className="text-sm text-foreground/90">
          This step is <span className="font-semibold">mandatory</span> before TestFlight access
          will work.
        </p>
      </div>
    ),
  },
  {
    id: "step-2-install-testflight",
    num: "4.2",
    title: "Step 2 — Install the TestFlight App",
    icon: Download,
    searchText:
      "step 2 install testflight app store search get app store connect",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-foreground/90">
          Go to the App Store → search "TestFlight" → tap GET.
        </p>
        <Img
          src={p6AppStore}
          alt="App Store search results showing TestFlight and App Store Connect with GET buttons"
        />
      </div>
    ),
  },
  {
    id: "step-3-open-invite",
    num: "4.3",
    title: "Step 3 — Open the TestFlight Invitation Email",
    icon: Mail,
    searchText:
      "step 3 open testflight invitation email rideforti has invited you to test the app view in testflight button",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-foreground/90">Now open Email #2 titled:</p>
        <p className="text-sm italic text-foreground/90">
          "RideForti has invited you to test the app"
        </p>
        <p className="text-sm text-foreground/90">
          Tap the <span className="font-semibold">"View in TestFlight"</span> button.
        </p>
        <ImgGrid>
          <Img src={p7_2} alt="Steps to get and join a beta on TestFlight" />
          <Img src={p7_3} alt="Email invitation with highlighted View in TestFlight button" />
        </ImgGrid>
      </div>
    ),
  },
  {
    id: "step-4-accept-in-testflight",
    num: "4.4",
    title: "Step 4 — Accept the Invitation in TestFlight",
    icon: PlayCircle,
    searchText:
      "step 4 accept invitation in testflight rideforti staging rideforti production beta tap accept",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-foreground/90">
          TestFlight will open automatically and show:
        </p>
        <Bullets
          items={[
            <>RideForti Staging</>,
            <>RideForti Production Beta</>,
            <>Or both</>,
          ]}
        />
        <p className="text-sm text-foreground/90">
          Tap <span className="font-semibold">ACCEPT</span>.
        </p>
        <Img src={p8Accept} alt="TestFlight invitation acceptance screen" />
      </div>
    ),
  },
  {
    id: "step-5-install-app",
    num: "4.5",
    title: "Step 5 — Install the App",
    icon: Download,
    searchText:
      "step 5 install the app install button home screen",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-foreground/90">
          After accepting, you will see the <span className="font-semibold">Install</span> button.
        </p>
        <p className="text-sm text-foreground/90">
          Tap <span className="font-semibold">INSTALL</span>.
        </p>
        <Img src={p9Install} alt="TestFlight email invitation and app installation screen" />
        <p className="text-sm text-foreground/90">
          The app will now appear on your home screen.
        </p>
      </div>
    ),
  },
  {
    id: "step-6-update",
    num: "4.6",
    title: "Step 6 — Updating to the Latest Build",
    icon: RefreshCw,
    searchText:
      "step 6 updating latest build update button yellow new build available banner popup automatic updates testflight push notifications must update test new features old versions stop working",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-foreground/90">
          Whenever a new RideForti build is uploaded, TestFlight will show one of these:
        </p>
        <Bullets
          items={[
            <>UPDATE button</>,
            <>A yellow <span className="font-semibold">New Build Available</span> banner</>,
            <>A popup asking you to update</>,
          ]}
        />
        <p className="text-sm text-foreground/90">
          Here is the <span className="font-semibold">accurate TestFlight UI</span> for updates:
        </p>
        <ImgGrid>
          <Img src={p11App} alt="TestFlight app details screen with OPEN, automatic updates, notifications" />
          <Img src={p12Auto} alt="Dialog asking to turn on automatic updates for TestFlight" />
        </ImgGrid>

        <SubHead>What you need to do</SubHead>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-foreground/90">
          <li>Open <span className="font-semibold">TestFlight</span> app</li>
          <li>Tap <span className="font-semibold">RideForti</span></li>
          <li>Tap <span className="font-semibold">UPDATE</span></li>
          <li>Wait for installation to finish</li>
        </ol>

        <SubHead>Notes</SubHead>
        <Bullets
          items={[
            <>You <span className="font-semibold">must</span> update to test new features</>,
            <>Old versions may stop working</>,
            <>You will receive TestFlight push notifications when a new build is ready</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "step-7-report-bugs",
    num: "4.7",
    title: "Step 7 — How to Report Bugs",
    icon: Bug,
    searchText:
      "step 7 report bugs send beta feedback attach screenshots write comments submit issues share sheet airdrop messages mail",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-foreground/90">In TestFlight:</p>
        <Bullets
          items={[
            <>Select <span className="font-semibold">RideForti</span></>,
            <>Tap <span className="font-semibold">Send Beta Feedback</span></>,
          ]}
        />
        <p className="text-sm text-foreground/90">Here you can:</p>
        <Bullets
          items={[
            <>Attach screenshots</>,
            <>Write comments</>,
            <>Submit issues</>,
          ]}
        />
        <ImgGrid>
          <Img src={p13Feedback} alt="TestFlight app interface showing Send Beta Feedback" />
          <Img src={p14Share} alt="iOS share sheet with Share Beta Feedback option" />
        </ImgGrid>
      </div>
    ),
  },
];

const TestFlightAccessGuide = () => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.num.includes(q) ||
        s.searchText.includes(q)
    );
  }, [query]);

  const allOpen = open.length === SECTIONS.length;
  const toggleAll = () => setOpen(allOpen ? [] : SECTIONS.map((s) => s.id));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shrink-0">
            <Plane className="h-5 w-5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">{META.name}</h2>
            <p className="text-xs text-muted-foreground">{META.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <Badge variant="secondary">{META.scope}</Badge>
          </div>
        </div>
      </div>

      {/* Search + controls */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sections..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="fortiGhost" size="sm" onClick={toggleAll}>
          {allOpen ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 mr-1" />
              Collapse all
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
              Expand all
            </>
          )}
        </Button>
      </div>

      {/* TOC */}
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5 px-0.5">
          Sections
        </p>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#tf-sec-${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                setOpen((prev) => (prev.includes(s.id) ? prev : [...prev, s.id]));
                setTimeout(() => {
                  document
                    .getElementById(`tf-sec-${s.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
              }}
              className="group inline-flex items-center gap-2 text-[11px] pl-1.5 pr-2.5 py-1 rounded-full border border-border/70 bg-background/60 hover:border-white hover:bg-background text-muted-foreground hover:text-foreground transition-all"
            >
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-foreground/10 text-foreground/80 text-[10px] font-semibold group-hover:bg-foreground group-hover:text-background transition-colors">
                {s.num}
              </span>
              <span className="leading-none">{s.title}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Sections */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          No sections match "{query}".
        </div>
      ) : (
        <Accordion
          type="multiple"
          value={open}
          onValueChange={setOpen}
          className="space-y-2"
        >
          {filtered.map((s) => {
            const Icon = s.icon;
            return (
              <AccordionItem
                key={s.id}
                value={s.id}
                id={`tf-sec-${s.id}`}
                className="rounded-lg border border-border bg-card px-4 scroll-mt-24"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-8 w-8 rounded bg-white flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-black" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Section {s.num}</p>
                      <p className="font-semibold text-sm">{s.title}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-1">{s.body}</AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};

export default TestFlightAccessGuide;
