# RideForti Migration Changelog

This document tracks all modifications made to the codebase during the migration from Lovable to self-hosted infrastructure (AWS + Supabase).

---

## [2026-11-02] - Initial Local Setup & Supabase Migration

### 1. `vite.config.ts`
* **Change:** Changed server host configuration from `"::"` (IPv6 only) to `true` (all local hosts).
* **Location:** `server.host`
* **Reason:** On Windows systems, `"::"` prevents browsers from connecting via IPv4 (`localhost` / `127.0.0.1`), causing `ERR_CONNECTION_REFUSED`.
* **Impact:** Development server is now accessible via `http://localhost:8080`, `http://127.0.0.1:8080`, and local network IP.

---

### 2. `.env`
* **Change:** Preserved previous Lovable Cloud configuration as comments at the top; added test Supabase credentials.
* **Location:** Whole file
* **Reason:** Connect frontend to the newly provisioned Supabase test project while keeping original production keys intact for reference.
* **Original Keys (Preserved):**
  * `VITE_SUPABASE_PROJECT_ID="ezatconmqkxeypaodyoj"`
  * `VITE_SUPABASE_URL="https://ezatconmqkxeypaodyoj.supabase.co"`
* **Current Test Keys:**
  * Project ID: `labmrcabiongzugvwghs`
  * URL: `https://labmrcabiongzugvwghs.supabase.co`

---

### 3. `supabase/config.toml`
* **Change:** Updated `project_id` to linked test project.
* **Location:** Line 1
* **Before:** `project_id = "ezatconmqkxeypaodyoj"`
* **After:** `project_id = "labmrcabiongzugvwghs"`
* **Reason:** Supabase CLI uses this to verify the linked project context.

---

### 4. `supabase/migrations/20260424192333_7f290c6f-ff11-4141-abc9-7d2cf3f71d66.sql`
* **Change:**
  1. Added `CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;`
  2. Changed `gen_random_bytes(8)` to `extensions.gen_random_bytes(8)`.
* **Location:** Line 6 and Line 26
* **Reason:** When pushing to standard Supabase, `pgcrypto` functions reside in the `extensions` schema. Calling `gen_random_bytes` without the schema prefix resulted in PostgreSQL error `SQLSTATE 42883 (function does not exist)`.
* **Impact:** Migration applies cleanly on standard Supabase databases.

---

### 5. `supabase/migrations/20260430164833_63ee691d-e835-4e7b-a231-a1a704dafcfe.sql`
* **Change:** Wrapped single-line `INSERT INTO public.user_roles` inside an `IF EXISTS (SELECT 1 FROM auth.users WHERE id = '3b4fcfde-c37b-4ca3-b6a7-f01cf200a68e')` block.
* **Location:** Whole file
* **Reason:** The original migration attempted to assign an admin role to a specific user ID created on Lovable. On a fresh Supabase database, that user does not exist yet, causing foreign key constraint violation (`user_roles_user_id_fkey`).
* **Impact:** The migration safely applies without crashing when the user is absent, and still grants the role if that user ID is imported.

---

### 6. `package.json`
* **Change:** Added `supabase` CLI (`^2.122.0`) to `devDependencies`.
* **Reason:** Allows running Supabase CLI commands (`npx supabase link`, `db push`, `functions deploy`) consistently in the local environment without downloading remote tarballs every time.

---

### 7. `src/index.css`
* **Change:** Moved `@import url(...)` to line 1 at the top of the file, above `@tailwind base;`.
* **Reason:** Follows W3C CSS specifications requiring `@import` statements to precede all other rules, eliminating Vite's `[vite:css] @import must precede all other statements` warning.

---

### 8. `supabase/functions/mcp` & `vite.config.ts`
* **Change:** Removed unused Lovable internal `mcp` function and unhooked `mcpPlugin()` from `vite.config.ts`.
* **Reason:** `@lovable.dev/mcp-js` automatically generated `supabase/functions/mcp/index.ts` containing a hardcoded Windows local path (`npm:C:\Users\...`). When deploying to Supabase Cloud, Supabase's Linux Deno builder failed with `npm package 'C:\Users...' does not exist (status 400)`. The website itself never calls `mcp`.
* **Impact:** All 38 real application Edge Functions now bundle and deploy cleanly to Supabase.



