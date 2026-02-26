
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'customer');

-- User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'customer',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  sms_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  customer_profile_id UUID REFERENCES public.profiles(id),
  order_type TEXT NOT NULL CHECK (order_type IN ('repair', 'custom')),
  status TEXT NOT NULL DEFAULT 'intake',
  item_description TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order messages (for quote/design approval stage communication)
CREATE TABLE public.order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  customer_profile_id UUID REFERENCES public.profiles(id),
  order_id UUID REFERENCES public.orders(id),
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('consultation', 'repair_pickup', 'custom_pickup')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Order number sequence
CREATE SEQUENCE public.order_number_seq START 1;

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'HRL-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.order_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile + customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  -- Link any existing orders to this profile
  UPDATE public.orders
  SET customer_profile_id = (SELECT id FROM public.profiles WHERE user_id = NEW.id)
  WHERE customer_email = NEW.email AND customer_profile_id IS NULL;
  -- Link any existing appointments
  UPDATE public.appointments
  SET customer_profile_id = (SELECT id FROM public.profiles WHERE user_id = NEW.id)
  WHERE customer_email = NEW.email AND customer_profile_id IS NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Helper: get profile id for current user
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- RLS Policies

-- user_roles: only staff/admin can see, users can see own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Staff can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());

-- orders
CREATE POLICY "Customers see own orders" ON public.orders FOR SELECT USING (
  customer_profile_id = public.get_my_profile_id()
);
CREATE POLICY "Staff see all orders" ON public.orders FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);
CREATE POLICY "Staff can create orders" ON public.orders FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);
CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);
CREATE POLICY "Staff can delete orders" ON public.orders FOR DELETE USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);

-- order_messages
CREATE POLICY "Customers see own order messages" ON public.order_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.customer_profile_id = public.get_my_profile_id())
);
CREATE POLICY "Staff see all messages" ON public.order_messages FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);
CREATE POLICY "Customers can send messages on own orders" ON public.order_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.customer_profile_id = public.get_my_profile_id())
);
CREATE POLICY "Staff can send messages" ON public.order_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
);
CREATE POLICY "Staff can update messages" ON public.order_messages FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);

-- appointments
CREATE POLICY "Customers see own appointments" ON public.appointments FOR SELECT USING (
  customer_profile_id = public.get_my_profile_id()
);
CREATE POLICY "Staff see all appointments" ON public.appointments FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);
CREATE POLICY "Anyone can create consultation appointments" ON public.appointments FOR INSERT WITH CHECK (
  appointment_type = 'consultation'
);
CREATE POLICY "Authenticated users can create pickup appointments" ON public.appointments FOR INSERT WITH CHECK (
  appointment_type IN ('repair_pickup', 'custom_pickup') AND customer_profile_id = public.get_my_profile_id()
);
CREATE POLICY "Staff can create any appointment" ON public.appointments FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);
CREATE POLICY "Customers can update own appointments" ON public.appointments FOR UPDATE USING (
  customer_profile_id = public.get_my_profile_id()
);
CREATE POLICY "Staff can update any appointment" ON public.appointments FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);
CREATE POLICY "Staff can delete appointments" ON public.appointments FOR DELETE USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);

-- Enable realtime for orders and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
