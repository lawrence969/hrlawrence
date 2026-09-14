ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS source_detail text;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_source_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_source_check CHECK (source IS NULL OR source IN ('social_media','referral','internet','ai','gold_party','walk_in','other'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check CHECK (order_type IN ('repair','custom','showroom','gold_purchase'));