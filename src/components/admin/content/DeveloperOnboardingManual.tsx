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
  BookOpen,
  Search,
  Wrench,
  Plug,
  GitBranch,
  Layers,
  Server,
  KeySquare,
  Cpu,
  Terminal,
  Settings,
  Hammer,
  FolderTree,
  Rocket,
  ChevronDown,
  ChevronUp,
  Code2,
} from "lucide-react";

const META = {
  name: "Developer Onboarding Manual",
  project: "RideForti",
  version: "1.0",
  lastUpdated: "April 30, 2026",
  preparedBy: "Engineering Team",
  appliesTo: "All developers joining RideForti",
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

type Section = {
  id: string;
  num: string;
  title: string;
  icon: typeof BookOpen;
  body: React.ReactNode;
  searchText: string;
};

const SECTIONS: Section[] = [
  {
    id: "overview",
    num: "1",
    title: "Overview",
    icon: BookOpen,
    searchText:
      "overview onboarding manual technical foundation source control build deployment environment access governance security tech stack infrastructure release lifecycle",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          This onboarding manual provides a complete technical foundation for all developers
          joining RideForti.
        </p>
        <p className="text-foreground font-medium">It covers:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Source control &amp; repository structure</li>
          <li>Build &amp; deployment workflow</li>
          <li>Environment management</li>
          <li>Access governance &amp; security rules</li>
          <li>Tech stack and infrastructure</li>
          <li>Release lifecycle</li>
        </ul>
        <p>
          This ensures every new developer becomes productive without relying on verbal
          onboarding.
        </p>
      </div>
    ),
  },
  {
    id: "tools-access",
    num: "2",
    title: "Required Tools & Access",
    icon: Wrench,
    searchText:
      "required tools access developer flutter macos ios xcode android studio cocoapods php composer laragon herd valet mysql redis git postman vscode phpstorm intellij accounts github firebase aws iam stripe persona mapbox app store connect google play console",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="text-foreground font-semibold mb-1">2.1 Developer Tools</p>
          <p className="text-foreground font-medium mt-2">For Mobile (Flutter):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>macOS (required for iOS builds)</li>
            <li>Flutter SDK 3.29.2</li>
            <li>Xcode (latest stable)</li>
            <li>Android Studio (latest stable)</li>
            <li>CocoaPods</li>
          </ul>
          <p className="text-foreground font-medium mt-3">For Backend (Laravel):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>PHP 8.2</li>
            <li>Composer (latest stable)</li>
            <li>Laragon / Laravel Herd / Valet</li>
            <li>MySQL &amp; Redis</li>
          </ul>
          <p className="text-foreground font-medium mt-3">General Tools:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Git CLI</li>
            <li>Postman</li>
            <li>VS Code / PHPStorm / IntelliJ</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold mb-1">2.2 Accounts Needed</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>GitHub</li>
            <li>Firebase (Staging &amp; Production)</li>
            <li>AWS IAM (if assigned)</li>
            <li>Stripe (test mode access)</li>
            <li>Persona</li>
            <li>Mapbox</li>
            <li>App Store Connect</li>
            <li>Google Play Console</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "third-party",
    num: "3",
    title: "Third-Party Platforms & Access",
    icon: Plug,
    searchText:
      "third party platforms github mobile backend firebase aws stripe persona mapbox app store connect google play twilio mailgun sendbird role based admin",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left p-3 font-semibold">Platform</th>
                <th className="text-left p-3 font-semibold">URL</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["GitHub Mobile Repo", "https://github.com/CrestRushi/blacktruckapp"],
                ["GitHub Backend Repo", "https://github.com/CrestRushi/blacktruckweb"],
                ["Firebase Console", "https://console.firebase.google.com/"],
                ["AWS Console", "https://rideforti.signin.aws.amazon.com/console"],
                ["Stripe Dashboard", "https://dashboard.stripe.com/"],
                ["Persona Dashboard", "https://withpersona.com/dashboard/"],
                ["Mapbox Account", "https://account.mapbox.com/"],
                ["App Store Connect", "https://appstoreconnect.apple.com/"],
                ["Google Play Console", "https://play.google.com/console/"],
                ["Twilio / Mailgun / Sendbird", "Internal"],
              ].map(([k, v]) => (
                <tr key={k} className="border-t border-border">
                  <td className="p-3 text-foreground whitespace-nowrap">{k}</td>
                  <td className="p-3 text-muted-foreground">
                    {v.startsWith("http") ? <Link href={v} /> : v}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Access is role-based and controlled by admins.</p>
      </div>
    ),
  },
  {
    id: "repo-access",
    num: "4",
    title: "Project Repository Access",
    icon: GitBranch,
    searchText:
      "project repository access main repositories mobile app backend api role based protected main branch project admin",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="text-foreground font-medium">Main Repositories:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Mobile App: <Link href="https://github.com/CrestRushi/blacktruckapp" />
          </li>
          <li>
            Backend API: <Link href="https://github.com/CrestRushi/blacktruckweb" />
          </li>
        </ul>
        <p className="text-foreground font-medium">Rules:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Role-based access</li>
          <li>Protected main branch</li>
          <li>Managed by project admin</li>
        </ul>
      </div>
    ),
  },
  {
    id: "architecture",
    num: "5",
    title: "System Architecture Overview",
    icon: Layers,
    searchText:
      "system architecture overview backend laravel monolithic rest api service layer queue workers async mobile flutter single codebase android ios role based prime drive guard real time firebase realtime database firestore sendbird chat cloud messaging",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="text-foreground font-semibold">Backend (Laravel)</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Monolithic REST API</li>
            <li>Service-layer architecture</li>
            <li>Queue workers for async tasks</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold">Mobile App (Flutter)</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Single codebase (Android + iOS)</li>
            <li>Role-based flows (Prime / Drive / Guard)</li>
            <li>State Management: GetX + BLoC</li>
            <li>Networking: Dio</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold">Real-Time Layer</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Firebase Realtime Database</li>
            <li>Firestore</li>
            <li>Sendbird Chat</li>
            <li>Firebase Cloud Messaging</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "environments",
    num: "6",
    title: "Environment Details",
    icon: Server,
    searchText:
      "environment details staging production api admin panel ssh pem keys no direct db access no password ssh",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="text-foreground font-semibold">6.1 Staging</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Used for development, QA, UAT</li>
            <li>
              API: <Link href="https://stage-admin.rideforti.com/api/v1/" />
            </li>
            <li>
              Admin Panel: <Link href="https://stage-admin.rideforti.com" />
            </li>
            <li>Uses staging configs</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold">6.2 Production</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Live environment</li>
            <li>
              API: <Link href="https://admin.rideforti.com/api/v1/" />
            </li>
            <li>
              Admin Panel: <Link href="https://admin.rideforti.com" />
            </li>
            <li>Restricted access</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold">Security Rules:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>SSH via .pem keys only</li>
            <li>No direct DB access</li>
            <li>No password-based SSH</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "infra-keys",
    num: "7",
    title: "Infrastructure & Key Management",
    icon: KeySquare,
    searchText:
      "infrastructure key management aws firebase stripe persona mapbox twilio mailgun sendbird google maps sdk storage rules mobile env staging prod backend ec2 never commit secrets git",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="text-foreground font-medium">Services requiring keys:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>AWS</li>
          <li>Firebase</li>
          <li>Stripe</li>
          <li>Persona</li>
          <li>Mapbox</li>
          <li>Twilio</li>
          <li>Mailgun</li>
          <li>Sendbird</li>
          <li>Google Maps SDK</li>
        </ul>
        <p className="text-foreground font-medium">Storage Rules:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Mobile: <Code>.env.staging</Code> and <Code>.env.prod</Code>
          </li>
          <li>
            Backend: EC2 <Code>.env</Code> file
          </li>
          <li>Never commit secrets to Git</li>
        </ul>
      </div>
    ),
  },
  {
    id: "tech-stack",
    num: "8",
    title: "Tech Stack & Architecture",
    icon: Cpu,
    searchText:
      "tech stack architecture backend laravel 10 php 8.2 sanctum authentication spatie rbac redis queues mobile flutter 3.29.2 dart 3.7.2 dio getx bloc database mysql firestore real time firebase realtime db sendbird queues notification workers payment workers",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="text-foreground font-semibold">Backend:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Laravel 10</li>
            <li>PHP 8.2</li>
            <li>Sanctum Authentication</li>
            <li>Spatie RBAC</li>
            <li>Redis Queues</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold">Mobile:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Flutter 3.29.2</li>
            <li>Dart 3.7.2</li>
            <li>Dio</li>
            <li>GetX + BLoC</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold">Database:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>MySQL</li>
            <li>Firestore</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold">Real-Time:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Firebase Realtime DB</li>
            <li>Sendbird</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold">Queues:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Notification workers</li>
            <li>Payment workers</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "local-setup",
    num: "9",
    title: "Local Development Setup",
    icon: Terminal,
    searchText:
      "local development setup backend clone repository composer install env file generate app key migrations start server mobile flutter pub get ios pod install run application staging production android devices xcode simulator troubleshooting pods flutter clean",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="text-foreground font-semibold">Backend Setup</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Clone repository</li>
            <li>
              Run <Code>composer install</Code>
            </li>
            <li>
              Setup <Code>.env</Code> file
            </li>
            <li>Generate app key</li>
            <li>Run migrations</li>
            <li>Start server</li>
          </ol>
        </div>
        <div>
          <p className="text-foreground font-semibold">Mobile Setup</p>
          <p>Install dependencies:</p>
          <Pre>flutter pub get</Pre>
          <p>iOS setup:</p>
          <Pre>{`cd ios
pod install
cd ..`}</Pre>
        </div>
        <div>
          <p className="text-foreground font-semibold">Run Application</p>
          <p>Staging:</p>
          <Pre>flutter run --flavor staging --dart-define=APP_FLAVOR=staging</Pre>
          <p>Production:</p>
          <Pre>flutter run --flavor prod --dart-define=APP_FLAVOR=prod</Pre>
        </div>
        <div>
          <p className="text-foreground font-semibold">Android</p>
          <Pre>{`flutter devices
flutter run --flavor staging --dart-define=APP_FLAVOR=staging`}</Pre>
        </div>
        <div>
          <p className="text-foreground font-semibold">iOS</p>
          <Pre>{`open -a Simulator
flutter run --flavor staging --dart-define=APP_FLAVOR=staging`}</Pre>
        </div>
        <div>
          <p className="text-foreground font-semibold">Troubleshooting</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Pods: <Code>pod repo update &amp;&amp; pod install</Code>
            </li>
            <li>
              Flutter: <Code>flutter clean &amp;&amp; flutter pub get</Code>
            </li>
            <li>Xcode: Clean build folder</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "env-config",
    num: "10",
    title: "Environment Configuration",
    icon: Settings,
    searchText:
      "environment configuration mobile env staging prod google services json googleservice info plist backend local env staging credentials devops never commit secrets always separate environments",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <div>
          <p className="text-foreground font-semibold">Mobile:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <Code>.env.staging</Code>
            </li>
            <li>
              <Code>.env.prod</Code>
            </li>
            <li>
              <Code>google-services.json</Code>
            </li>
            <li>
              <Code>GoogleService-Info.plist</Code>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold">Backend:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Local <Code>.env</Code>
            </li>
            <li>Staging credentials via DevOps</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold">Rules:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Never commit secrets</li>
            <li>Always separate environments</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "build-run",
    num: "11",
    title: "Build & Run Instructions",
    icon: Hammer,
    searchText:
      "build run instructions backend php artisan serve npm run dev queue work mobile staging flutter run flavor android production apk ios ipa",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <div>
          <p className="text-foreground font-semibold">Backend:</p>
          <Pre>{`php artisan serve
npm run dev
php artisan queue:work`}</Pre>
        </div>
        <div>
          <p className="text-foreground font-semibold">Mobile Staging:</p>
          <Pre>flutter run --flavor staging --dart-define=APP_FLAVOR=staging</Pre>
        </div>
        <div>
          <p className="text-foreground font-semibold">Android Production:</p>
          <Pre>flutter build apk --flavor prod --dart-define=APP_FLAVOR=prod</Pre>
        </div>
        <div>
          <p className="text-foreground font-semibold">iOS Production:</p>
          <Pre>flutter build ipa --flavor prod --dart-define=APP_FLAVOR=prod</Pre>
        </div>
      </div>
    ),
  },
  {
    id: "folder-structure",
    num: "12",
    title: "Project Folder Structure",
    icon: FolderTree,
    searchText:
      "project folder structure mobile lib ui screens controller logic model data network apis constant config backend app core logic routes apis database migrations config settings tests testing",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="text-foreground font-semibold">Mobile (lib):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>ui → Screens</li>
            <li>controller → Logic</li>
            <li>model → Data</li>
            <li>network → APIs</li>
            <li>constant → Config</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold">Backend:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>app → Core logic</li>
            <li>routes → APIs</li>
            <li>database → Migrations</li>
            <li>config → Settings</li>
            <li>tests → Testing</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "cicd",
    num: "13",
    title: "CI/CD & Deployment Workflow",
    icon: Rocket,
    searchText:
      "ci cd deployment workflow backend staging qa testing production pr only no direct server changes mobile staging apk ipa android drive firebase ios testflight production app store play store manual approval",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="text-foreground font-semibold">Backend:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Staging → QA testing</li>
            <li>Production → via PR only</li>
            <li>No direct server changes</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold">Mobile Staging:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>APK/IPA build</li>
            <li>Android → Drive/Firebase</li>
            <li>iOS → TestFlight</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold">Mobile Production:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Upload to App Store</li>
            <li>Upload to Play Store</li>
            <li>Manual approval required</li>
          </ul>
        </div>
      </div>
    ),
  },
];

const DeveloperOnboardingManual = () => {
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
            <Code2 className="h-5 w-5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">{META.name}</h2>
            <p className="text-xs text-muted-foreground">{META.project}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <Badge variant="secondary">v{META.version}</Badge>
            <Badge variant="outline">Updated {META.lastUpdated}</Badge>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          {[
            ["Prepared By", META.preparedBy],
            ["Applies To", META.appliesTo],
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
              href={`#dev-sec-${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                setOpen((prev) => (prev.includes(s.id) ? prev : [...prev, s.id]));
                setTimeout(() => {
                  document
                    .getElementById(`dev-sec-${s.id}`)
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
                id={`dev-sec-${s.id}`}
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

export default DeveloperOnboardingManual;
