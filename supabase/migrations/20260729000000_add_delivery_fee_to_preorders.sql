-- Optional delivery fee for popup/walkin pre-orders (out-of-stock items sold
-- in person, delivered once restocked). Stored redundantly on every line row
-- sharing an order_number (same convention as customer_name/customer_phone)
-- since pre-orders have no group-level row; readers use the first row's value.

ALTER TABLE preorders ADD COLUMN delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0;
