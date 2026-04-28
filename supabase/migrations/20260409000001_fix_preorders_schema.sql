-- Drop and recreate preorders tables with the correct full schema.
-- Safe to run: tables were created by a partial earlier migration and contain no real data.

DROP TABLE IF EXISTS preorder_refunds CASCADE;
DROP TABLE IF EXISTS preorders        CASCADE;

-- Drop stale indexes (may already be gone after DROP TABLE, but be safe)
DROP INDEX IF EXISTS idx_preorders_variant;
DROP INDEX IF EXISTS idx_preorders_status;
DROP INDEX IF EXISTS idx_preorders_user;

-- Re-create with correct schema
CREATE TABLE preorders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      text NOT NULL UNIQUE,
  source            text NOT NULL DEFAULT 'online'
    CHECK (source IN ('online', 'popup')),
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name     text,
  customer_email    text,
  customer_phone    text,
  variant_id        uuid NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  product_name      text NOT NULL,
  variant_title     text,
  quantity          integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price        numeric(12,2) NOT NULL,
  payment_method    text NOT NULL DEFAULT 'pending'
    CHECK (payment_method IN ('paystack', 'cash', 'momo', 'bank_transfer', 'pending')),
  payment_reference text,
  payment_status    text NOT NULL DEFAULT 'awaiting'
    CHECK (payment_status IN ('awaiting', 'paid', 'refunded')),
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'stock_held', 'fulfilled', 'cancelled', 'refunded')),
  priority          integer,
  notified_at       timestamptz,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE preorder_refunds (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preorder_id         uuid NOT NULL REFERENCES preorders(id) ON DELETE CASCADE,
  amount              numeric(12,2) NOT NULL,
  reason              text,
  status              text NOT NULL DEFAULT 'processed',
  initiated_by        uuid REFERENCES auth.users(id),
  paystack_refund_id  text,
  paystack_response   jsonb,
  sms_sent            boolean NOT NULL DEFAULT false,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_preorders_variant ON preorders(variant_id);
CREATE INDEX idx_preorders_status  ON preorders(status);
CREATE INDEX idx_preorders_user    ON preorders(user_id);

-- RLS
ALTER TABLE preorders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE preorder_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_see_own_preorders" ON preorders;
CREATE POLICY "users_see_own_preorders" ON preorders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT ALL   ON preorders        TO service_role;
GRANT ALL   ON preorder_refunds TO service_role;
GRANT SELECT ON preorders       TO authenticated;
