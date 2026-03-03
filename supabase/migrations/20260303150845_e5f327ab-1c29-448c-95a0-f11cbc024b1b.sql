
-- Add department tracking to orders
ALTER TABLE public.orders
ADD COLUMN current_department text NOT NULL DEFAULT 'front_of_store';

-- Create quotes table
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, declined
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage quotes" ON public.quotes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Customers see own order quotes" ON public.quotes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = quotes.order_id AND orders.customer_profile_id = get_my_profile_id())
  );

CREATE POLICY "Customers can update own quotes" ON public.quotes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = quotes.order_id AND orders.customer_profile_id = get_my_profile_id())
  );

-- Create appointment invitations table
CREATE TABLE public.appointment_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  invitation_type text NOT NULL, -- 'review' or 'pickup'
  message text,
  status text NOT NULL DEFAULT 'pending', -- pending, booked, expired
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage invitations" ON public.appointment_invitations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Customers see own invitations" ON public.appointment_invitations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = appointment_invitations.order_id AND orders.customer_profile_id = get_my_profile_id())
  );

-- Enable realtime for quotes
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_invitations;
