-- Add guest_token to orders for secure guest order lookup without authentication.
-- Generated when user_id IS NULL (guest order); used by the /orders/guest/:number?token= endpoint.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_token UUID DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_guest_token ON public.orders (guest_token)
  WHERE guest_token IS NOT NULL;
