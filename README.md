# RideForti — Architecture, Team Onboarding & Deployment Guide

> **RideForti** is a Florida-based luxury armed mobility and executive protection platform. This repository contains the complete frontend web application (React + Vite + TypeScript) and the standalone serverless backend (38 Supabase Deno Edge Functions).

---

## 🧭 Choose Your Setup Path

* **[👉 Quick Start for Existing Team Members](#-fast-track-for-existing-team-members)** *(Already invited to the team Supabase project & have API access — Setup takes ~3 minutes)*
* **[🛠️ Full Setup From Scratch](#%EF%B8%8F-full-setup-from-scratch-new-supabase-project)** *(Creating a brand new Supabase instance, new database, fresh migrations, and new buckets)*

---

## ⚡ Fast Track for Existing Team Members

If you are already added to the RideForti Supabase project (`labmrcabiongzugvwghs`) as a team member, all 94 database tables, storage buckets, and 38 Edge Functions are **already live and configured**. 

You do **not** need to recreate databases, storage, or functions. Follow these 4 simple steps to run the app locally:

### 1. Prerequisites
* **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
* **Git**: ([Download Git](https://git-scm.com/))

### 2. Clone the Repository & Install Dependencies
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd rideforti
npm install
```

### 3. Set Up Environment Variables (`.env`)
Create your `.env` file from the example:
```bash
# Windows PowerShell
Copy-Item .env.example .env

# Mac / Linux
cp .env.example .env
```

Open `.env` and configure it with the team's Supabase project credentials:
```env
# Team Supabase Project Credentials
VITE_SUPABASE_PROJECT_ID="labmrcabiongzugvwghs"
VITE_SUPABASE_PUBLISHABLE_KEY="<PROJECT_ANON_PUBLIC_KEY>"
VITE_SUPABASE_URL="https://labmrcabiongzugvwghs.supabase.co"

# Optional: Mapbox Address Autocomplete
VITE_MAPBOX_ACCESS_TOKEN=""
```

> **Where to find your API Keys:**
> 1. Log into **[Supabase Dashboard](https://supabase.com/dashboard)** with your team member account.
> 2. Open project **`rideforti`** (`labmrcabiongzugvwghs`).
> 3. Go to **Project Settings ⚙️ → API**.
> 4. Copy the **Project URL** and the **`anon` `public` key** into your `.env`.

### 4. Start the Local Development Server
```bash
npm run dev
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser. The app is connected directly to the shared cloud database!

---

### 🔑 Team Member Admin Access & 2FA Login

To log into the Admin Portal (`http://localhost:8080/admin`):

1. **Ensure your Auth user exists**:
   * In **Supabase Dashboard → Authentication → Users**, check if your email has an account. If not, click **"Add user"** → **"Create user"**, set your email/password, and toggle **"Auto Confirm User"** to **ON**.
2. **Ensure your user has Admin Role**:
   * In **Supabase Dashboard → SQL Editor**, run this query with your User UID:
     ```sql
     INSERT INTO user_roles (user_id, role)
     VALUES ('<YOUR_USER_UID>', 'admin')
     ON CONFLICT (user_id, role) DO NOTHING;

     INSERT INTO admin_users_directory (user_id, email, full_name, is_supervisor, active)
     VALUES ('<YOUR_USER_UID>', '<YOUR_EMAIL>', '<YOUR_NAME>', true, true)
     ON CONFLICT (user_id) DO UPDATE SET is_supervisor = true, active = true;
     ```
3. **Log in & Retrieve 2FA OTP**:
   * Navigate to `http://localhost:8080/admin/login` and submit your email & password.
   * On the 2FA screen, choose Email or SMS.
   * In the Supabase Dashboard, go to **Table Editor → `login_2fa_codes`**. Your 6-digit code is in the top row.
   * Enter the code to access the operational dashboard.

---

### 🛠️ Working with Edge Functions or DB Schema (Team Developers)

If your task involves updating backend edge functions or database schema:

```bash
# 1. Log in to Supabase CLI with your team account
npx supabase login

# 2. Link your local directory to the team project
npx supabase link --project-ref labmrcabiongzugvwghs

# 3. Deploy changes to a specific Edge Function
npx supabase functions deploy <function-name> --project-ref labmrcabiongzugvwghs

# 4. Push new database schema migrations (if any new SQL migrations are added)
npx supabase db push
```

---

## 🛠️ Full Setup From Scratch (New Supabase Project)

Use this section **only** if you are setting up a completely independent Supabase instance, disaster recovery environment, or staging project from zero.

### Step 1: Create Supabase Project
1. Log into **[https://supabase.com](https://supabase.com)** and create a new project.
2. Note your **Project Reference ID** (e.g. `labmrcabiongzugvwghs`).
3. Retrieve your `anon` key, `service_role` key, and Project URL from **Project Settings ⚙️ → API**.

### Step 2: Push Database Schema Migrations
Deploy all 94 tables, relations, triggers, and RLS policies:
```bash
npx supabase login
npx supabase link --project-ref <YOUR_NEW_PROJECT_REF>
npx supabase db push
```

### Step 3: Configure Storage Buckets
Create the following buckets under **Supabase Dashboard → Storage → Buckets**:

| Bucket Name | Public Access | Purpose |
|---|---|---|
| **`vehicle-images`** | **Public** ✅ | Fleet vehicle transparent PNGs |
| **`how-it-works-images`** | **Public** ✅ | Explainer step graphics |
| **`security-images`** | **Public** ✅ | Armed escort badge graphics |
| **`use-case-images`** | **Public** ✅ | Airport / VIP event graphics |
| **`contracts`** | Private 🔒 | Legal PDF contracts for signature |
| **`support-internal-attachments`**| Private 🔒 | Private support ticket file attachments |

**Upload Fleet Graphics:**
1. Open the **`vehicle-images`** bucket.
2. Create a folder named: `vehicles`.
3. Upload `suv-black.png`, `suv-black-plus.png`, and `suv-black-x.png` from local `src/assets/` into `vehicles/`.

### Step 4: Deploy All 38 Edge Functions
```bash
npx supabase functions deploy --project-ref <YOUR_NEW_PROJECT_REF>
```

Functions include:
* *Authentication:* `send-2fa`, `academy-auth`, `ambassador-auth`
* *Operations:* `admin-api`, `calendar-feed`, `calendar-share`, `notify-assignment`
* *Contracts & Academy:* `contract-send`, `contract-sign`, `academy-content`, `academy-quiz`
* *Support & AI:* `support-chat`, `master-chat`, `department-chat`, `support-db`
* *Scheduled Reminders:* `doc-reminders`, `event-reminders`, `okr-reminders`, `weekly-digest`

---

## 🔐 Production Third-Party API Secrets

In local development, **all edge functions run in zero-key fallback mode** (simulating emails, SMS, and AI responses without crashing).

To activate live external services, configure these secrets under **Supabase Dashboard → Project Settings ⚙️ → Edge Functions → Secrets**:

| Secret Name | Service | Purpose |
|---|---|---|
| `MAPBOX_ACCESS_TOKEN` | [Mapbox](https://account.mapbox.com) | Florida street address autocomplete |
| `RESEND_API_KEY` | [Resend](https://resend.com) | Live 2FA login emails, contracts & digests |
| `TWILIO_ACCOUNT_SID` | [Twilio](https://twilio.com) | SMS dispatch and 2FA delivery |
| `TWILIO_AUTH_TOKEN` | Twilio | Twilio API Auth Token |
| `TWILIO_PHONE_NUMBER` | Twilio | Outgoing virtual SMS number |
| `OPENAI_API_KEY` | [OpenAI](https://platform.openai.com) | Master Chat & ticket triage assistant |

---

## 🧪 Testing & Quality Assurance

Run unit tests locally before committing changes:
```bash
npm test
```
All tests should pass (`4/4 passed`).

---

## 📦 Production Build & Cloud Deployment

### 1. Build Optimized Static Bundle
```bash
npm run build
```
Generates production assets in the `dist/` directory.

### 2. Deploy to AWS CloudFront / S3 (or Vercel / Netlify)
* Upload contents of `dist/` to the static hosting root.
* Ensure Single Page Application (SPA) routing is enabled by redirecting 404s to `/index.html` with status code 200.

---

**Forti Technologies Inc.** — Proprietary & Confidential.
