
# Follow-Ups & Order Tracking System

## 1. Database Migration

### Status enum consolidation
Canonical statuses: `intake`, `in_design`, `waiting_for_client`, `in_production`, `on_hold`, `work_complete`, `ready_for_pickup`, `picked_up`, `no_follow_up_needed`. Showroom flow keeps its own subset.

Data mapping (one-time UPDATE):
- `complete` → `work_complete`
- `delivered` → `picked_up`
- `in_progress` → `in_production`
- `larry_follow_up` → `waiting_for_client`
- `no_follow_up_client` → `no_follow_up_needed`
- `quote_approved`, `ordered_stones` → `in_production`
- Update the `orders_status_check` constraint to the new set.

### New columns on `orders`
- `next_follow_up_date` (date, nullable)
- `last_contacted_at` (timestamptz, nullable)
- `preferred_contact_method` (text: phone|text|email|any, default 'any')
- `follow_up_reason` (text, from fixed list)
- `follow_up_owner_id` (uuid → auth.users, nullable)
- `internal_priority` (text: low|normal|high|urgent, default 'normal')
- `blocked_reason` (text, nullable)
- `private_follow_up_notes` (text, nullable)
- `production_updated_at` (timestamptz, auto-set when status changes within production stages — used for "no update in 7+ days")

Indexes on `(next_follow_up_date)`, `(status)`, `(internal_priority)`.

### `client_interactions` upgrade
Add columns: `related_order_id` (uuid, nullable), `next_follow_up_date` (date, nullable), `follow_up_reason` (text, nullable), `resolved_follow_up` (bool default false), `occurred_at` already exists.
Expand `interaction_type` values: `call`, `text`, `email`, `voicemail`, `in_person`, `note`.

### Trigger: auto-touch `last_contacted_at`
After insert on `client_interactions` where type ∈ {call,text,email,voicemail} and `related_order_id` is set → update `orders.last_contacted_at = now()`. If `resolved_follow_up = true`, clear `next_follow_up_date` on the order and set from interaction's `next_follow_up_date` if provided.

### RLS / GRANTs
New columns inherit existing `orders` policies. Client-facing views (TrackOrder) must exclude `private_follow_up_notes`, `blocked_reason`, `internal_priority`, `follow_up_owner_id`, `follow_up_reason` — enforced by selecting only public columns in `TrackOrder.tsx` (already uses explicit column selection).

### Helper views (for later digest & calendar sync)
- `v_followups_due_today` — active orders where `next_follow_up_date <= current_date`
- `v_followups_overdue` — `next_follow_up_date < current_date`
- `v_ready_for_pickup` — `status = 'ready_for_pickup'`
- `v_production_stale` — status in production/design and `production_updated_at < now() - interval '7 days'`
- `v_orders_no_followup` — active status but `next_follow_up_date IS NULL AND follow_up_reason <> 'no_follow_up_needed'`

Views are `security_invoker=on` so existing RLS applies.

## 2. Order form & edit UX

Add to intake + edit panels in `AdminDashboard.tsx`:
- Preferred contact method (radio: Phone/Text/Email/Any)
- Next follow-up date (date picker)
- Follow-up reason (select, values listed above)
- Priority (select: Low/Normal/High/Urgent, color-coded)
- Follow-up owner (select of staff users from `user_roles` join `profiles`)
- Blocked reason (textarea, shown only when status = On Hold)
- Private follow-up notes (textarea, staff-only)

Status dropdown gets tooltips describing when to use each.

### Hard-block validation (client-side + server via DB check)
- Active order (`status NOT IN ('picked_up','no_follow_up_needed')`): must have `next_follow_up_date` OR `follow_up_reason = 'no_follow_up_needed'`.
- `status = 'waiting_for_client'` → `next_follow_up_date` required.
- `status = 'on_hold'` → `blocked_reason` required.
- `status = 'ready_for_pickup'` → auto-default `next_follow_up_date = today` if empty.
- Email: regex validation; Phone: normalize to `(###) ###-####` on blur.

Enforced with a `BEFORE INSERT/UPDATE` trigger on `orders` that raises on violation (so RLS-permitted callers cannot bypass).

## 3. Follow-Ups page — `/admin/follow-ups`

New route + nav link. Tab bar filters (counts shown as badges):
1. Due Today
2. Overdue
3. Waiting for Client
4. Ready for Pickup
5. No Follow-Up Scheduled
6. High Priority (`internal_priority IN ('high','urgent')`)
7. Production Updates Needed (from `v_production_stale`)

Row layout (dense, one-line-per-order table with expandable detail):
- Client name • CL-#### • priority chip
- Phone • Email icons (tel:/mailto: + copy button)
- Order # + item description (truncated)
- Status badge • Department
- Follow-up reason • Preferred contact chip
- Last contacted (relative) • Next follow-up (relative, red if overdue)
- Action buttons: Called · Texted · Emailed · Left VM · Add Note · Reschedule

Each quick action opens a small dialog pre-filled with:
- Interaction type
- Note (optional for quick actions, required for Add Note)
- Next follow-up date (defaults +3 days for Called/Texted, +1 day for VM)
- Resolved checkbox
On save: inserts `client_interactions` (trigger updates order). Row auto-refreshes.

Reschedule = date picker only, updates `next_follow_up_date`.

## 4. Client detail timeline upgrade

`AdminClientDetail.tsx`:
- Log Interaction form gains: type (all 6 options), related order (select of that client's orders), next follow-up date, follow-up reason, resolved-toggle.
- Timeline entries show related order pill + resolution badge.
- Orders / Appointments / Quotes tabs: verify all wired; add empty-state helper text. Orders tab already queries by `customer_profile_id` — extend to also include orders matched by email in case of unlinked historical orders.

## 5. Admin dashboard cards

Above existing tabs in `AdminDashboard.tsx`, add a 6-card grid using the helper views:
- Follow-Ups Due Today (blue)
- Overdue (red)
- Waiting For Client (amber)
- Ready For Pickup (green)
- Orders Without Follow-Up (gray)
- Production Stale 7+ Days (purple)

Each card clicks through to `/admin/follow-ups?tab=…`.

## 6. Digest & Calendar readiness (no sending yet)

- Views above already provide the digest queries.
- Add nullable `google_calendar_event_id` column on `orders` for future two-way sync.
- No edge function or cron wired now; document that a future `daily-followup-digest` function will query the views and email the owner.

## 7. Client-facing safety

`TrackOrder.tsx`: audit its select list — ensure it never selects `private_follow_up_notes`, `blocked_reason`, `internal_priority`, `follow_up_owner_id`, `follow_up_reason`, `next_follow_up_date`. Client status mapping updated for new canonical statuses.

---

## Technical details

- New file: `src/pages/AdminFollowUps.tsx`
- Modified: `src/pages/AdminDashboard.tsx` (intake/edit fields, validation, cards, status list), `src/pages/AdminClientDetail.tsx` (interaction form, related order), `src/pages/TrackOrder.tsx` (status mapping, safe columns), `src/components/Navbar.tsx` (Follow-Ups link), `src/App.tsx` (route).
- New shared module: `src/lib/order-status.ts` — canonical status list, labels, colors, tooltips, allowed transitions.
- Memory updates: refresh `mem://workflow/repairs`, `mem://workflow/custom-pieces`, `mem://workflow/client-milestones` with the new canonical status list.

## Out of scope (per your instructions)

- No outbound automated client SMS/email.
- No live Google Calendar sync (schema ready only).
- No daily digest edge function (queries ready only).
