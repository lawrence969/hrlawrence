
ALTER TABLE public.orders
ADD COLUMN order_date date DEFAULT CURRENT_DATE,
ADD COLUMN first_name text,
ADD COLUMN last_name text,
ADD COLUMN address text,
ADD COLUMN phone1 text,
ADD COLUMN phone2 text,
ADD COLUMN rhodium_polish boolean DEFAULT false,
ADD COLUMN stone_type text,
ADD COLUMN stone_size text,
ADD COLUMN ring_size text,
ADD COLUMN metal text,
ADD COLUMN metal_type text,
ADD COLUMN colour text,
ADD COLUMN budget numeric,
ADD COLUMN deposit numeric,
ADD COLUMN delivery_date date;
