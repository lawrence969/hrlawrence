
-- Allow order_number to have a default so inserts don't require it
ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT '';
