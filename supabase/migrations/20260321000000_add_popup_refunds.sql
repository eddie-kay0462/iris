-- Add refunded status to popup orders and create refunds tracking table

-- 1. Extend the popup_order_status enum with 'refunded'
ALTER TYPE popup_order_status ADD VALUE IF NOT EXISTS 'refunded';

-- 2. Create popup_refunds table
CREATE TABLE IF NOT EXISTS popup_refunds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES popup_orders(id) ON DELETE CASCADE,
  amount              NUMERIC(10, 2) NOT NULL,
  reason              TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processed', 'failed')),
  initiated_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  paystack_refund_id  TEXT,
  paystack_response   JSONB,
  sms_sent            BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RLS
ALTER TABLE popup_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read popup_refunds"
  ON popup_refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Managers can manage popup_refunds"
  ON popup_refunds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

GRANT ALL ON TABLE popup_refunds TO anon, authenticated, service_role;
