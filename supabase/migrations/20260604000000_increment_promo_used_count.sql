CREATE OR REPLACE FUNCTION increment_promo_used_count(promo_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE promo_codes
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = promo_id;
END;
$$;
