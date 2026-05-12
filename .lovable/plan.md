# Client Numbers & Clients Page

Introduce a unique client identifier (`CL-0001`, `CL-0002`, …) so every order — including guest intakes — is grouped under a single client record. Existing clients with the same identity are deduplicated so they share one client number.

## What you'll get

- Every client (signed-up or guest) gets a permanent **CL-####** number.
- Every order is automatically attached to a client based on email **or** name match — no manual linking.
- Existing duplicate client records (same person entered multiple times) are merged into a single client with one number.
- A new **Clients** page in the admin showing all clients, contact info, total orders, and click-through to that client's full order history.
- Client number visible on the order table and order detail panel.

## How it works

### 1. Database changes

**`profiles` table**
- Add `client_number TEXT UNIQUE` (auto-generated, format `CL-0001`).
- Add sequence `client_number_seq` and a BEFORE INSERT trigger that fills `client_number` if empty.

**Order intake — find-or-create client (BEFORE INSERT trigger on `orders`)**
1. If `customer_profile_id` is already set → done.
2. Match by **email** (case-insensitive, trimmed).
3. If no email match, match by **normalized name** — `lower(trim(first_name))` + `lower(trim(last_name))` — and, when available, also matching **phone** (last 10 digits) to avoid false merges between different people sharing a name.
4. If still no match → create a guest profile (name/email/phone copied from the order) with a new `CL-####`.
5. Set `customer_profile_id` on the order.

The existing `handle_new_user` trigger keeps working: when a guest later signs up, we'll update it to **merge into the existing guest profile** by email instead of creating a duplicate.

### 2. One-time backfill & dedupe

Runs once during the migration:

1. **Generate `client_number`** for all existing profiles, ordered by `created_at` (oldest = CL-0001).
2. **Detect duplicate clients** in `profiles` using:
   - same lowercased email, OR
   - same normalized first+last name AND same last-10-digits of phone (when both rows have a phone), OR
   - same normalized first+last name AND same email domain (fallback when phone missing on one side).
3. **Merge duplicates**: keep the oldest profile (the "canonical" one — keeps its `CL-####` and its `user_id` if any). For each duplicate:
   - Repoint `orders.customer_profile_id`, `appointments.customer_profile_id`, `appointment_invitations` (via order), `finished_products.customer_profile_id` to the canonical profile.
   - Copy any non-null fields the canonical row is missing (phone, sms_consent, etc.).
   - Delete the duplicate profile row.
4. **Link guest orders**: for every order with `customer_email` but no `customer_profile_id`, run the same find-or-create logic to attach it.
5. Produce a summary in the migration output: `X profiles numbered, Y duplicates merged, Z guest orders linked`.

> Edge cases: rows where the merge is ambiguous (same name, no phone, different email domains) are **left as separate clients** — safer to keep apart than incorrectly merge two real people. Staff can manually merge later via a future "Merge clients" action.

### 3. Admin UI

**New page: `/admin/clients`**
- Table columns: `Client #` · `Name` · `Email` · `Phone` · `Total Orders` · `Last Order Date` · Actions.
- Search by name, email, phone, or client number.
- Sort `Client #` numerically (per project rule).
- Click a row → client detail panel with contact info + list of all their orders (number, type, status, date) with click-through.
- Horizontal scroll on mobile.

**Order table & detail (existing admin dashboard)**
- Show `CL-####` next to client name in the orders table and order detail panel.

**Navigation**
- Add a "Clients" link in the admin nav.

### 4. Memory updates

- Add Core rule: *Every client has a unique CL-#### number; orders auto-link to clients by email, then by normalized name+phone, on intake.*
- Add `features/client-identification` describing format, generation, and the find-or-create + dedupe rules.

## Technical details

```sql
CREATE SEQUENCE public.client_number_seq START 1;
ALTER TABLE public.profiles ADD COLUMN client_number TEXT UNIQUE;

-- helpers
-- norm_name(first, last)  -> lower(trim(first)) || '|' || lower(trim(last))
-- norm_phone(p)           -> right(regexp_replace(coalesce(p,''),'\D','','g'), 10)

CREATE FUNCTION public.generate_client_number() RETURNS trigger ...
CREATE FUNCTION public.link_order_to_client()    RETURNS trigger ...
```

- `client_number` is not year-based (per your choice) → simple numeric sort on the suffix.
- Merging is idempotent: re-running the backfill is a no-op once everything is linked.
- Staff RLS already allows full read/write on `profiles`, so no policy changes needed.

## Out of scope

- Manual "merge two clients" admin action (can add later if duplicates appear from edge cases the auto-merge skipped).
- Exposing client number on the public order tracking page.
