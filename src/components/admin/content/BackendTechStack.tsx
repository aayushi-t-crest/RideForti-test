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
  Server,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  Database,
  Plug,
  Workflow,
  GitBranch,
  Lock,
  Cloud,
} from "lucide-react";

const META = {
  name: "RideForti Backend Tech Stack Documentation",
  project: "RideForti",
  language: "PHP 8.2.28 (cli)",
  framework: "Laravel 10.48.29",
};

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[12px] font-mono">
    {children}
  </code>
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
  icon: typeof Server;
  body: React.ReactNode;
  searchText: string;
};

const SERVICES: { service: string; purpose: string; sdk: React.ReactNode }[] = [
  { service: "Stripe", purpose: "Payments & Connect Payouts", sdk: <Code>stripe/stripe-php</Code> },
  { service: "Firebase", purpose: "Push Notifications (FCM)", sdk: <Code>kreait/laravel-firebase</Code> },
  { service: "Twilio", purpose: "SMS & Phone Number Verification", sdk: <Code>twilio/sdk</Code> },
  { service: "Mailgun", purpose: "Transactional Email", sdk: <Code>symfony/mailgun-mailer</Code> },
  { service: "AWS S3", purpose: "Cloud File Storage", sdk: <Code>league/flysystem-aws-s3-v3</Code> },
  { service: "Persona", purpose: "KYC/Identity Verification", sdk: "Webhook-driven integration" },
  { service: "Google Maps", purpose: "Geocoding & Tolls", sdk: "Google API Client" },
  { service: "FDACS GOV.", purpose: "Automated license verification", sdk: "Custom scraping + caching" },
  { service: "Mapbox", purpose: "Navigation & Live Tracking Maps", sdk: "Mapbox SDK" },
];

const SECTIONS: Section[] = [
  {
    id: "overview",
    num: "1",
    title: "Overview",
    icon: Server,
    searchText:
      "overview backend tech stack rideforti multi-sided mobility security ecosystem monolithic laravel restful api event-driven background processing php laravel",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-foreground/90">
          This document provides a comprehensive overview of the backend tech stack for the{" "}
          <span className="font-semibold">RideForti</span>, a multi-sided mobility and security
          ecosystem.
        </p>
        <Bullets
          items={[
            <><span className="font-semibold">Architecture Pattern</span>: Monolithic Laravel with RESTful API and event-driven background processing.</>,
            <><span className="font-semibold">Language</span>: PHP 8.2.28 (cli)</>,
            <><span className="font-semibold">Framework</span>: Laravel 10.48.29</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "core-framework",
    num: "2",
    title: "Core Framework",
    icon: Layers,
    searchText:
      "core framework laravel eloquent orm blade engine sanctum middleware cors authentication rbac spatie permission swagger l5-swagger stripe-php kreait laravel-firebase",
    body: (
      <div className="space-y-3">
        <SubHead>Laravel 10.48.29</SubHead>
        <Bullets
          items={[
            <><span className="font-semibold">Purpose</span>: Primary web application framework and RESTful API provider.</>,
            <>
              <span className="font-semibold">Key Features</span>:
              <ul className="list-[circle] pl-5 mt-1 space-y-1">
                <li><span className="font-semibold">Eloquent ORM</span>: For database interactions and model management.</li>
                <li><span className="font-semibold">Blade Engine</span>: For administrative UI and server-side rendering.</li>
                <li><span className="font-semibold">Sanctum</span>: Token-based API authentication for mobile/web clients.</li>
                <li><span className="font-semibold">Middleware Pipeline</span>: Handles CORS, authentication, and RBAC via Spatie.</li>
              </ul>
            </>,
          ]}
        />
        <SubHead>Key Dependencies</SubHead>
        <Bullets
          items={[
            <><span className="font-semibold">Spatie Laravel Permission</span>: Role-Based Access Control (RBAC).</>,
            <><span className="font-semibold">Darkaonline/L5-Swagger</span>: OpenAPI/Swagger documentation.</>,
            <><span className="font-semibold">Stripe/Stripe-php</span>: Financial transaction and subscription management.</>,
            <><span className="font-semibold">Kreait/Laravel-Firebase</span>: Real-time database and FCM integration.</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "databases",
    num: "3",
    title: "Databases",
    icon: Database,
    searchText:
      "databases mysql primary relational firebase firestore nosql ride tracking push notification users bookings documents subscription records",
    body: (
      <div className="space-y-3">
        <SubHead>MySQL</SubHead>
        <Bullets
          items={[
            <><span className="font-semibold">Type</span>: Primary Relational Database.</>,
            <><span className="font-semibold">Purpose</span>: Stores application data including Users, Bookings, Documents, and Subscription Records.</>,
          ]}
        />
        <SubHead>Firebase Firestore</SubHead>
        <Bullets
          items={[
            <><span className="font-semibold">Type</span>: NoSQL Database.</>,
            <><span className="font-semibold">Purpose</span>: Real-time data synchronization for ride-tracking and push notification state.</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "third-party",
    num: "4",
    title: "Third-Party APIs & Services",
    icon: Plug,
    searchText:
      "third party apis services stripe firebase twilio mailgun aws s3 persona google maps fdacs mapbox sdk implementation",
    body: (
      <div className="space-y-2 overflow-x-auto">
        <table className="w-full text-sm border border-border rounded-md overflow-hidden">
          <thead className="bg-background/60">
            <tr className="text-left">
              <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">Service</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">Purpose</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">SDK / Implementation</th>
            </tr>
          </thead>
          <tbody>
            {SERVICES.map((s) => (
              <tr key={s.service} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2 font-semibold text-foreground">{s.service}</td>
                <td className="px-3 py-2 text-foreground/90">{s.purpose}</td>
                <td className="px-3 py-2 text-foreground/90">{s.sdk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "background-jobs",
    num: "5",
    title: "Background Jobs & Workers",
    icon: Workflow,
    searchText:
      "background jobs workers laravel queues asynchronous notification worker fcm push financial worker stripe connect commission marketplace worker auto-expiry cleanup",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-foreground/90">
          RideForti utilizes Laravel Queues for asynchronous processing.
        </p>
        <SubHead>Worker Categorization</SubHead>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground/90">
          <li>
            <span className="font-semibold">Notification Worker:</span>
            <Bullets
              items={[
                <><span className="font-semibold">Purpose:</span> Dispatches FCM push notifications for personnel assignments.</>,
                <><span className="font-semibold">Trigger:</span> New booking or security request.</>,
              ]}
            />
          </li>
          <li>
            <span className="font-semibold">Financial Worker:</span>
            <Bullets
              items={[
                <><span className="font-semibold">Purpose:</span> Processes Stripe Connect splits and commission calculations.</>,
                <><span className="font-semibold">Trigger:</span> Successful Payment Intent webhook.</>,
              ]}
            />
          </li>
          <li>
            <span className="font-semibold">Marketplace Worker:</span>
            <Bullets
              items={[
                <><span className="font-semibold">Purpose:</span> Auto-expiry and cleanup of old listings.</>,
              ]}
            />
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: "architecture-data-flow",
    num: "6",
    title: "Architecture & Data Flow",
    icon: GitBranch,
    searchText:
      "architecture data flow request flow http request routes api middleware sanctum auth spatie rbac validation controller service layer json response",
    body: (
      <div className="space-y-3">
        <SubHead>Request Flow</SubHead>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-foreground/90">
          <li><span className="font-semibold">HTTP Request</span> enters via <Code>routes/api.php</Code>.</li>
          <li><span className="font-semibold">Middleware:</span> Sanctum Auth → Spatie RBAC → Request Validation.</li>
          <li><span className="font-semibold">Controller:</span> Handles request/response formatting (located in <Code>app/Http/Controllers/API</Code>).</li>
          <li><span className="font-semibold">Service Layer:</span> Executes business logic (located in <Code>app/Services</Code>).</li>
          <li><span className="font-semibold">Response:</span> Returns JSON to client.</li>
        </ol>
      </div>
    ),
  },
  {
    id: "security-auth",
    num: "7",
    title: "Security & Authentication",
    icon: Lock,
    searchText:
      "security authentication sanctum bearer tokens revocable api access encryption pii external service tokens webhook signature verification stripe persona",
    body: (
      <Bullets
        items={[
          <><span className="font-semibold">Sanctum:</span> Bearer tokens for secure, revocable API access.</>,
          <><span className="font-semibold">Encryption:</span> Used for sensitive PII and external service tokens.</>,
          <><span className="font-semibold">Webhook Security:</span> Mandatory signature verification for Stripe and Persona endpoints.</>,
        ]}
      />
    ),
  },
  {
    id: "infrastructure-hosting",
    num: "8",
    title: "Infrastructure & Hosting",
    icon: Cloud,
    searchText:
      "infrastructure hosting aws amazon web services ec2 t2.micro vcpu memory linux us east n virginia tenancy ebs volume vpc elastic ip cost monthly yearly",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-foreground/90">
          <span className="font-semibold">Cloud Provider:</span> Amazon Web Services (AWS)
        </p>
        <Bullets
          items={[
            <><span className="font-semibold">Compute Service:</span> Amazon EC2</>,
            <><span className="font-semibold">Purpose:</span> Hosts the RideForti backend application and handles API requests.</>,
          ]}
        />

        <SubHead>Instance Details</SubHead>
        <Bullets
          items={[
            <>Instance Type: <Code>t2.micro</Code></>,
            <>vCPU: 1</>,
            <>Memory: 1 GiB</>,
            <>Operating System: Linux</>,
            <>Region: US East (N. Virginia)</>,
            <>Tenancy: Shared (On-Demand)</>,
          ]}
        />

        <SubHead>Storage</SubHead>
        <Bullets items={[<>EBS Volume: 20 GB (General Purpose SSD)</>]} />

        <SubHead>Networking</SubHead>
        <Bullets
          items={[
            <>Service: Amazon VPC</>,
            <>Elastic IP: 1 Public IPv4 address</>,
            <>Used for secure and isolated network configuration.</>,
          ]}
        />

        <SubHead>Estimated Cost (AWS Pricing Calculator)</SubHead>
        <div className="grid sm:grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly Cost</p>
            <p className="text-sm text-foreground">$14.12 USD</p>
          </div>
          <div className="rounded-md border border-border bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Yearly Cost</p>
            <p className="text-sm text-foreground">$169.44 USD</p>
          </div>
        </div>
      </div>
    ),
  },
];

const BackendTechStack = () => {
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
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shrink-0">
            <Server className="h-5 w-5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">{META.name}</h2>
            <p className="text-xs text-muted-foreground">{META.project}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <Badge variant="secondary">{META.language}</Badge>
            <Badge variant="outline">{META.framework}</Badge>
          </div>
        </div>
      </div>

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

      <div className="rounded-lg border border-border bg-card/40 p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5 px-0.5">
          Sections
        </p>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#bts-sec-${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                setOpen((prev) => (prev.includes(s.id) ? prev : [...prev, s.id]));
                setTimeout(() => {
                  document
                    .getElementById(`bts-sec-${s.id}`)
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
                id={`bts-sec-${s.id}`}
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

export default BackendTechStack;
