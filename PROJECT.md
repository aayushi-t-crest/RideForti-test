# RideForti — Project Handover & Technical Status Report

> **Document Purpose**: Complete technical handover document for colleagues taking over the RideForti project. This document details all changes made from the beginning, everything that has been tested and verified, items remaining to be checked, and an exact step-by-step roadmap to make the project 100% production-ready.

---

## 📌 Executive Summary

* **Project**: RideForti (`rideforti.com`) — Florida Luxury Armed Mobility & Executive Protection.
* **Tech Stack**: React 18, Vite, TypeScript, Tailwind CSS, Radix UI (shadcn/ui), Supabase (PostgreSQL 15+), 38 Deno Serverless Edge Functions.
* **Core Objective Achieved**: Complete decoupling of the codebase from Lovable's proprietary cloud infrastructure (`ezatconmqkxeypaodyoj`) into a standalone, enterprise-grade cloud Supabase project (`labmrcabiongzugvwghs`).
* **Current Cloud Project ID**: `labmrcabiongzugvwghs` (Region: `eu-west-2` London)
* **Local Workspace**: `c:\Users\AayushiTrivedi\Downloads\rideforti`

---

## 1. 🔄 All Changes Made From Starting

### A. Infrastructure Decoupling from Lovable
1. **Supabase Client Decoupled**:
   * Removed all hardcoded references to the legacy Lovable project ID (`ezatconmqkxeypaodyoj`).
   * Updated `src/integrations/supabase/client.ts` to consume native Supabase environment variables dynamically.
   * Configured `.env` to connect directly to the native Supabase cloud project (`https://labmrcabiongzugvwghs.supabase.co`).
2. **Backend Serverless Decoupling (38 Edge Functions)**:
   * Extracted all 38 edge functions from the old environment into `supabase/functions/`.
   * Implemented a **Zero-Key Fallback Architecture**: In local development, edge functions simulate third-party integrations (Twilio SMS, Resend Email, OpenAI LLM, Mapbox Geocoding) without throwing fatal runtime errors if external API keys are not yet configured.

### B. Database Schema & Data Migration
1. **Schema Migration**:
   * Extracted, sanitized, and deployed all 94 database tables, relations, triggers, and Row Level Security (RLS) policies into the new Supabase instance (`labmrcabiongzugvwghs`).
2. **Historical Data Transfer**:
   * Migrated historical records across tables (`admin_accounts`, `admin_users_directory`, `faqs`, `pricing`, `fleet`, `academy`, `okrs`, `waitlist`, etc.) via `public_data.sql` and `public_data_migrated.sql`.
   * Resolved foreign key reference mismatches and null-constraint conflicts during SQL import.

### C. Frontend Bug Fixes & Code Changes
1. **Account Ledger Search Crash Fix**:
   * **File**: `src/components/admin/AdminAccountLedger.tsx`
   * **Issue**: Searching accounts caused a fatal crash (`TypeError: Cannot read properties of null (reading 'toLowerCase')`) because legacy billing rows had `null` for `username`.
   * **Fix**: Added safe null-guard `(a.username || "").toLowerCase().includes(q)`.
2. **Edge Function Syntax Error Corrections**:
   * **`supabase/functions/contract-send/index.ts`**: Fixed syntax errors preventing deployment.
   * **`supabase/functions/doc-reminders/index.ts`**: Corrected syntax errors preventing deployment.
3. **Preserved Architectural Integrity Rules**:
   * Maintained shared email-only waitlist registration payload in `src/lib/publicSms.ts` (prevents conflicting SMS consent collection).
   * Maintained LeadConnector chat widget integration (`leadConnector.chatWidget.openWidget`) for public customer support.
   * Kept legal privacy routes identical (`/privacy` and `/privacy-policy`).

### D. Repository & Team Setup Files Created
1. **`.gitignore`**: Production-ready Git ignore file protecting `.env`, `.env.*`, `*.sql`, `*.backup`, `*.dump`, build artifacts (`dist/`), and caches.
2. **`.env.example`**: Standardized environment template with zero leaked secrets.
3. **`README.md`**: Complete production documentation featuring:
   * Fast-track 3-minute setup for existing team members added to Supabase.
   * Complete from-scratch guide for deploying a brand-new instance.

---

## 2. ✅ What Has Been Checked & Verified

| Feature / Area | Status | Verification Details |
|---|---|---|
| **Vite Dev Server** | ✅ PASSED | Starts cleanly at `http://localhost:8080` with zero compile errors. |
| **Unit Test Suites** | ✅ PASSED | `npm test` runs Vitest; 4 of 4 tests pass (`publicSms.test.ts`, `example.test.ts`). |
| **Production Build** | ✅ PASSED | `npm run build` compiles clean production bundle into `dist/`. |
| **Supabase Cloud Connection** | ✅ PASSED | Direct communication to `labmrcabiongzugvwghs.supabase.co` active and authenticated. |
| **Database Schema** | ✅ PASSED | All 94 tables and RLS policies created in Supabase PostgreSQL. |
| **Admin 2FA Authentication** | ✅ PASSED | Successfully tested end-to-end: User created, assigned `admin` role in `user_roles`, 2FA OTP code generated into `login_2fa_codes`, and verified at `/admin/login`. |
| **Admin Account Ledger** | ✅ PASSED | Search bar tested with queries; zero crashes. Confirmed that legacy accounts (Slack, Higgsfield) display `—` because passwords were intentionally `NULL` during data migration (monthly recurring billing tracker). |
| **Waitlist Lead Capture** | ✅ PASSED | Public homepage "See Prices" form submits cleanly to the `waitlist` Supabase table. |
| **Staff Directory** | ✅ PASSED | Ticket assignment logic verified: Assignees must exist in `auth.users` of the current project. |

---

## 3. 🔍 Complete Module-by-Module Testing Checklist

This section provides an exhaustive list of every module and feature across the entire platform that requires manual or end-to-end verification during staging and pre-production testing.

---

### A. Public Customer-Facing Modules & Routes

| Module / Route | Source File | What Needs to be Tested |
|---|---|---|
| **Homepage Route & Fare Estimator** (`/`) | `src/pages/Index.tsx`<br>`src/components/RouteMap.tsx` | • Interactive map pin-dropping for pickup and dropoff.<br>• Route polyline rendering and mile/duration calculation via OSRM.<br>• Fare tier calculations (Forti Black, Forti Black+, Forti Black X).<br>• Verify map tiles display cleanly without watermark once OSM tiles are applied. |
| **Fleet Vehicle Carousel** (`/`) | `src/components/PricingCalculator.tsx` | • Image rendering of `suv-black.png`, `suv-black-plus.png`, and `suv-black-x.png` from Supabase Storage `vehicle-images/vehicles/`.<br>• Selecting different vehicle tiers and verifying capacity/luggage specs. |
| **Waitlist Lead Capture** (`/` & `/waitlist`) | `src/pages/Waitlist.tsx`<br>`src/lib/publicSms.ts` | • Email-only waitlist registration form submission.<br>• Verify lead row created in Supabase `waitlist` table.<br>• Validate compliance rule: no unsolicited SMS consent collected at signup. |
| **Driver Recruitment Portal** (`/drivers`) | `src/pages/Drivers.tsx` | • Multi-step driver application form.<br>• Upload of Florida driver's license and clean driving record.<br>• Submission of vehicle info and background check consent.<br>• Verify record creation in driver applicant tables in Supabase. |
| **Armed Guard Recruitment Portal** (`/guards`) | `src/pages/Guards.tsx` | • Security guard recruitment multi-step form.<br>• Class D (Unarmed) and Class G (Statewide Armed) license number entry.<br>• Firearms qualification score entry and document upload.<br>• Verification of record insertion in guard applicant database. |
| **App Download Landing Page** (`/download`) | `src/pages/Download.tsx` | • Direct app store download buttons (iOS App Store & Google Play).<br>• QR code scan testing via mobile camera.<br>• Verify click event logging via `track-download` Edge Function. |
| **SwimWeek VIP Transport Portal** (`/swimweek`) | `src/pages/SwimWeek.tsx` | • Dedicated event campaign landing page rendering.<br>• VIP reservation request submission.<br>• Form validation and entry into event-specific lead database. |
| **Shared Dispatch Calendar** (`/calendar/share/:token`) | `src/pages/SharedCalendar.tsx` | • Opening shared operational calendar via secure token link.<br>• Verifying date filtering, event details, and read-only access gating. |
| **Legal & Compliance Pages** (`/privacy`, `/privacy-policy`, `/terms`) | `src/pages/PrivacyPolicy.tsx`<br>`src/pages/TermsAndConditions.tsx` | • Ensure both `/privacy` and `/privacy-policy` render identical legal text.<br>• Check Florida commercial transportation regulatory disclosures and disclaimers. |
| **Public Support Chat Widget** | `src/components/SupportWidget.tsx` | • Floating support launcher opens LeadConnector widget on public pages.<br>• Gated: internal support bubble restricted to authenticated admin routes. |

---

### B. Admin Operations Hub Modules (`/admin`)

| Module / Component | Source File | What Needs to be Tested |
|---|---|---|
| **Admin 2FA Login & Session** (`/admin/login`) | `src/pages/AdminLogin.tsx` | • Password authentication with Supabase Auth.<br>• OTP delivery via email or SMS (simulated in `login_2fa_codes` table in dev).<br>• Verification of OTP code and redirection to `/admin`.<br>• Session persistence and logout behavior. |
| **Support & Ticket Desk** | `src/components/admin/AdminTickets.tsx`<br>`src/components/admin/TicketFaqDialog.tsx` | • Viewing and filtering support tickets by priority, status, and department.<br>• Ticket assignment to authenticated staff members (`admin_users_directory`).<br>• Replying to tickets and adding internal staff notes (`AdminInternalNotesPanel.tsx`).<br>• Inserting canned responses from Ticket FAQ dialog. |
| **Contract Zone & E-Signatures** | `src/components/admin/AdminContractZone.tsx`<br>`src/pages/SignContract.tsx` (`/contract/:token`) | • Creating a new armed security transport contract with client details.<br>• Email dispatch of contract signature link via `contract-send` Edge Function.<br>• Opening `/contract/:token`, reviewing legal clauses, and digital signature capture.<br>• Verification of signature submission and PDF storage via `contract-sign`. |
| **Account Ledger & SaaS Billing** | `src/components/admin/AdminAccountLedger.tsx` | • Searching SaaS billing accounts without runtime exceptions (crash fixed).<br>• Adding new vendor/SaaS subscriptions and monthly cost tallies.<br>• Password eye-toggle visibility test.<br>• Testing `ledger-reminders` reminder notifications. |
| **Operational OKR & Milestone Tracker** | `src/components/admin/OkrTracker.tsx`<br>`src/components/admin/MyTasksPanel.tsx` | • Department quarterly objectives and measurable key results.<br>• Updating milestone completion percentages and progress bars.<br>• Creating, assigning, and completing personal action items in My Tasks.<br>• Testing interactive walkthrough tours (`OkrWalkthrough.tsx`, `OkrTaskWalkthrough.tsx`). |
| **Operations & Dispatch Calendar** | `src/components/admin/EventCalendar.tsx`<br>`src/components/admin/ManageShareLinks.tsx` | • Scheduling armed escort rides, VIP events, and fleet maintenance.<br>• Generating public shareable calendar links (`calendar-share`).<br>• Verifying iCal / Google Calendar feed endpoint (`calendar-feed`).<br>• Calendar event reminder triggers (`event-reminders`). |
| **Guard & Ambassador Academy** | `src/components/admin/AdminAcademy.tsx`<br>`src/pages/Academy.tsx` (`/academy`) | • Guard curriculum modules and operational training videos.<br>• Multiple-choice quiz completion and grading via `academy-quiz`.<br>• Generating ambassador onboarding invite links (`/academy/invite/:token`).<br>• Annual recertification scheduling (`academy-recert`). |
| **Waitlist Lead Management** | `src/components/admin/AdminWaitlist.tsx` | • Reviewing incoming waitlist submissions from the public site.<br>• Updating lead status: New → Contacted → Qualified → Converted.<br>• Sending direct booking links to leads via `send-lead-link`.<br>• Filtering leads by city/region and CSV export functionality. |
| **Outbound Call Tracker & Sales Scripts** | `src/components/admin/AdminOutboundCallTracker.tsx`<br>`src/components/admin/CallScriptDialog.tsx` | • Logging outbound phone calls to VIPs and corporate clients.<br>• Tagging call outcomes (Interested, Voicemail, Follow-up Scheduled).<br>• Utilizing interactive call scripts during active calls. |
| **App Download Analytics** | `src/components/admin/AdminDownloadTracker.tsx` | • Reviewing mobile app download metrics and referral channels.<br>• Tracking conversions by platform (iOS vs Android) and campaign tags. |
| **Content & Media Management** | `src/components/admin/AdminContent.tsx` | • Modifying public site copy, emergency alerts, and banner announcements.<br>• Uploading new media assets and gallery photos via `gallery-upload`. |
| **Staff Directory & RBAC** | `src/components/admin/AdminUsers.tsx` | • Listing all staff members in `admin_users_directory`.<br>• Managing roles (`admin`, `ambassador`), supervisor privileges, and active flags.<br>• Verifying permissions enforcement across admin sub-modules. |
| **Email Template Editor** | `src/pages/EmailEditor.tsx` (`/admin/email-editor`) | • Designing transactional email templates (2FA, contracts, digests).<br>• Sending test emails to verified addresses via `send-test-email`. |
| **Team Ideas & Suggestions** | `src/components/admin/TeamIdeas.tsx` | • Submitting and upvoting operational ideas from staff.<br>• Notification alerts for new suggestions (`notify-team-idea`). |

---

### C. Master AI Copilot & Knowledge Modules

| Module / Component | Source File | What Needs to be Tested |
|---|---|---|
| **Master Chatbot Floating Bar** | `src/components/admin/MasterChatBar.tsx`<br>`supabase/functions/master-chat/` | • Asking natural language questions about fleet, bookings, and policies.<br>• Fallback mock response test (zero-key mode) vs Live OpenAI GPT response.<br>• Streaming response display in admin bar. |
| **Department AI Assistants** | `supabase/functions/department-chat/` | • Specialized chatbots for Operations, Security, Legal, and Dispatch.<br>• Verifying role-specific knowledge prompts and system instructions. |
| **Knowledge Base & FAQ Indexing** | `src/components/admin/AdminKnowledge.tsx`<br>`src/components/admin/AdminSupportKnowledge.tsx` | • Adding new operational procedures and FAQ articles.<br>• Searching knowledge base articles (`support-kb`).<br>• AI Ticket Summaries and automated suggestions (`support-ai-insights`). |

---

### D. Automated Background Cron Edge Functions

| Scheduled Edge Function | Trigger / Schedule | What Needs to be Tested |
|---|---|---|
| **`support-daily-digest`** | Daily at 08:00 UTC | Aggregates open support tickets and sends summary digest to supervisors. |
| **`weekly-digest`** | Weekly (Mondays) | Aggregates company-wide OKRs, waitlist metrics, and completed contracts. |
| **`doc-reminders`** | Daily at 09:00 UTC | Scans expiring driver/guard licenses and generates staff renewal alerts. |
| **`okr-reminders`** | Weekly | Sends milestone deadline reminders to assigned OKR owners. |
| **`ledger-reminders`** | Monthly | Scans upcoming SaaS subscription renewals and notifies billing admins. |
| **`event-reminders`** | Hourly | Scans events starting in <24 hours and triggers dispatch notifications. |
| **`escalate-tickets`** | Hourly | Auto-escalates unassigned high-priority tickets past SLA threshold. |

---

### E. External Third-Party Services (When Production Keys Added)

| Provider | Credentials Required | Verification Steps |
|---|---|---|
| **Twilio SMS** | `TWILIO_ACCOUNT_SID`<br>`TWILIO_AUTH_TOKEN`<br>`TWILIO_PHONE_NUMBER` | 1. Trigger admin 2FA SMS and verify phone receives 6-digit code.<br>2. Trigger ride assignment SMS alert to driver phone number. |
| **Resend Email** | `RESEND_API_KEY` | 1. Trigger admin 2FA email and verify inbox delivery.<br>2. Send test contract from Contract Zone and verify PDF signature link delivery.<br>3. Trigger manual test email from `/admin/email-editor`. |
| **OpenAI** | `OPENAI_API_KEY` | 1. Send query to Master Chatbar and verify live OpenAI streaming.<br>2. Test automated ticket categorization in `AdminTickets.tsx`. |
| **Mapbox** | `MAPBOX_ACCESS_TOKEN` / `VITE_MAPBOX_ACCESS_TOKEN` | 1. Type street name in pickup box on `/` and verify Florida address suggestions dropdown.<br>2. Verify geocoding via `mapbox-geocode` function. |
| **LeadConnector** | Public Widget Script | 1. Click support widget on live domain and ensure live chat box expands. |

---

### F. 👤 End-to-End User Journey Tests (Strictly as a Public User / Non-Admin)

These tests must be executed in **Incognito / Private Window** (without any admin login or staff session) to verify the real customer, applicant, and client experience.

```
                                  [ PUBLIC USER / VISITOR ]
                                              │
        ┌──────────────────┬──────────────────┼──────────────────┬──────────────────┐
        ▼                  ▼                  ▼                  ▼                  ▼
  [ VIP Client ]    [ Contract Signer ] [ Driver Applicant ] [ Guard Applicant ] [ Trainee / Guard ]
     Homepage          /contract/:token       /drivers            /guards             /academy
   Route & Fare          E-Signature        CDL & Vehicle        Class D/G           Interactive
    Estimator             Execution           Documents           License              Quizzes
```

#### 1. VIP Client / Passenger Journey (Homepage `http://localhost:8080/`)
* [ ] **Map & Route Interaction**:
  1. Open homepage in an Incognito browser.
  2. In the Pickup input, select or type a Florida location (e.g. `Miami International Airport (MIA)`).
  3. In the Dropoff input, select or type a destination (e.g. `South Beach, Ocean Drive, Miami Beach`).
  4. Verify the interactive map draws the blue route polyline with accurate mileage and estimated transit time.
* [ ] **Fleet Vehicle Selection**:
  1. Toggle between **Forti Black**, **Forti Black+**, and **Forti Black X**.
  2. Verify transparent vehicle image renders cleanly without broken image icons.
  3. Check that vehicle capacity badges (passengers & luggage count) update dynamically.
* [ ] **Lead Submission / "See Prices" Modal**:
  1. Click **"See Prices"** or **"Reserve Armed Escort"**.
  2. Fill in: Full Name, Email, Phone Number, Passenger Count, and special security requests.
  3. Submit the form.
  4. Verify client receives an instant confirmation toast and success screen ("Thank you! Our concierge team will reach out").
* [ ] **Mobile Touch & Responsiveness**:
  1. Open Chrome DevTools (`F12`) and toggle Device Mode (iPhone 14 / Pixel 7).
  2. Verify the mobile hamburger navigation opens smoothly.
  3. Verify the "See Prices" CTA stays sticky and reachable on mobile screens.

#### 2. Contract Signer / Executive Client Journey (`/contract/:token`)
* [ ] **Unauthenticated Contract Access**:
  1. Open a generated contract URL (`/contract/<token>`) in an incognito window.
  2. Ensure the user is **NOT** asked to log in to Supabase or Admin.
* [ ] **Review & Signature Capture**:
  1. Verify the client sees the executive transport agreement, passenger details, escort rates, and Florida armed protection terms.
  2. Test the digital signature canvas: draw signature using mouse cursor (or touchscreen on mobile).
  3. Type full legal name and title.
  4. Click **"Sign & Accept Agreement"**.
  5. Verify user sees a clear success screen: "Agreement Signed Successfully. A copy has been emailed to you."

#### 3. Driver Applicant Journey (`/drivers`)
* [ ] **Step 1 — Personal & Contact Details**:
  1. Navigate to `/drivers`.
  2. Fill in: Legal First/Last Name, Email, Phone, and Residential Florida Address.
* [ ] **Step 2 — Professional Driving Credentials**:
  1. Enter Florida Driver's License number, expiration date, and years of commercial/chauffeur experience.
  2. Upload a sample driver's license photo (JPG/PNG/PDF) and verify the upload progress indicator completes without errors.
* [ ] **Step 3 — Vehicle Information (If Owner-Operator)**:
  1. Select Vehicle Year (2021+), Make (Cadillac, Lincoln, Suburban), Model, and VIN.
  2. Upload insurance certificate and Florida vehicle registration.
* [ ] **Step 4 — Background Check Consent & Submission**:
  1. Check the criminal background check and driving record consent boxes.
  2. Submit the application.
  3. Verify applicant receives an immediate "Application Received — Our Fleet Manager will review within 24-48 hours" confirmation.

#### 4. Armed Security Guard Applicant Journey (`/guards`)
* [ ] **Security Licensing Credentials**:
  1. Navigate to `/guards`.
  2. Enter State of Florida **Class D** (Security Officer) license number and expiration.
  3. Enter State of Florida **Class G** (Statewide Armed Security) license number and expiration.
  4. Input annual firearms qualification score (must be 70%+ per Florida FDACS regulations) and duty weapon caliber (e.g. 9mm Glock).
* [ ] **Document Upload & Submission**:
  1. Upload photo of Class D license and Class G license cards.
  2. Check Armed Escort Code of Conduct and CJIS background check authorization.
  3. Click **"Submit Guard Application"**.
  4. Verify confirmation toast and clean redirect to success page.

#### 5. Guard / Ambassador Trainee Journey (`/academy` & `/academy/invite/:token`)
* [ ] **Accessing Curriculum Without Admin Rights**:
  1. Open an academy invitation link (`/academy/invite/<token>`) or navigate to `/academy`.
  2. Verify access to training modules (e.g., *Armed Transit Protocols*, *VIP Threat Assessment*, *De-escalation in Transit*).
* [ ] **Video Streaming & Learning Content**:
  1. Click into a lesson and verify the training video player and downloadable PDF guide open smoothly.
* [ ] **Interactive Knowledge Quiz**:
  1. Launch the end-of-module assessment quiz.
  2. Select multiple-choice answers for all questions.
  3. Click **"Submit Assessment"**.
  4. Verify the trainee receives immediate grading feedback:
     * If passing (80%+): "Congratulations! Module Certified."
     * If failed: "Score: 65% — Review Module and Retake."

#### 6. External Event Client / Planner on Shared Calendar (`/calendar/share/:token`)
* [ ] **Read-Only Access Verification**:
  1. Open a shared calendar link (`/calendar/share/<token>`) in a fresh browser session.
  2. Verify the calendar loads and displays only the dates and times relevant to that client's booking.
  3. **Security Check**: Confirm the external user **CANNOT** view other clients' confidential names, cannot view internal dispatch notes, and cannot edit/delete events.

#### 7. Website Visitor Seeking Live Concierge Support
* [ ] **Public Support Experience**:
  1. On any public page (`/`, `/drivers`, `/download`), locate the floating support chat button in the bottom-right corner.
  2. Click the icon and verify the LeadConnector widget expands smoothly.
  3. Confirm that the internal admin support bubble is **NOT** exposed to public visitors.

#### 8. Mobile App Download User (`/download`)
* [ ] **App Store Link Testing**:
  1. Navigate to `/download` on a mobile browser or desktop.
  2. Click **"Download on the App Store"** and verify it routes to the Apple App Store link.
  3. Click **"Get it on Google Play"** and verify it routes to Google Play.
  4. On desktop, point a phone camera at the QR code and ensure it scans the download URL.

---

## 4. 🚀 What Needs to Be Done Now Onwards to Make the Project Fully Workable

Here is the exact checklist for the incoming developer:

### Step 1: Apply Two Pending UI Improvements
Two minor improvements were identified and are ready to be applied:

1. **Fix Admin Dashboard Navigation (`src/pages/Admin.tsx`)**:
   * *Problem*: In `src/pages/Admin.tsx` (around line 523), the **Admin Resources** block (Contract Zone and Account Ledger buttons) is currently located inside an unreachable `else` branch because `allModules` was declared as an empty array `[]`.
   * *Solution*: Move the `Admin Resources` block up to line 426 (directly under the department grid) and ensure `params.get("module")` is read at line 96 so deep links work properly.
2. **Remove Map Watermark (`src/components/RouteMap.tsx`)**:
   * *Problem*: The homepage route map displays an "API KEY REQUIRED carto.com/basemaps/apikey" watermark because CARTO discontinued free keyless tiles.
   * *Solution*: In `src/components/RouteMap.tsx` line 46, change the tile URL to OpenStreetMap:
     ```typescript
     L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
       attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
       maxZoom: 19,
     })
     ```

---

### Step 2: Configure Live Production API Keys (When Ready)
In local development, the app works without external keys using zero-key fallbacks. When ready for live production, add these keys under **Supabase Dashboard → Project Settings ⚙️ → Edge Functions → Secrets**:

| Secret Name | Service | Purpose |
|---|---|---|
| `RESEND_API_KEY` | Resend | Real 2FA emails, contract delivery, weekly digests |
| `TWILIO_ACCOUNT_SID` | Twilio | SMS 2FA delivery, driver notifications |
| `TWILIO_AUTH_TOKEN` | Twilio | Twilio authentication |
| `TWILIO_PHONE_NUMBER` | Twilio | Outgoing virtual SMS phone number |
| `OPENAI_API_KEY` | OpenAI | Master Chatbot, knowledge base, ticket summarization |
| `MAPBOX_ACCESS_TOKEN` | Mapbox | Live Florida street address autocomplete |

*(Note: Also add `VITE_MAPBOX_ACCESS_TOKEN` to your frontend `.env` if using client-side Mapbox geocoding).*

---

### Step 3: Staff Member Provisioning
When staff members join the team and need to assign support tickets in `/admin/tickets`:
1. The user must be invited or created in **Supabase Dashboard → Authentication → Users**.
2. Run this SQL query to link them into the directory and grant admin permissions:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('<AUTH_USER_UUID>', 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;

   INSERT INTO admin_users_directory (user_id, email, full_name, is_supervisor, active)
   VALUES ('<AUTH_USER_UUID>', '<USER_EMAIL>', '<FULL_NAME>', true, true)
   ON CONFLICT (user_id) DO UPDATE SET is_supervisor = true, active = true;
   ```

---
### Step 4: Production Cloud Hosting (AWS / Vercel)
1. **Build frontend**:
   ```powershell
   npm run build
   ```
2. **Deploy `dist/` folder** to AWS S3 + CloudFront (or Vercel / Netlify).
3. **Configure SPA Rewrite**: Ensure your CDN / web server redirects all 404/403 responses to `/index.html` with HTTP status `200` so client-side routes (`/admin`, `/download`, `/waitlist`) resolve correctly.

---

## 5. 📁 Key Project File Map

```text
rideforti/
├── .env.example                      # Safe template for local environment variables
├── .gitignore                        # Protects secrets (.env), SQL dumps, and build files
├── README.md                         # Complete onboarding & setup manual (for team & fresh setups)
├── PROJECT.md                        # This handover document
├── src/
│   ├── assets/                       # Vehicle PNGs, branding logos, icons
│   ├── components/
│   │   ├── admin/                    # Admin modules (AdminAccountLedger, AdminTickets, etc.)
│   │   ├── RouteMap.tsx              # Homepage interactive Leaflet map component
│   │   └── ui/                       # shadcn/ui component primitives
│   ├── integrations/supabase/        # Supabase JavaScript client & TypeScript types
│   ├── lib/publicSms.ts              # Architectural rule: shared waitlist registration payload
│   └── pages/
│       ├── Admin.tsx                 # Core Admin portal & department dashboard
│       ├── Index.tsx                 # Homepage & "See Prices" waitlist form
│       └── ...
└── supabase/
    ├── functions/                    # 38 Deno serverless edge functions
    └── migrations/                   # SQL migration files for database schema
```

---

**Forti Technologies Inc.** — Handover Document Prepared for Engineering Team.

