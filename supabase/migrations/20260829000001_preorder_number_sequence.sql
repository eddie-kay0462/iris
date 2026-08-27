-- Pre-order numbers were allocated by reading the newest row and adding one.
-- That is a read-then-increment race: two pre-orders started in the same moment
-- both read PRE-001022 and both return PRE-001023.
--
-- Until now the UNIQUE constraint on preorders.order_number caught that — the
-- loser got a unique violation and failed. That constraint has just been
-- dropped (20260829000000), because a pre-order is legitimately several rows
-- sharing one number. So nothing is left to catch the collision, and two
-- unrelated carts would silently merge into one apparent order.
--
-- Replace the read-then-increment with a real sequence, allocated through a
-- function so the "floor at the configured start number" rule still applies.

CREATE SEQUENCE IF NOT EXISTS public.preorder_number_seq AS BIGINT START WITH 1;

-- Seed past every number already issued so the first allocation continues the
-- series rather than colliding with history. is_called = true means the next
-- nextval() returns max + 1.
SELECT setval(
  'public.preorder_number_seq',
  GREATEST(
    COALESCE(
      (SELECT MAX((substring(order_number FROM '^PRE-([0-9]+)$'))::BIGINT)
       FROM public.preorders
       WHERE order_number ~ '^PRE-[0-9]+$'),
      0
    ),
    1
  ),
  true
);

/**
 * Allocate the next pre-order number.
 *
 * `min_sequence` carries the admin-configurable start number (settings key
 * `preorder_number_start`), which used to be applied in JS with Math.max. If
 * an admin raises it, the series jumps forward to meet it.
 */
CREATE OR REPLACE FUNCTION public.next_preorder_number(min_sequence BIGINT DEFAULT 1)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n BIGINT;
BEGIN
  -- nextval alone is atomic, but the floor below is read-modify-write: without
  -- this lock two callers sitting under a freshly-raised start number could
  -- both setval to it and both return the same number. Transaction-scoped, so
  -- it releases when this call commits.
  PERFORM pg_advisory_xact_lock(hashtext('public.preorder_number_seq'));

  v_n := nextval('public.preorder_number_seq');

  IF v_n < min_sequence THEN
    PERFORM setval('public.preorder_number_seq', min_sequence, true);
    v_n := min_sequence;
  END IF;

  RETURN 'PRE-' || lpad(v_n::TEXT, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_preorder_number(BIGINT) TO service_role;

COMMENT ON FUNCTION public.next_preorder_number(BIGINT) IS
  'Allocates the next PRE-###### number atomically. The only sanctioned way to mint a pre-order number.';
