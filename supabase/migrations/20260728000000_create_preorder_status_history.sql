-- Audit trail for pre-order status transitions (pending/stock_held/fulfilled/
-- cancelled/refunded). Pre-orders have no `orders` row (popup/walkin) or their
-- own history table today, so every status change — via restock allocation,
-- the per-line actions menu, or the group "Update Status" panel — is recorded
-- here, mirroring `order_status_history` for real orders.

CREATE TABLE preorder_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preorder_id  UUID NOT NULL REFERENCES preorders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  notes        TEXT,
  changed_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_preorder_status_history_order_number ON preorder_status_history(order_number);
CREATE INDEX idx_preorder_status_history_preorder_id ON preorder_status_history(preorder_id);

-- RLS: only admin roles can access this table directly
ALTER TABLE preorder_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin roles can read preorder_status_history"
  ON preorder_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admin roles can manage preorder_status_history"
  ON preorder_status_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

-- Grant table access to PostgREST roles
GRANT ALL ON TABLE preorder_status_history TO anon, authenticated, service_role;
