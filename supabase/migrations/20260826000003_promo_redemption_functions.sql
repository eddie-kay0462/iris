-- Reserve / confirm / revert: the only sanctioned way to move promo_codes.used_count.
--
-- These replace increment_promo_used_count, which had three holes: it ran only
-- after payment (so two concurrent checkouts could both pass a max_uses=1
-- check), it was fire-and-forget (a failed RPC silently lost the count), and
-- nothing ever gave a use back when an order was cancelled or refunded.
--
-- The fix is to take the usage seat at ORDER CREATION under a row lock, then
-- either confirm it on payment or hand it back on cancellation.

-- Reserve a usage seat and write the ledger row. Raises if the code is exhausted.
CREATE OR REPLACE FUNCTION public.promo_reserve_redemption(payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo_id   UUID := NULLIF(payload->>'promo_code_id', '')::UUID;
  v_max_uses   INTEGER;
  v_used_count INTEGER;
  v_ledger     INTEGER;
  v_taken      INTEGER;
  v_id         UUID;
BEGIN
  IF v_promo_id IS NOT NULL THEN
    -- Serialises concurrent checkouts on the same code.
    SELECT max_uses, used_count INTO v_max_uses, v_used_count
    FROM promo_codes WHERE id = v_promo_id FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Promo code no longer exists' USING ERRCODE = 'P0002';
    END IF;

    IF v_max_uses IS NOT NULL THEN
      SELECT COUNT(*) INTO v_ledger
      FROM promo_redemptions
      WHERE promo_code_id = v_promo_id AND status IN ('pending', 'confirmed');

      -- used_count carries redemptions from before this ledger existed, so the
      -- seats taken is whichever record is further along, plus anything held
      -- pending that the counter has not caught up with yet.
      v_taken := GREATEST(COALESCE(v_used_count, 0), v_ledger);

      IF v_taken >= v_max_uses THEN
        RAISE EXCEPTION 'This promo code has reached its usage limit'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  INSERT INTO promo_redemptions (
    promo_code_id, source, channel, order_table, order_id, order_number,
    code_snapshot, discount_type, rule_snapshot, breakdown,
    subtotal, discount_amount,
    customer_email, customer_phone, customer_profile_id, applied_by, status
  ) VALUES (
    v_promo_id,
    payload->>'source',
    payload->>'channel',
    payload->>'order_table',
    (payload->>'order_id')::UUID,
    NULLIF(payload->>'order_number', ''),
    NULLIF(payload->>'code_snapshot', ''),
    NULLIF(payload->>'discount_type', ''),
    payload->'rule_snapshot',
    payload->'breakdown',
    COALESCE((payload->>'subtotal')::NUMERIC, 0),
    COALESCE((payload->>'discount_amount')::NUMERIC, 0),
    NULLIF(payload->>'customer_email', ''),
    NULLIF(payload->>'customer_phone', ''),
    NULLIF(payload->>'customer_profile_id', '')::UUID,
    NULLIF(payload->>'applied_by', '')::UUID,
    COALESCE(NULLIF(payload->>'status', ''), 'pending')
  )
  RETURNING id INTO v_id;

  -- A row created straight to 'confirmed' (cash sale — money already in hand)
  -- still has to pay for its seat.
  IF (payload->>'status') = 'confirmed' THEN
    UPDATE promo_redemptions SET confirmed_at = NOW() WHERE id = v_id;
    IF v_promo_id IS NOT NULL THEN
      UPDATE promo_codes
      SET used_count = used_count + 1, updated_at = NOW()
      WHERE id = v_promo_id;
    END IF;
  END IF;

  RETURN v_id;
END;
$$;

-- Confirm a reserved seat. Idempotent: re-confirming does nothing.
CREATE OR REPLACE FUNCTION public.promo_confirm_redemption(redemption_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo_id UUID;
  v_status   TEXT;
BEGIN
  SELECT promo_code_id, status INTO v_promo_id, v_status
  FROM promo_redemptions WHERE id = redemption_id FOR UPDATE;

  IF NOT FOUND OR v_status <> 'pending' THEN
    RETURN;
  END IF;

  UPDATE promo_redemptions
  SET status = 'confirmed', confirmed_at = NOW()
  WHERE id = redemption_id;

  IF v_promo_id IS NOT NULL THEN
    UPDATE promo_codes
    SET used_count = used_count + 1, updated_at = NOW()
    WHERE id = v_promo_id;
  END IF;
END;
$$;

-- Hand a seat back on cancellation, refund, or a re-priced order.
CREATE OR REPLACE FUNCTION public.promo_revert_redemption(redemption_id UUID, reason TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo_id UUID;
  v_status   TEXT;
BEGIN
  SELECT promo_code_id, status INTO v_promo_id, v_status
  FROM promo_redemptions WHERE id = redemption_id FOR UPDATE;

  IF NOT FOUND OR v_status = 'reverted' THEN
    RETURN;
  END IF;

  UPDATE promo_redemptions
  SET status = 'reverted', reverted_at = NOW(), revert_reason = reason
  WHERE id = redemption_id;

  -- Only a confirmed seat ever incremented the counter.
  IF v_status = 'confirmed' AND v_promo_id IS NOT NULL THEN
    UPDATE promo_codes
    SET used_count = GREATEST(0, used_count - 1), updated_at = NOW()
    WHERE id = v_promo_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promo_reserve_redemption(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.promo_confirm_redemption(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.promo_revert_redemption(UUID, TEXT) TO service_role;

-- increment_promo_used_count stays for one release so a half-rolled deploy
-- (new SQL, old container) does not start throwing. Nothing new calls it.
COMMENT ON FUNCTION public.increment_promo_used_count(UUID) IS
  'DEPRECATED — superseded by promo_confirm_redemption. Safe to drop once all instances run the ledger-aware backend.';
