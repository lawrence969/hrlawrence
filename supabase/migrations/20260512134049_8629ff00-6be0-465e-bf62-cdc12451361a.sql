
-- ============ 1. client_number column + sequence + generator ============
CREATE SEQUENCE IF NOT EXISTS public.client_number_seq START 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_number TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_client_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.client_number IS NULL OR NEW.client_number = '' THEN
    NEW.client_number := 'CL-' || LPAD(nextval('public.client_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_client_number ON public.profiles;
CREATE TRIGGER trg_profiles_client_number
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.generate_client_number();

-- ============ 2. helper functions ============
CREATE OR REPLACE FUNCTION public.norm_name(_first text, _last text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(trim(coalesce(_first,''))) || '|' || lower(trim(coalesce(_last,'')))
$$;

CREATE OR REPLACE FUNCTION public.norm_phone(_p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(right(regexp_replace(coalesce(_p,''), '\D', '', 'g'), 10), '')
$$;

CREATE OR REPLACE FUNCTION public.email_domain(_e text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(split_part(coalesce(_e,''), '@', 2))
$$;

-- ============ 3. backfill numbers for existing profiles ============
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE client_number IS NULL ORDER BY created_at ASC, id ASC LOOP
    UPDATE public.profiles
    SET client_number = 'CL-' || LPAD(nextval('public.client_number_seq')::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- ============ 4. dedupe existing profiles ============
-- Build canonical mapping: for each profile, find the oldest profile that matches it.
CREATE OR REPLACE FUNCTION public._merge_profile(_dup uuid, _canonical uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF _dup = _canonical THEN RETURN; END IF;

  -- Repoint references
  UPDATE public.orders SET customer_profile_id = _canonical WHERE customer_profile_id = _dup;
  UPDATE public.appointments SET customer_profile_id = _canonical WHERE customer_profile_id = _dup;
  UPDATE public.finished_products SET customer_profile_id = _canonical WHERE customer_profile_id = _dup;

  -- Fill missing canonical fields from duplicate
  UPDATE public.profiles c
  SET phone = COALESCE(c.phone, d.phone),
      sms_consent = c.sms_consent OR d.sms_consent,
      first_name = CASE WHEN c.first_name IS NULL OR c.first_name = '' THEN d.first_name ELSE c.first_name END,
      last_name = CASE WHEN c.last_name IS NULL OR c.last_name = '' THEN d.last_name ELSE c.last_name END,
      user_id = COALESCE(c.user_id, d.user_id)
  FROM public.profiles d
  WHERE c.id = _canonical AND d.id = _dup;

  DELETE FROM public.profiles WHERE id = _dup;
END;
$$;

-- Run dedupe pass
DO $$
DECLARE
  r RECORD;
  canon_id uuid;
BEGIN
  -- Pass 1: by email
  FOR r IN
    SELECT id, lower(trim(email)) AS k
    FROM public.profiles
    WHERE email IS NOT NULL AND trim(email) <> ''
    ORDER BY created_at ASC, id ASC
  LOOP
    SELECT id INTO canon_id FROM public.profiles
    WHERE lower(trim(email)) = r.k
    ORDER BY created_at ASC, id ASC LIMIT 1;
    IF canon_id IS NOT NULL AND canon_id <> r.id THEN
      PERFORM public._merge_profile(r.id, canon_id);
    END IF;
  END LOOP;

  -- Pass 2: by normalized name + phone (last 10 digits)
  FOR r IN
    SELECT p.id,
           public.norm_name(p.first_name, p.last_name) AS nm,
           public.norm_phone(p.phone) AS ph
    FROM public.profiles p
    WHERE public.norm_phone(p.phone) IS NOT NULL
      AND public.norm_name(p.first_name, p.last_name) <> '|'
    ORDER BY created_at ASC, id ASC
  LOOP
    SELECT id INTO canon_id FROM public.profiles p2
    WHERE public.norm_name(p2.first_name, p2.last_name) = r.nm
      AND public.norm_phone(p2.phone) = r.ph
    ORDER BY created_at ASC, id ASC LIMIT 1;
    IF canon_id IS NOT NULL AND canon_id <> r.id THEN
      PERFORM public._merge_profile(r.id, canon_id);
    END IF;
  END LOOP;

  -- Pass 3: by name + email domain (only when both lack phone match opportunity)
  FOR r IN
    SELECT p.id,
           public.norm_name(p.first_name, p.last_name) AS nm,
           public.email_domain(p.email) AS dom
    FROM public.profiles p
    WHERE public.email_domain(p.email) <> ''
      AND public.norm_name(p.first_name, p.last_name) <> '|'
    ORDER BY created_at ASC, id ASC
  LOOP
    SELECT id INTO canon_id FROM public.profiles p2
    WHERE public.norm_name(p2.first_name, p2.last_name) = r.nm
      AND public.email_domain(p2.email) = r.dom
    ORDER BY created_at ASC, id ASC LIMIT 1;
    IF canon_id IS NOT NULL AND canon_id <> r.id THEN
      PERFORM public._merge_profile(r.id, canon_id);
    END IF;
  END LOOP;
END $$;

-- ============ 5. order intake trigger: find-or-create client ============
CREATE OR REPLACE FUNCTION public.link_order_to_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  found_id uuid;
  new_id uuid;
BEGIN
  IF NEW.customer_profile_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Match by email
  IF NEW.customer_email IS NOT NULL AND trim(NEW.customer_email) <> '' THEN
    SELECT id INTO found_id FROM public.profiles
    WHERE lower(trim(email)) = lower(trim(NEW.customer_email))
    ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- Match by name + phone
  IF found_id IS NULL
     AND NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL
     AND public.norm_phone(NEW.phone1) IS NOT NULL THEN
    SELECT id INTO found_id FROM public.profiles
    WHERE public.norm_name(first_name, last_name) = public.norm_name(NEW.first_name, NEW.last_name)
      AND public.norm_phone(phone) = public.norm_phone(NEW.phone1)
    ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- Create guest profile if no match
  IF found_id IS NULL THEN
    INSERT INTO public.profiles (first_name, last_name, email, phone, user_id)
    VALUES (
      COALESCE(NEW.first_name, ''),
      COALESCE(NEW.last_name, ''),
      NEW.customer_email,
      NEW.phone1,
      NULL
    )
    RETURNING id INTO new_id;
    found_id := new_id;
  END IF;

  NEW.customer_profile_id := found_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_link_client ON public.orders;
CREATE TRIGGER trg_orders_link_client
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.link_order_to_client();

-- ============ 6. backfill: link existing guest orders ============
DO $$
DECLARE
  o RECORD;
  found_id uuid;
  new_id uuid;
BEGIN
  FOR o IN SELECT * FROM public.orders WHERE customer_profile_id IS NULL LOOP
    found_id := NULL;
    IF o.customer_email IS NOT NULL AND trim(o.customer_email) <> '' THEN
      SELECT id INTO found_id FROM public.profiles
      WHERE lower(trim(email)) = lower(trim(o.customer_email))
      ORDER BY created_at ASC LIMIT 1;
    END IF;

    IF found_id IS NULL AND o.first_name IS NOT NULL AND o.last_name IS NOT NULL
       AND public.norm_phone(o.phone1) IS NOT NULL THEN
      SELECT id INTO found_id FROM public.profiles
      WHERE public.norm_name(first_name, last_name) = public.norm_name(o.first_name, o.last_name)
        AND public.norm_phone(phone) = public.norm_phone(o.phone1)
      ORDER BY created_at ASC LIMIT 1;
    END IF;

    IF found_id IS NULL THEN
      INSERT INTO public.profiles (first_name, last_name, email, phone, user_id)
      VALUES (
        COALESCE(o.first_name, ''),
        COALESCE(o.last_name, ''),
        o.customer_email,
        o.phone1,
        NULL
      )
      RETURNING id INTO new_id;
      found_id := new_id;
    END IF;

    UPDATE public.orders SET customer_profile_id = found_id WHERE id = o.id;
  END LOOP;
END $$;

-- ============ 7. update handle_new_user to merge by email ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_id uuid;
BEGIN
  -- Find existing guest profile by email
  SELECT id INTO existing_id FROM public.profiles
  WHERE lower(trim(email)) = lower(trim(NEW.email)) AND user_id IS NULL
  ORDER BY created_at ASC LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.profiles
    SET user_id = NEW.id,
        first_name = CASE WHEN first_name IS NULL OR first_name = ''
                          THEN COALESCE(NEW.raw_user_meta_data->>'first_name','') ELSE first_name END,
        last_name = CASE WHEN last_name IS NULL OR last_name = ''
                         THEN COALESCE(NEW.raw_user_meta_data->>'last_name','') ELSE last_name END
    WHERE id = existing_id;
  ELSE
    INSERT INTO public.profiles (user_id, first_name, last_name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      NEW.email
    );
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;

  -- Link any unlinked orders/appointments by email
  UPDATE public.orders
  SET customer_profile_id = (SELECT id FROM public.profiles WHERE user_id = NEW.id)
  WHERE customer_email = NEW.email AND customer_profile_id IS NULL;

  UPDATE public.appointments
  SET customer_profile_id = (SELECT id FROM public.profiles WHERE user_id = NEW.id)
  WHERE customer_email = NEW.email AND customer_profile_id IS NULL;

  RETURN NEW;
END;
$$;
