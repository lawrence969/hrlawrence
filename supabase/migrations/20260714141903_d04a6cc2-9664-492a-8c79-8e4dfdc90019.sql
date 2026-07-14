
-- Set search_path on functions missing it
ALTER FUNCTION public._merge_profile(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.email_domain(text) SET search_path = public;
ALTER FUNCTION public.norm_name(text, text) SET search_path = public;
ALTER FUNCTION public.norm_phone(text) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- Revoke public execute on SECURITY DEFINER functions that should not be callable by anon/authenticated
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_order_to_client() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._merge_profile(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_client_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;

-- Storage: prevent listing the email-assets public bucket
-- Public bucket URLs still resolve for direct file access; only enumeration via storage.objects SELECT is removed.
DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;

-- Fix pickup appointment insert: require the referenced order to belong to the caller
DROP POLICY IF EXISTS "Authenticated users can create pickup appointments" ON public.appointments;
CREATE POLICY "Authenticated users can create pickup appointments"
ON public.appointments
FOR INSERT
WITH CHECK (
  appointment_type = ANY (ARRAY['repair_pickup'::text, 'custom_pickup'::text])
  AND customer_profile_id = get_my_profile_id()
  AND order_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = appointments.order_id
      AND o.customer_profile_id = get_my_profile_id()
  )
);

-- Appointment invitations: add explicit customer UPDATE policy scoped to their own orders,
-- so customers can only respond (change status) on invitations tied to orders they own.
CREATE POLICY "Customers can respond to own invitations"
ON public.appointment_invitations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = appointment_invitations.order_id
      AND o.customer_profile_id = get_my_profile_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = appointment_invitations.order_id
      AND o.customer_profile_id = get_my_profile_id()
  )
);
