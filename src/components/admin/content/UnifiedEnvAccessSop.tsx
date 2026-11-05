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
  ShieldCheck,
  Search,
  BookOpen,
  Layers,
  Users,
  Workflow,
  TestTube2,
  Rocket,
  Smartphone,
  Server,
  Cloud,
  Database,
  Plug,
  UserPlus,
  KeySquare,
  Lock,
  Save,
  Siren,
  Tags,
  Grid3x3,
  GlassWater,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ----- Document Metadata -----
const META = {
  name: "Unified Environment Access SOP",
  project: "Ride Forti",
  docId: "SOP-RF-001",
  version: "1.1",
  lastUpdated: "April 30, 2026",
  preparedBy: "Engineering Team",
  reviewedBy: "DevOps Lead",
  approvedBy: "Project Owner",
  appliesTo: "Developers, QA, DevOps, Client Testers, External Testers",
};

// ----- Sections (verbatim content from PDF) -----
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
    id: "intro",
    num: "1",
    title: "Introduction",
    icon: BookOpen,
    searchText:
      "introduction sop ride forti environments mobile backend database infrastructure third-party tester onboarding",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          This Standard Operating Procedure (SOP) defines how users access Ride Forti environments
          and systems. It ensures operational integrity, consistent workflows, and enterprise-grade
          security.
        </p>
        <p className="text-foreground font-medium">This document governs:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Mobile app distribution (iOS &amp; Android)</li>
          <li>Backend API access</li>
          <li>Database access</li>
          <li>Infrastructure access (AWS)</li>
          <li>Third-party service access</li>
          <li>Tester onboarding workflows</li>
        </ul>
        <div className="rounded-md border border-border bg-card/60 p-3">
          <p className="text-xs uppercase tracking-wider text-foreground/70 font-semibold mb-1">
            Objective
          </p>
          <p>
            Maintain secure, isolated, auditable, and properly governed access to all environments.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "scope",
    num: "2",
    title: "Scope",
    icon: Layers,
    searchText:
      "scope developers qa client stakeholders external testers devops staging production admin panels testflight apk databases mysql firestore aws third party",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="text-foreground font-medium">This SOP applies to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Internal Developers — full staging access</li>
          <li>QA Team — testing environments and builds</li>
          <li>Client Stakeholders — UAT and TestFlight</li>
          <li>External Testers — mobile app only</li>
          <li>DevOps Team — full environment control</li>
        </ul>
        <p className="text-foreground font-medium">Systems Covered:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Staging &amp; Production</li>
          <li>Admin Panels</li>
          <li>TestFlight / APK builds</li>
          <li>Databases (MySQL, Firestore)</li>
          <li>AWS infrastructure</li>
          <li>Third-party tools</li>
        </ul>
      </div>
    ),
  },
  {
    id: "architecture",
    num: "3",
    title: "Environment Architecture",
    icon: Grid3x3,
    searchText:
      "environment architecture staging testing qa production live customers transactions stable monitored",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div className="rounded-md border border-border bg-card/60 p-3 space-y-2">
          <p className="text-foreground font-semibold">3.1 Staging Environment (Testing &amp; QA)</p>
          <p className="text-foreground">Used for:</p>
          <ul className="list-disc pl-5">
            <li>QA verification</li>
            <li>Feature validation</li>
            <li>Debugging</li>
            <li>UAT</li>
          </ul>
          <p className="text-foreground">Characteristics:</p>
          <ul className="list-disc pl-5">
            <li>Frequently updated</li>
            <li>May contain unstable builds</li>
            <li>Uses mock/partial data</li>
          </ul>
        </div>
        <div className="rounded-md border border-border bg-card/60 p-3 space-y-2">
          <p className="text-foreground font-semibold">3.2 Production Environment (Live)</p>
          <p className="text-foreground">Used for:</p>
          <ul className="list-disc pl-5">
            <li>Real customers</li>
            <li>Live rides</li>
            <li>Financial transactions</li>
          </ul>
          <p className="text-foreground">Characteristics:</p>
          <ul className="list-disc pl-5">
            <li>Stable</li>
            <li>Fully monitored</li>
            <li>Strict access control</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "principles",
    num: "4",
    title: "Access Control Principles",
    icon: ShieldCheck,
    searchText:
      "access control rbac spatie least privilege shared credentials production mfa",
    body: (
      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
        <li>RBAC (Role-Based Access Control) using Spatie</li>
        <li>Least privilege principle</li>
        <li>No shared credentials</li>
        <li>Restricted production access</li>
        <li>Mandatory MFA where possible</li>
      </ul>
    ),
  },
  {
    id: "roles",
    num: "5",
    title: "Role Definitions",
    icon: Users,
    searchText:
      "roles developer qa engineer devops client stakeholder external tester project owner",
    body: (
      <div className="grid sm:grid-cols-2 gap-2 text-sm">
        {[
          ["Developer", "Code + staging access"],
          ["QA Engineer", "Testing + builds"],
          ["DevOps", "Infrastructure + production"],
          ["Client Stakeholder", "UAT access"],
          ["External Tester", "App-only access"],
          ["Project Owner", "Approvals"],
        ].map(([role, desc]) => (
          <div key={role} className="rounded-md border border-border bg-card/60 p-3">
            <p className="font-semibold text-foreground">{role}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "provisioning",
    num: "6",
    title: "Access Provisioning Workflow",
    icon: Workflow,
    searchText: "provisioning workflow request manager approval devops",
    body: (
      <ol className="space-y-2 text-sm">
        {[
          ["Step 1", "Request submitted"],
          ["Step 2", "Manager approval"],
          ["Step 3", "DevOps grants access"],
        ].map(([s, t]) => (
          <li
            key={s}
            className="flex items-start gap-3 rounded-md border border-border bg-card/60 p-3"
          >
            <span className="text-xs font-bold text-foreground bg-white text-black rounded px-2 py-0.5">
              {s}
            </span>
            <span className="text-muted-foreground">{t}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    id: "staging",
    num: "7",
    title: "Staging Environment Access",
    icon: TestTube2,
    searchText:
      "staging mobile android apk google drive ios testflight backend api admin panel postman swagger qa testing ui review bug api testing",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="text-foreground font-semibold mb-1">Mobile Access</p>
          <p className="text-foreground">Android:</p>
          <ul className="list-disc pl-5">
            <li>APK shared via Google Drive</li>
            <li>Manual install</li>
            <li>Enable unknown apps</li>
          </ul>
          <p className="text-foreground mt-2">iOS:</p>
          <ul className="list-disc pl-5">
            <li>TestFlight access</li>
            <li>Internal + external testing</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold mb-1">Backend Access</p>
          <p>
            API:{" "}
            <code className="text-foreground bg-muted/50 px-1 rounded">
              https://stage-admin.rideforti.com/api/v1/
            </code>
          </p>
          <p>
            Admin Panel:{" "}
            <code className="text-foreground bg-muted/50 px-1 rounded">
              https://stage-admin.rideforti.com
            </code>
          </p>
          <p className="text-foreground mt-2">Guidelines:</p>
          <ul className="list-disc pl-5">
            <li>Use Postman/Swagger</li>
            <li>Safe testing environment</li>
            <li>Never connect staging to production</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold mb-1">Use Cases</p>
          <ul className="list-disc pl-5">
            <li>QA testing</li>
            <li>UI review</li>
            <li>Bug reproduction</li>
            <li>API testing</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "production",
    num: "8",
    title: "Production Environment Access",
    icon: Rocket,
    searchText:
      "production mobile app external testers qa clients public users backend admin lead developer devops project owner database ssh tunnel debugging logs deployment ci cd api access summary",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="text-foreground font-semibold mb-1">A. Mobile App Access</p>
          <p className="text-foreground">Allowed:</p>
          <ul className="list-disc pl-5">
            <li>External testers</li>
            <li>QA</li>
            <li>Clients</li>
            <li>Public users</li>
          </ul>
          <p className="mt-2 italic">Note: No backend access included</p>
        </div>
        <div>
          <p className="text-foreground font-semibold mb-1">B. Backend/Admin Access</p>
          <p className="text-foreground">Allowed only for:</p>
          <ul className="list-disc pl-5">
            <li>Lead Developer</li>
            <li>DevOps</li>
            <li>Project Owner</li>
          </ul>
          <p className="text-foreground mt-2">Not allowed for testers:</p>
          <ul className="list-disc pl-5">
            <li>Admin panel</li>
            <li>API tools</li>
            <li>Database</li>
            <li>AWS</li>
            <li>Logs</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold mb-1">Access Points</p>
          <p>
            Production API:{" "}
            <code className="text-foreground bg-muted/50 px-1 rounded">
              https://admin.rideforti.com/api/v1/
            </code>
          </p>
          <p>
            Admin Panel:{" "}
            <code className="text-foreground bg-muted/50 px-1 rounded">
              https://admin.rideforti.com
            </code>
          </p>
          <p>Mobile App: App Store / Play Store</p>
        </div>
        <div className="rounded-md border border-border bg-card/60 p-3 space-y-2">
          <p className="text-foreground font-semibold">Production Rules</p>
          <p className="text-foreground">Database:</p>
          <ul className="list-disc pl-5">
            <li>SSH tunnel only</li>
            <li>No public access</li>
          </ul>
          <p className="text-foreground">Debugging:</p>
          <ul className="list-disc pl-5">
            <li>No direct server debugging</li>
            <li>Use logs only</li>
          </ul>
          <p className="text-foreground">Deployment:</p>
          <ul className="list-disc pl-5">
            <li>CI/CD only</li>
            <li>No manual changes</li>
          </ul>
          <p className="text-foreground">API Rules:</p>
          <ul className="list-disc pl-5">
            <li>No testing in production</li>
            <li>Strict approvals required</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-semibold mb-1">Access Summary</p>
          <ul className="list-disc pl-5">
            <li>Production App: Everyone allowed</li>
            <li>Admin Panel: Restricted</li>
            <li>API Access: Limited</li>
            <li>Database: DevOps only</li>
            <li>AWS: DevOps only</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "testflight",
    num: "9",
    title: "TestFlight Workflow",
    icon: Smartphone,
    searchText: "testflight tester apple portal invite install builds 90 days",
    body: (
      <ol className="space-y-2 text-sm">
        {[
          "Submit tester details",
          "Add to Apple portal",
          "Invite sent",
          "Install TestFlight",
          "Install app",
          "Auto updates",
          "Builds expire in 90 days",
        ].map((s, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-md border border-border bg-card/60 p-3"
          >
            <span className="text-xs font-bold bg-white text-black rounded px-2 py-0.5">
              {i + 1}
            </span>
            <span className="text-muted-foreground">{s}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    id: "apk",
    num: "10",
    title: "Android APK Distribution",
    icon: Smartphone,
    searchText: "android apk upload share link manual install security email",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <ol className="space-y-2">
          {["Upload APK", "Share link", "Manual install"].map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-md border border-border bg-card/60 p-3"
            >
              <span className="text-xs font-bold bg-white text-black rounded px-2 py-0.5">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="text-foreground font-semibold">Security:</p>
        <ul className="list-disc pl-5">
          <li>Link-based control</li>
          <li>Optional email restriction</li>
        </ul>
      </div>
    ),
  },
  {
    id: "api",
    num: "11",
    title: "Backend API Access Model",
    icon: Server,
    searchText:
      "backend api laravel sanctum bearer token staging production rbac json env secrets ci cd",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="text-foreground font-semibold">Authentication:</p>
        <ul className="list-disc pl-5">
          <li>Laravel Sanctum (Bearer Token)</li>
        </ul>
        <p className="text-foreground font-semibold">Access:</p>
        <ul className="list-disc pl-5">
          <li>Staging: QA + Dev</li>
          <li>Production: DevOps + Lead Dev</li>
        </ul>
        <p className="text-foreground font-semibold">Rules:</p>
        <ul className="list-disc pl-5">
          <li>Accept: application/json</li>
          <li>Authorization: Bearer token</li>
          <li>RBAC enforced</li>
          <li>Staging &amp; production fully isolated</li>
        </ul>
        <p className="text-foreground font-semibold">Environment:</p>
        <ul className="list-disc pl-5">
          <li>.env based configuration</li>
          <li>No hardcoded secrets</li>
          <li>Secure CI/CD injection</li>
        </ul>
      </div>
    ),
  },
  {
    id: "aws",
    num: "12",
    title: "AWS Infrastructure Access",
    icon: Cloud,
    searchText:
      "aws ec2 s3 rds iam shared accounts queues async supervisor workers retry",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="text-foreground font-semibold">Components:</p>
        <ul className="list-disc pl-5">
          <li>EC2</li>
          <li>S3</li>
          <li>RDS</li>
        </ul>
        <p className="text-foreground font-semibold">Rules:</p>
        <ul className="list-disc pl-5">
          <li>IAM-based access</li>
          <li>No shared accounts</li>
          <li>Secure configurations</li>
        </ul>
        <p className="text-foreground font-semibold">Queues:</p>
        <ul className="list-disc pl-5">
          <li>Async processing</li>
          <li>Supervisor-managed workers</li>
          <li>Retry policies applied</li>
        </ul>
      </div>
    ),
  },
  {
    id: "db",
    num: "13",
    title: "Database Access Model",
    icon: Database,
    searchText:
      "database mysql ssh public exposure backend migrations mock data firestore console role",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="text-foreground font-semibold">MySQL</p>
        <ul className="list-disc pl-5">
          <li>SSH access only</li>
          <li>No public exposure</li>
          <li>Backend-only interaction</li>
          <li>Migrations required</li>
          <li>No mock data in production</li>
        </ul>
        <p className="text-foreground font-semibold">Firestore</p>
        <ul className="list-disc pl-5">
          <li>Console access</li>
          <li>Role-based control</li>
        </ul>
      </div>
    ),
  },
  {
    id: "third-party",
    num: "14",
    title: "Third-Party Services",
    icon: Plug,
    searchText:
      "third party stripe payments twilio sms mailgun email sendbird chat persona kyc mapbox firebase auth messaging aws github",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            ["Stripe", "Payments"],
            ["Twilio", "SMS"],
            ["Mailgun", "Email"],
            ["Sendbird", "Chat"],
            ["Persona", "KYC"],
            ["Mapbox", "Maps"],
            ["Firebase", "Auth & messaging"],
            ["AWS", "Infrastructure"],
            ["GitHub", "Code"],
          ].map(([n, d]) => (
            <div key={n} className="rounded-md border border-border bg-card/60 p-3">
              <p className="font-semibold text-foreground">{n}</p>
              <p className="text-xs">{d}</p>
            </div>
          ))}
        </div>
        <p className="text-foreground font-semibold">Rules:</p>
        <ul className="list-disc pl-5">
          <li>Backend handles all integrations</li>
          <li>No direct client access</li>
          <li>Secure environment variables</li>
        </ul>
      </div>
    ),
  },
  {
    id: "external",
    num: "15",
    title: "External Tester Onboarding",
    icon: UserPlus,
    searchText:
      "external tester onboarding ios apple id invite install android apk manual",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="text-foreground font-semibold">iOS:</p>
        <ul className="list-disc pl-5">
          <li>Collect Apple ID</li>
          <li>Send invite</li>
          <li>Install app</li>
        </ul>
        <p className="text-foreground font-semibold">Android:</p>
        <ul className="list-disc pl-5">
          <li>Share APK</li>
          <li>Install manually</li>
        </ul>
      </div>
    ),
  },
  {
    id: "revocation",
    num: "16",
    title: "Access Request & Revocation",
    icon: KeySquare,
    searchText: "access request revocation approval role change resignation policy violation",
    body: (
      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
        <li>Requires approval</li>
        <li>
          Immediate removal on:
          <ul className="list-[circle] pl-5 mt-1">
            <li>Role change</li>
            <li>Resignation</li>
            <li>Policy violation</li>
          </ul>
        </li>
      </ul>
    ),
  },
  {
    id: "security",
    num: "17",
    title: "Security Rules & Governance",
    icon: Lock,
    searchText:
      "security rules governance shared credentials least privilege mfa password rotation task based api rate limiting validation cloudwatch monitoring",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <ul className="list-disc pl-5">
          <li>No shared credentials</li>
          <li>Least privilege</li>
          <li>MFA required</li>
          <li>Password rotation</li>
          <li>Task-based access</li>
        </ul>
        <p className="text-foreground font-semibold">API Security:</p>
        <ul className="list-disc pl-5">
          <li>Rate limiting</li>
          <li>Validation</li>
          <li>Secure error handling</li>
          <li>Monitoring via CloudWatch</li>
        </ul>
      </div>
    ),
  },
  {
    id: "backup",
    num: "18",
    title: "Backup & Recovery",
    icon: Save,
    searchText: "backup recovery s3 lifecycle policies devops",
    body: (
      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
        <li>S3 lifecycle policies</li>
        <li>DevOps-managed recovery</li>
      </ul>
    ),
  },
  {
    id: "incident",
    num: "19",
    title: "Incident Response",
    icon: Siren,
    searchText:
      "incident response detect notify leadership revoke access analyze logs fix submit report",
    body: (
      <ol className="space-y-2 text-sm">
        {[
          "Detect issue",
          "Notify leadership",
          "Revoke access",
          "Analyze logs",
          "Fix issue",
          "Submit report",
        ].map((s, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-md border border-border bg-card/60 p-3"
          >
            <span className="text-xs font-bold bg-white text-black rounded px-2 py-0.5">
              {i + 1}
            </span>
            <span className="text-muted-foreground">{s}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    id: "data",
    num: "20",
    title: "Data Classification",
    icon: Tags,
    searchText:
      "data classification public internal confidential production sensitive user payment",
    body: (
      <div className="grid sm:grid-cols-2 gap-2 text-sm">
        {[
          ["Public", "Non-sensitive"],
          ["Internal", "Team only"],
          ["Confidential", "App logic"],
          ["Production-Sensitive", "User & payment data"],
        ].map(([n, d]) => (
          <div key={n} className="rounded-md border border-border bg-card/60 p-3">
            <p className="font-semibold text-foreground">{n}</p>
            <p className="text-xs text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "raci",
    num: "21",
    title: "RACI Matrix",
    icon: Grid3x3,
    searchText:
      "raci matrix staging access dev devops production owner tester onboarding qa apk distribution incident management",
    body: (
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left p-3 font-semibold">Activity</th>
              <th className="text-left p-3 font-semibold">Assignment</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Staging Access", "Dev (R), DevOps (A)"],
              ["Production Access", "DevOps (A), Owner (R)"],
              ["Tester Onboarding", "QA (R), DevOps (A)"],
              ["APK Distribution", "Dev (R), DevOps (A)"],
              ["Incident Management", "DevOps (A), Owner (R)"],
            ].map(([a, b]) => (
              <tr key={a} className="border-t border-border">
                <td className="p-3 text-foreground">{a}</td>
                <td className="p-3 text-muted-foreground">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "glossary",
    num: "22",
    title: "Glossary",
    icon: GlassWater,
    searchText:
      "glossary staging testing environment production live system uat user acceptance testing iam access control ssh tunnel secure db apk android app file",
    body: (
      <div className="grid sm:grid-cols-2 gap-2 text-sm">
        {[
          ["Staging", "Testing environment"],
          ["Production", "Live system"],
          ["UAT", "User Acceptance Testing"],
          ["IAM", "Access control system"],
          ["SSH Tunnel", "Secure DB access"],
          ["APK", "Android app file"],
        ].map(([n, d]) => (
          <div key={n} className="rounded-md border border-border bg-card/60 p-3">
            <p className="font-semibold text-foreground">{n}</p>
            <p className="text-xs text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    ),
  },
];

const UnifiedEnvAccessSop = () => {
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
  const toggleAll = () =>
    setOpen(allOpen ? [] : SECTIONS.map((s) => s.id));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">{META.name}</h2>
            <p className="text-xs text-muted-foreground">
              {META.project} · {META.docId}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <Badge variant="secondary">v{META.version}</Badge>
            <Badge variant="outline">Updated {META.lastUpdated}</Badge>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          {[
            ["Prepared By", META.preparedBy],
            ["Reviewed By", META.reviewedBy],
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
              href={`#sec-${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                setOpen((prev) => (prev.includes(s.id) ? prev : [...prev, s.id]));
                setTimeout(() => {
                  document
                    .getElementById(`sec-${s.id}`)
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
                id={`sec-${s.id}`}
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

export default UnifiedEnvAccessSop;
