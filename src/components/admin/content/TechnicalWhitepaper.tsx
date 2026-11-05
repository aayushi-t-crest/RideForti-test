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
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  Workflow,
  KeySquare,
  Plug,
  Terminal,
  ShieldCheck,
  Activity,
  HardDrive,
  Lock,
  Rocket,
  AlertTriangle,
} from "lucide-react";

const META = {
  name: "Technical White Paper: RideForti Ecosystem",
  project: "RideForti",
  version: "1.0",
  preparedBy: "RideForti Technical Team",
  classification: "Confidential & Proprietary",
};

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[12px] font-mono">
    {children}
  </code>
);

const Pre = ({ children }: { children: React.ReactNode }) => (
  <pre className="rounded-md border border-border bg-background/60 p-3 text-[12px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
    {children}
  </pre>
);

const Link = ({ href }: { href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="text-foreground underline underline-offset-2 hover:text-foreground/80 break-all"
  >
    {href}
  </a>
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
  icon: typeof FileText;
  body: React.ReactNode;
  searchText: string;
};

const SECTIONS: Section[] = [
  {
    id: "executive-summary",
    num: "1",
    title: "Executive Summary",
    icon: FileText,
    searchText:
      "executive summary mobility security platform laravel flutter integrations limitations constraints t2.micro firebase realtime offline mode",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-foreground/90">
          RideForti is a multi-sided mobility and security platform providing seamless
          transportation and protection services. The ecosystem consists of:
        </p>
        <Bullets
          items={[
            "A monolithic Laravel backend",
            "A cross-platform Flutter mobile app (iOS + Android)",
            "Multiple third-party integrations for payments, geolocation, verification, notifications, and communication",
          ]}
        />
        <SubHead>1.1 System Limitations & Constraints</SubHead>
        <Bullets
          items={[
            <>
              <span className="font-semibold">Vertical Scaling Limits</span> — t2.micro EC2
              instance suitable for ~1,000 MAU; requires larger instance for growth.
            </>,
            <>
              <span className="font-semibold">Real-time Latency</span> — Firebase Realtime DB
              latency varies depending on US-East-1 region traffic.
            </>,
            <>
              <span className="font-semibold">Offline Mode</span> — App requires an active
              internet connection for requesting rides and real-time tracking.
            </>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "system-architecture",
    num: "2",
    title: "System Architecture",
    icon: Layers,
    searchText:
      "system architecture backend laravel monolithic rest api service layer booking payment event driven queues supervisor retries swagger sanctum bearer staging production flutter getx bloc localization dio mysql firebase firestore eloquent migrations",
    body: (
      <div className="space-y-4">
        <SubHead>2.1 Backend Architecture (Laravel)</SubHead>
        <Bullets
          items={[
            <>Pattern: Monolithic REST API</>,
            <>Service Layer Pattern using dedicated service classes (BookingService, PaymentService, etc.)</>,
            <>
              <span className="font-semibold">Event-Driven Processing & Queues</span> — Laravel
              queues + events/listeners for background tasks, notifications, automations
            </>,
          ]}
        />
        <p className="text-sm font-semibold text-foreground/90">Queue & Background Jobs Handling:</p>
        <Bullets
          items={[
            <>Queues are used for async operations like push notifications (FCM), Stripe payments, emails/SMS (Twilio)</>,
            <>Worker Setup: Managed via Supervisor using <Code>queue:work</Code></>,
            <>
              Retry Policies:
              <ul className="list-[circle] pl-5 mt-1 space-y-1">
                <li>Standard 3 retries for non-critical jobs</li>
                <li>Exponential backoff for payment & external APIs</li>
              </ul>
            </>,
            <>
              <span className="font-semibold">API Documentation</span> — Swagger (OpenAPI 3.0)
              available at <Code>/api/documentation</Code>
            </>,
          ]}
        />
        <SubHead>Backend API Access Model</SubHead>
        <Bullets
          items={[
            <>Authentication: Laravel Sanctum (Bearer Token required)</>,
            <>Token Lifecycle: Generated at login, stored securely, manually revoked if needed</>,
          ]}
        />
        <p className="text-sm font-semibold text-foreground/90">Headers:</p>
        <Pre>{`Accept: application/json
Authorization: Bearer <token>`}</Pre>
        <p className="text-sm font-semibold text-foreground/90">Environment Context:</p>
        <Bullets
          items={[
            <>Staging: <Code>api.staging.rideforti.com</Code> (mock/test data)</>,
            <>Production: <Code>api.rideforti.com</Code> (live transactions)</>,
          ]}
        />

        <SubHead>2.2 Frontend Architecture (Flutter)</SubHead>
        <p className="text-sm font-semibold text-foreground/90">Framework:</p>
        <Bullets items={[<>Flutter (iOS + Android)</>, <>SDK: <Code>^3.7.0</Code></>]} />
        <p className="text-sm font-semibold text-foreground/90">Design System:</p>
        <Bullets
          items={[
            <>Custom UI system</>,
            <>ResponsiveBuilder for phones & tablets</>,
            <>Consistent typography and colors</>,
          ]}
        />
        <p className="text-sm font-semibold text-foreground/90">State Management:</p>
        <Bullets
          items={[
            <>GetX for dependency injection, routing, and reactive state</>,
            <>BLoC only for complex realtime components</>,
          ]}
        />
        <p className="text-sm font-semibold text-foreground/90">Localization:</p>
        <Bullets
          items={[
            <>AppTranslation service</>,
            <>JSON files in <Code>assets/translations/</Code></>,
            <>Languages: English, Spanish, French, Chinese</>,
          ]}
        />
        <p className="text-sm font-semibold text-foreground/90">Environment Management:</p>
        <Bullets
          items={[
            <><Code>.env.staging</Code> → staging backend</>,
            <><Code>.env.prod</Code> → production backend</>,
          ]}
        />
        <p className="text-sm font-semibold text-foreground/90">Networking:</p>
        <Bullets
          items={[
            <>Dio via ApiManager</>,
            <>Interceptors, token injection, error handling</>,
            <>Multipart uploads supported</>,
          ]}
        />

        <SubHead>2.3 Data Architecture</SubHead>
        <p className="text-sm font-semibold text-foreground/90">Relational Database (MySQL):</p>
        <p className="text-sm text-foreground/90">Stores:</p>
        <Bullets
          items={[
            <>Users</>,
            <>Roles</>,
            <>Bookings</>,
            <>Payment history</>,
            <>Driver/Guard onboarding</>,
          ]}
        />
        <p className="text-sm font-semibold text-foreground/90">Database Governance:</p>
        <Bullets
          items={[
            <>No direct DB access allowed</>,
            <>Use Laravel Eloquent ORM only</>,
            <>Schema controlled via migrations</>,
            <>Seeders for initial data</>,
          ]}
        />
        <p className="text-sm font-semibold text-foreground/90">NoSQL:</p>
        <Bullets
          items={[
            <>Firebase Realtime Database → live location tracking</>,
            <>Firestore → ride states, tokens, assignments</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "core-workflows",
    num: "3",
    title: "Core Workflows",
    icon: Workflow,
    searchText:
      "core workflows user onboarding mobile registration email apple google verification deep link otp phone firebase twilio kyc persona role-based navigation demo mode realtime ride security tracking completion firestore listeners",
    body: (
      <div className="space-y-4">
        <SubHead>3.1 User Onboarding & Mobile Workflows</SubHead>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground/90">
          <li>
            <span className="font-semibold">Registration:</span>
            <Bullets items={[<>Email/Password</>, <>Apple Sign-In</>, <>Google Sign-In</>]} />
          </li>
          <li>
            <span className="font-semibold">Email Verification:</span>
            <Bullets items={[<>Signup via deep link</>, <>Login via OTP for new devices</>]} />
          </li>
          <li>
            <span className="font-semibold">Phone Verification:</span>
            <Bullets items={[<>Firebase Auth or Twilio</>]} />
          </li>
          <li>
            <span className="font-semibold">KYC:</span>
            <Bullets items={[<>Persona SDK</>]} />
          </li>
          <li>
            <span className="font-semibold">Role-Based Navigation:</span>
            <Bullets items={[<>Based on <Code>selectedUser</Code> and <Code>completeRegStep</Code></>]} />
          </li>
          <li>
            <span className="font-semibold">Demo Mode:</span>
            <Bullets items={[<>Simulated workflows for testing</>]} />
          </li>
        </ol>

        <SubHead>3.2 Real-Time Ride & Security Flow</SubHead>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground/90">
          <li>
            <span className="font-semibold">Request Lifecycle:</span>
            <Bullets
              items={[
                <>Status updates (Finding driver, Assigning guard)</>,
                <>Firestore listeners detect assignment</>,
              ]}
            />
          </li>
          <li>
            <span className="font-semibold">Tracking:</span>
            <Bullets
              items={[
                <>Location updates every 10–20 seconds</>,
                <>Stored in Firebase Realtime DB</>,
              ]}
            />
          </li>
          <li>
            <span className="font-semibold">Completion:</span>
            <Bullets
              items={[
                <>Backend marks trip complete</>,
                <>App moves to payment and rating</>,
              ]}
            />
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: "platform-access-matrix",
    num: "4",
    title: "Platform Access Matrix",
    icon: KeySquare,
    searchText:
      "platform access matrix github frontend backend firebase aws stripe persona mapbox app store connect google play twilio mailgun sendbird",
    body: (
      <div className="space-y-2">
        <p className="text-sm text-foreground/90">Platform Access:</p>
        <ul className="space-y-1.5 text-sm">
          <li><span className="font-semibold">GitHub Frontend Repo:</span> <Link href="https://github.com/CrestRushi/blacktruckapp" /></li>
          <li><span className="font-semibold">GitHub Backend Repo:</span> <Link href="https://github.com/CrestRushi/blacktruckweb" /></li>
          <li><span className="font-semibold">Firebase Console:</span> <Link href="https://console.firebase.google.com/" /></li>
          <li><span className="font-semibold">AWS Console:</span> <Link href="https://rideforti.signin.aws.amazon.com/console" /></li>
          <li><span className="font-semibold">Stripe Dashboard:</span> <Link href="https://dashboard.stripe.com/" /></li>
          <li><span className="font-semibold">Persona Dashboard:</span> <Link href="https://withpersona.com/dashboard/" /></li>
          <li><span className="font-semibold">Mapbox Account:</span> <Link href="https://account.mapbox.com/" /></li>
          <li><span className="font-semibold">App Store Connect:</span> <Link href="https://appstoreconnect.apple.com/" /></li>
          <li><span className="font-semibold">Google Play Console:</span> <Link href="https://play.google.com/console/" /></li>
          <li><span className="font-semibold">Twilio / Mailgun / Sendbird:</span> Internal</li>
        </ul>
      </div>
    ),
  },
  {
    id: "third-party-integrations",
    num: "5",
    title: "Third-Party Integrations",
    icon: Plug,
    searchText:
      "third party integrations strategy backend secure mediator service classes stripe persona twilio sendbird mapbox firebase cloud messaging apple sign-in google sign-in",
    body: (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground/90">Strategy:</p>
        <Bullets
          items={[
            <>Backend acts as secure mediator</>,
            <>Service classes handle integrations</>,
          ]}
        />
        <p className="text-sm font-semibold text-foreground/90">Services:</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            ["Payments", ["Stripe"]],
            ["Identity Verification", ["Persona"]],
            ["Messaging", ["Twilio", "Sendbird"]],
            ["Mapping", ["Mapbox"]],
            ["Notifications", ["Firebase Cloud Messaging"]],
            ["Authentication", ["Apple Sign-In", "Google Sign-In"]],
          ].map(([label, vals]) => (
            <div key={label as string} className="rounded-md border border-border bg-background/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
              <ul className="text-sm text-foreground mt-1 space-y-0.5">
                {(vals as string[]).map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "local-development",
    num: "6",
    title: "Local Development Setup",
    icon: Terminal,
    searchText:
      "local development setup backend configuration env example database stripe firebase twilio aws parameter store version control branches install dependencies flutter pub get ios pod install run app staging production troubleshooting xcode developer guidelines postman swagger",
    body: (
      <div className="space-y-4">
        <SubHead>Backend Configuration</SubHead>
        <Bullets
          items={[
            <>Use <Code>.env</Code> file (do not commit)</>,
            <>Use <Code>.env.example</Code> as template</>,
          ]}
        />
        <p className="text-sm font-semibold text-foreground/90">Required Variables:</p>
        <Bullets
          items={[
            <>Database credentials</>,
            <>Stripe keys</>,
            <>Firebase credentials</>,
            <>Twilio credentials</>,
          ]}
        />
        <p className="text-sm text-foreground/90">Secrets handled via AWS Parameter Store</p>

        <SubHead>Version Control</SubHead>
        <Bullets
          items={[
            <><Code>main</Code> → production</>,
            <><Code>staging</Code> → QA</>,
            <><Code>feature/*</Code> and <Code>bugfix/*</Code> branches</>,
            <>PR required for merging</>,
            <>No direct commits to <Code>main</Code>/<Code>staging</Code></>,
          ]}
        />

        <SubHead>Install Dependencies</SubHead>
        <Pre>{`flutter pub get`}</Pre>

        <SubHead>iOS Setup</SubHead>
        <Pre>{`cd ios
pod install
cd ..`}</Pre>

        <SubHead>Run App</SubHead>
        <p className="text-sm text-foreground/90">Staging:</p>
        <Pre>{`flutter run --flavor staging --dart-define=APP_FLAVOR=staging`}</Pre>
        <p className="text-sm text-foreground/90">Production:</p>
        <Pre>{`flutter run --flavor prod --dart-define=APP_FLAVOR=prod`}</Pre>

        <SubHead>Troubleshooting</SubHead>
        <p className="text-sm text-foreground/90">Pods:</p>
        <Pre>{`pod repo update && pod install`}</Pre>
        <p className="text-sm text-foreground/90">Flutter:</p>
        <Pre>{`flutter clean && flutter pub get`}</Pre>
        <p className="text-sm text-foreground/90">Xcode:</p>
        <Bullets items={[<>Clean build folder</>, <>Fix signing issues</>]} />

        <SubHead>Developer Guidelines</SubHead>
        <Bullets
          items={[
            <>Use Postman or Swagger for API testing</>,
            <>Use staging for safe testing</>,
            <>No direct production access</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "qa-automation",
    num: "7",
    title: "Quality Assurance & Automation Strategy",
    icon: ShieldCheck,
    searchText:
      "quality assurance automation future qa automated reviews slack alerts sentry monitoring ec2 health testing penetration testing sast scanning observability cloudwatch centralized logs",
    body: (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground/90">Future QA:</p>
        <Bullets
          items={[
            <>Automated reviews</>,
            <>Slack alerts</>,
            <>Sentry monitoring</>,
            <>EC2 health monitoring</>,
          ]}
        />
        <p className="text-sm font-semibold text-foreground/90">Testing:</p>
        <Bullets items={[<>Penetration testing</>, <>SAST scanning</>]} />
        <p className="text-sm font-semibold text-foreground/90">Observability:</p>
        <Bullets items={[<>Sentry</>, <>CloudWatch</>, <>Centralized logs</>]} />
      </div>
    ),
  },
  {
    id: "scalability-dr",
    num: "8",
    title: "Scalability & Disaster Recovery",
    icon: HardDrive,
    searchText:
      "scalability disaster recovery load balancers auto scaling queue scaling db indexing replicas daily backups s3 versioning mysql dumps rto rpo data retention active rides logs deleted accounts",
    body: (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground/90">Scalability:</p>
        <Bullets
          items={[
            <>Load balancers</>,
            <>Auto scaling</>,
            <>Queue scaling</>,
            <>DB indexing & replicas</>,
          ]}
        />
        <p className="text-sm font-semibold text-foreground/90">Disaster Recovery:</p>
        <Bullets
          items={[<>Daily backups</>, <>S3 versioning</>, <>MySQL dumps</>]}
        />
        <div className="grid sm:grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">RTO</p>
            <p className="text-sm text-foreground">&lt; 4 hours</p>
          </div>
          <div className="rounded-md border border-border bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">RPO</p>
            <p className="text-sm text-foreground">&lt; 24 hours</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-foreground/90">Data Retention:</p>
        <Bullets
          items={[
            <>Active rides: indefinite</>,
            <>Logs: 90 days</>,
            <>Deleted accounts: 30 days</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "security-model",
    num: "9",
    title: "Security Model",
    icon: Lock,
    searchText:
      "security model authentication laravel sanctum bearer tokens authorization rbac spatie api security rate limiting token lifecycle request validation monitoring cloudwatch sentry data security encryption at rest secure token storage restricted aws access",
    body: (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground/90">Authentication:</p>
        <Bullets items={[<>Laravel Sanctum (Bearer Tokens)</>]} />
        <p className="text-sm font-semibold text-foreground/90">Authorization:</p>
        <Bullets items={[<>RBAC using Spatie</>]} />
        <p className="text-sm font-semibold text-foreground/90">API Security:</p>
        <Bullets
          items={[
            <>Rate limiting</>,
            <>Token lifecycle management</>,
            <>Request validation</>,
          ]}
        />
        <p className="text-sm font-semibold text-foreground/90">Monitoring:</p>
        <Bullets items={[<>CloudWatch</>, <>Sentry</>]} />
        <p className="text-sm font-semibold text-foreground/90">Data Security:</p>
        <Bullets
          items={[
            <>Encryption at rest</>,
            <>Secure token storage</>,
            <>Restricted AWS access</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "scalability-roadmap",
    num: "10",
    title: "Scalability Roadmap",
    icon: Rocket,
    searchText:
      "scalability roadmap mysql aws rds multi-az ecs fargate websockets appsync replace firebase",
    body: (
      <Bullets
        items={[
          <>Move MySQL to AWS RDS Multi-AZ</>,
          <>Shift backend to ECS/Fargate</>,
          <>Replace Firebase with WebSockets/AppSync</>,
        ]}
      />
    ),
  },
];

const TechnicalWhitepaper = () => {
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
            <FileText className="h-5 w-5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">{META.name}</h2>
            <p className="text-xs text-muted-foreground">{META.project}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <Badge variant="secondary">v{META.version}</Badge>
            <Badge variant="outline">{META.classification}</Badge>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          {[
            ["Prepared By", META.preparedBy],
            ["Classification", META.classification],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md border border-border bg-background/40 p-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
              <p className="text-foreground">{v}</p>
            </div>
          ))}
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

      {/* Table of contents (chips) */}
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5 px-0.5">
          Sections
        </p>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#wp-sec-${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                setOpen((prev) => (prev.includes(s.id) ? prev : [...prev, s.id]));
                setTimeout(() => {
                  document
                    .getElementById(`wp-sec-${s.id}`)
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
                id={`wp-sec-${s.id}`}
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

export default TechnicalWhitepaper;
