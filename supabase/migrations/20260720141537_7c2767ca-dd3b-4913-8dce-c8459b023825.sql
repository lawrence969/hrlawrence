
-- 1. Migrate legacy status values
UPDATE public.orders SET status = 'work_complete' WHERE status = 'complete';
UPDATE public.orders SET status = 'picked_up' WHERE status = 'delivered';
UPDATE public.orders SET status = 'in_production' WHERE status IN ('in_progress','quote_approved','ordered_stones');
UPDATE public.orders SET status = 'waiting_for_client' WHERE status = 'larry_follow_up';
UPDATE public.orders SET status = 'no_follow_up_needed' WHERE status = 'no_follow_up_client';
UPDATE public.orders SET status = 'ready_for_pickup' WHERE status = 'ready_pickup';

-- 2. Status check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'intake','in_design','waiting_for_client','in_production','on_hold',
  'work_complete','ready_for_pickup','picked_up','no_follow_up_needed'
));

-- 3. New columns on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS next_follow_up_date date,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS preferred_contact_method text NOT NULL DEFAULT 'any'
    CHECK (preferred_contact_method IN ('phone','text','email','any')),
  ADD COLUMN IF NOT EXISTS follow_up_reason text
    CHECK (follow_up_reason IS NULL OR follow_up_reason IN (
      'waiting_client_approval','waiting_deposit','waiting_stone',
      'design_update','production_update','ready_for_pickup',
      'quote_follow_up','general_check_in','no_follow_up_needed'
    )),
  ADD COLUMN IF NOT EXISTS follow_up_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS internal_priority text NOT NULL DEFAULT 'normal'
    CHECK (internal_priority IN ('low','normal','high','urgent')),
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS private_follow_up_notes text,
  ADD COLUMN IF NOT EXISTS production_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text;

CREATE INDEX IF NOT EXISTS idx_orders_next_follow_up ON public.orders(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_priority ON public.orders(internal_priority);

-- 4. Interactions upgrade
ALTER TABLE public.client_interactions
  ADD COLUMN IF NOT EXISTS related_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_follow_up_date date,
  ADD COLUMN IF NOT EXISTS follow_up_reason text,
  ADD COLUMN IF NOT EXISTS resolved_follow_up boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_interactions_related_order ON public.client_interactions(related_order_id);

-- 5. SEED legacy rows before creating validation trigger so they don't fail it
UPDATE public.orders
SET follow_up_reason = 'no_follow_up_needed'
WHERE follow_up_reason IS NULL
  AND next_follow_up_date IS NULL
  AND status IN ('intake','in_design','waiting_for_client','in_production','on_hold','work_complete','ready_for_pickup');

UPDATE public.orders SET production_updated_at = updated_at
WHERE production_updated_at IS NULL AND status IN ('in_design','in_production','work_complete');

-- Waiting-for-client rows without a date: default to today so they satisfy the trigger later
UPDATE public.orders
SET next_follow_up_date = current_date
WHERE status = 'waiting_for_client' AND next_follow_up_date IS NULL;

-- On-hold rows without a blocked_reason: set a placeholder so trigger doesn't block edits
UPDATE public.orders
SET blocked_reason = 'Legacy — reason not recorded'
WHERE status = 'on_hold' AND (blocked_reason IS NULL OR btrim(blocked_reason) = '');

-- 6. Order validation trigger
CREATE OR REPLACE FUNCTION public.orders_validate_followup()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  active_statuses text[] := ARRAY['intake','in_design','waiting_for_client','in_production','on_hold','work_complete','ready_for_pickup'];
  production_statuses text[] := ARRAY['in_design','in_production','work_complete'];
BEGIN
  IF NEW.status = 'ready_for_pickup' AND NEW.next_follow_up_date IS NULL THEN
    NEW.next_follow_up_date := current_date;
  END IF;

  IF NEW.status = 'waiting_for_client' AND NEW.next_follow_up_date IS NULL THEN
    RAISE EXCEPTION 'A next follow-up date is required when status is Waiting For Client.';
  END IF;

  IF NEW.status = 'on_hold' AND (NEW.blocked_reason IS NULL OR btrim(NEW.blocked_reason) = '') THEN
    RAISE EXCEPTION 'A blocked reason is required when status is On Hold.';
  END IF;

  IF NEW.status = ANY(active_statuses)
     AND NEW.next_follow_up_date IS NULL
     AND NEW.follow_up_reason IS DISTINCT FROM 'no_follow_up_needed' THEN
    RAISE EXCEPTION 'Active orders require a next follow-up date, or the follow-up reason must be "No follow-up needed".';
  END IF;

  IF NEW.status = ANY(production_statuses) THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
      NEW.production_updated_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_validate_followup ON public.orders;
CREATE TRIGGER trg_orders_validate_followup
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_validate_followup();

-- 7. Interaction after-insert trigger
CREATE OR REPLACE FUNCTION public.interactions_touch_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.related_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.interaction_type IN ('call','text','email','voicemail') THEN
    UPDATE public.orders
      SET last_contacted_at = COALESCE(NEW.occurred_at, now())
      WHERE id = NEW.related_order_id;
  END IF;

  IF NEW.next_follow_up_date IS NOT NULL OR NEW.resolved_follow_up THEN
    UPDATE public.orders
      SET next_follow_up_date = NEW.next_follow_up_date
      WHERE id = NEW.related_order_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_interactions_touch_order ON public.client_interactions;
CREATE TRIGGER trg_interactions_touch_order
  AFTER INSERT ON public.client_interactions
  FOR EACH ROW EXECUTE FUNCTION public.interactions_touch_order();

-- 8. Reporting views
CREATE OR REPLACE VIEW public.v_followups_due_today WITH (security_invoker = on) AS
  SELECT * FROM public.orders
  WHERE status NOT IN ('picked_up','no_follow_up_needed')
    AND next_follow_up_date IS NOT NULL
    AND next_follow_up_date <= current_date;

CREATE OR REPLACE VIEW public.v_followups_overdue WITH (security_invoker = on) AS
  SELECT * FROM public.orders
  WHERE status NOT IN ('picked_up','no_follow_up_needed')
    AND next_follow_up_date IS NOT NULL
    AND next_follow_up_date < current_date;

CREATE OR REPLACE VIEW public.v_production_stale WITH (security_invoker = on) AS
  SELECT * FROM public.orders
  WHERE status IN ('in_design','in_production','work_complete')
    AND (production_updated_at IS NULL OR production_updated_at < now() - interval '7 days');

CREATE OR REPLACE VIEW public.v_orders_no_followup WITH (security_invoker = on) AS
  SELECT * FROM public.orders
  WHERE status NOT IN ('picked_up','no_follow_up_needed')
    AND next_follow_up_date IS NULL
    AND (follow_up_reason IS NULL OR follow_up_reason <> 'no_follow_up_needed');

GRANT SELECT ON public.v_followups_due_today TO authenticated;
GRANT SELECT ON public.v_followups_overdue TO authenticated;
GRANT SELECT ON public.v_production_stale TO authenticated;
GRANT SELECT ON public.v_orders_no_followup TO authenticated;
