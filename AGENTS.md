# Architecture rules
- Client promotional emails use a staff-authenticated Edge Function and the linked Resend gateway; sending requires explicit confirmation and never runs in the background.
- Email drafts are staff-only database records; deliveries use a per-send recipient uniqueness key to prevent accidental retries from sending duplicates.
- Marketing opt-outs are held in a server-only preferences table and checked alongside existing suppression records before every send; unsubscribe links require confirmation on GET and support one-click POST.
- Christmas email defaults live in a shared pure module so preview, sender validation helpers, and rule tests can share the same source.
- Promotional email rendering uses explicitly matching React and React DOM versions in a side-effect-free renderer with a Deno regression test to prevent incompatible element formats.
