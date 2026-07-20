
DROP VIEW IF EXISTS public.v_followups_due_today;
DROP VIEW IF EXISTS public.v_followups_overdue;
DROP VIEW IF EXISTS public.v_production_stale;
DROP VIEW IF EXISTS public.v_orders_no_followup;

ALTER TABLE public.orders DROP COLUMN IF EXISTS current_department;

CREATE VIEW public.v_followups_due_today WITH (security_invoker=on) AS
SELECT * FROM public.orders
WHERE status <> ALL (ARRAY['picked_up','no_follow_up_needed'])
  AND next_follow_up_date IS NOT NULL
  AND next_follow_up_date <= CURRENT_DATE;

CREATE VIEW public.v_followups_overdue WITH (security_invoker=on) AS
SELECT * FROM public.orders
WHERE status <> ALL (ARRAY['picked_up','no_follow_up_needed'])
  AND next_follow_up_date IS NOT NULL
  AND next_follow_up_date < CURRENT_DATE;

CREATE VIEW public.v_production_stale WITH (security_invoker=on) AS
SELECT * FROM public.orders
WHERE status = ANY (ARRAY['in_design','in_production','work_complete'])
  AND (production_updated_at IS NULL OR production_updated_at < now() - interval '7 days');

CREATE VIEW public.v_orders_no_followup WITH (security_invoker=on) AS
SELECT * FROM public.orders
WHERE status <> ALL (ARRAY['picked_up','no_follow_up_needed'])
  AND next_follow_up_date IS NULL
  AND (follow_up_reason IS NULL OR follow_up_reason <> 'no_follow_up_needed');

GRANT SELECT ON public.v_followups_due_today TO authenticated;
GRANT SELECT ON public.v_followups_overdue TO authenticated;
GRANT SELECT ON public.v_production_stale TO authenticated;
GRANT SELECT ON public.v_orders_no_followup TO authenticated;
