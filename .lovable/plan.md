## Finished Products page

### Database
Migration approved and applied: `finished_products` table with RLS (staff manage all; customers see their own) and `update_updated_at` trigger. `customer_profile_id` and `order_id` are both nullable.

### New page `/admin/finished-products`
Form fields:
- **Custom Product** (Engagement Ring, Wedding Ring, Earrings, Bracelet, Necklace, Pendant, Other → free-text)
- **Metal Type** (Gold / Silver / Platinum)
- **Metal Color** (White / Yellow / Rose / Other → free-text)
- **Weight**, **Stone Type**, **GEM-SKU** (text)
- **Cost**, **Client Cost** (numeric)
- **Notes** (textarea)

Linking section (both optional):
- **Link to Client** — searchable select over `profiles` with "— No client —" option
- **Attach to Order** — appears once a client is selected; lists only that client's orders, includes "— No order —"; shows a hint when the client has no orders

Below: recent finished products table (date, product, metal, client, order, cost, client cost, delete).

Validation: zod for required fields; "Other" specifier required when chosen; costs ≥ 0.

### Navigation
- New route `/admin/finished-products` in `src/App.tsx`
- "Finished Products" link added to AdminDashboard top nav and the page's own nav

### Files
- New: `src/pages/FinishedProducts.tsx`
- Edit: `src/App.tsx` (import + route)
- Edit: `src/pages/AdminDashboard.tsx` (nav link)

### Out of scope
- No SMS/email notifications
- No public client-facing display