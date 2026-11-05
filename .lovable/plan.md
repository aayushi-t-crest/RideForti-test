## Goal

Let leads be booked (or marked "no") multiple times so the team can track repeat rides per contact. Admins get a Reset action; "Book Another" appears after a booked ride; a "Booked" button appears next to a "No" so a previous no can become a yes later. Show ride count when a lead is expanded.

## Model change

Each lead currently has a single `ride_booked` boolean. We move to a history of attempts.

New table `outbound_call_contact_rides`:
- `contact_id` → outbound_call_contacts
- `list_id` (cached for fast filtering)
- `booked` boolean (true = ride booked, false = said no)
- `submitted_by`, `submitted_at`
- `incentive_amount` (default 5.00, only meaningful when booked)
- `incentive_status` ("pending" | "approved" | "denied" | "paid")
- `incentive_reviewed_by`, `incentive_reviewed_at`, `incentive_note`
- created_at / updated_at

RLS: admins full access (matches current contact policies). Added to `supabase_realtime` publication with REPLICA IDENTITY FULL.

Backfill: insert one ride per contact whose current `ride_booked` is not null, copying submitted_by/at and the incentive_* fields.

The `outbound_call_contacts.ride_booked` and incentive_* columns stay as a "latest attempt" cache so existing summary cards keep working without rewrites, but reads in the UI come from the rides list when one exists.

## Behavior

Each row in the contact list keeps showing the most recent outcome. Below the row:

- **Booked (latest)** → show green pill + Reset (admin only) + "Book Another" button. "Book Another" opens the existing confirm dialog and creates a new `booked=true` ride entry.
- **No (latest)** → show red pill + Reset (admin only) + new "Booked" button to flip the outcome for a future trip (creates a new `booked=true` ride).
- **Pending** → unchanged (Booked / No buttons).

Reset (admin only) clears all rides for that contact (or just the latest, see open question) and returns the contact to pending. Non-admins do not see Reset.

When a lead is expanded, add a "Ride History" section showing:
- "Rides booked: N" headline
- A compact timeline of each attempt: outcome chip, agent name, timestamp, incentive status

Team Incentives totals are computed by summing across all rides (not just one per contact), so an agent who books the same lead twice gets credit twice.

Booking Approvals bell continues to work — it lists pending `booked=true` rides instead of contacts; approve/deny updates that specific ride. Denying a ride removes it from the history (or marks it declined — see open question) so the lead becomes available again.

## UI specifics

- Booked pill row gets two new buttons: `Reset` (admin only, ghost/outline) + `Book Another` (metallic).
- No pill row gets `Reset` (admin) + `Booked` (emerald).
- Expanded panel: new card titled "Ride History" with count and per-ride entries.
- Reset uses the existing AlertDialog pattern with a clear confirm.

## Files touched

- New migration: `outbound_call_contact_rides` table + RLS + realtime + backfill.
- `src/components/admin/AdminOutboundCallTracker.tsx` — load rides per contact, render history, add Reset / Book Another / Booked buttons, gate Reset behind admin role, update incentive totals to sum rides.
- `src/components/admin/BookingApprovalsBell.tsx` — query pending rides instead of contacts; approve/deny updates the ride row.

## Open questions

1. **Reset scope:** wipe the entire ride history for that contact, or only undo the latest attempt? (Latest-only is safer; full wipe is simpler.)
2. **Denied approvals:** when an admin denies a submitted booking, should the ride be deleted (lead returns to pending) or kept as `incentive_status=denied` in history? Currently denying deletes; keeping it would preserve the audit trail.
