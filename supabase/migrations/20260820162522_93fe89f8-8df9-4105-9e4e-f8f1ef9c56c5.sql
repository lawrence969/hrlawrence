CREATE OR REPLACE FUNCTION public.is_placeholder_email(_e text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT lower(btrim(coalesce(_e,''))) IN (
    '', 'no@email.com', 'none@email.com', 'noemail@email.com', 'n/a', 'na',
    'none', 'no', 'noemail', 'no-email', 'no@email', 'email@email.com',
    'test@test.com', 'x@x.com'
  )
$$;

CREATE OR REPLACE FUNCTION public.link_order_to_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  found_id uuid;
  new_id uuid;
BEGIN
  IF NEW.customer_profile_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Match by email (skip placeholder emails)
  IF NEW.customer_email IS NOT NULL AND NOT public.is_placeholder_email(NEW.customer_email) THEN
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
$function$;

REVOKE EXECUTE ON FUNCTION public.is_placeholder_email(text) FROM anon;