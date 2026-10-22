GRANT INSERT ON public.profiles TO authenticated;
CREATE POLICY "Staff can create client profiles" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));