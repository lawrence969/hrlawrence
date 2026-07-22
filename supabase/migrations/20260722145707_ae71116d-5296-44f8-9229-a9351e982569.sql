-- 1) Drop broad SELECT policy on storage.objects for email-assets bucket.
-- Public buckets serve files via public URL without needing an RLS SELECT
-- policy; removing this policy prevents anonymous listing of bucket contents.
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;

-- 2) Restrict appointment_invitations policies to authenticated role only
-- so anonymous requests are rejected before policy evaluation.
DROP POLICY IF EXISTS "Customers see own invitations" ON public.appointment_invitations;
DROP POLICY IF EXISTS "Customers can respond to own invitations" ON public.appointment_invitations;
DROP POLICY IF EXISTS "Staff can manage invitations" ON public.appointment_invitations;

CREATE POLICY "Customers see own invitations"
ON public.appointment_invitations
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = appointment_invitations.order_id
    AND o.customer_profile_id = public.get_my_profile_id()
));

CREATE POLICY "Customers can respond to own invitations"
ON public.appointment_invitations
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = appointment_invitations.order_id
    AND o.customer_profile_id = public.get_my_profile_id()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = appointment_invitations.order_id
    AND o.customer_profile_id = public.get_my_profile_id()
));

CREATE POLICY "Staff can manage invitations"
ON public.appointment_invitations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));