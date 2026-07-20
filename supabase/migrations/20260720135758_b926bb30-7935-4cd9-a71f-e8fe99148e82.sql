
-- Tighten public consultation appointment insert policy
DROP POLICY IF EXISTS "Anyone can create consultation appointments" ON public.appointments;
CREATE POLICY "Anyone can create consultation appointments"
ON public.appointments
FOR INSERT
WITH CHECK (
  appointment_type = 'consultation'
  AND customer_profile_id IS NULL
  AND order_id IS NULL
  AND first_name IS NOT NULL AND length(trim(first_name)) BETWEEN 1 AND 100
  AND last_name IS NOT NULL AND length(trim(last_name)) BETWEEN 1 AND 100
  AND customer_email IS NOT NULL AND customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(customer_email) <= 254
  AND (phone IS NULL OR length(phone) <= 32)
);

-- Storage.objects: add explicit RLS policies (RLS is already enabled by Supabase on storage.objects)
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;
CREATE POLICY "Public read email-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets');

DROP POLICY IF EXISTS "Staff manage email-assets insert" ON storage.objects;
CREATE POLICY "Staff manage email-assets insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'email-assets'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
);

DROP POLICY IF EXISTS "Staff manage email-assets update" ON storage.objects;
CREATE POLICY "Staff manage email-assets update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'email-assets'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
)
WITH CHECK (
  bucket_id = 'email-assets'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
);

DROP POLICY IF EXISTS "Staff manage email-assets delete" ON storage.objects;
CREATE POLICY "Staff manage email-assets delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'email-assets'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
);
