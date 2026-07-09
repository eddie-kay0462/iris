-- Records the payment processing fee (1.95%) charged on top of the order amount.
-- The stored `total` is fee-inclusive so it matches what Paystack actually collected;
-- `processing_fee` keeps the breakdown reconstructable (subtotal - discount + shipping + processing_fee = total).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS processing_fee numeric(10,2) DEFAULT 0;
