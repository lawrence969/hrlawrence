CREATE TABLE public.finished_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  customer_profile_id uuid,
  order_id uuid,
  product_type text NOT NULL,
  product_type_other text,
  metal_type text NOT NULL,
  metal_color text NOT NULL,
  metal_color_other text,
  weight text,
  stone_type text,
  gem_sku text,
  cost numeric,
  client_cost numeric,
  notes text
);

ALTER TABLE public.finished_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage finished products"
  ON public.finished_products FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Customers see own finished products"
  ON public.finished_products FOR SELECT
  USING (customer_profile_id = get_my_profile_id());

CREATE TRIGGER finished_products_updated_at
  BEFORE UPDATE ON public.finished_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();