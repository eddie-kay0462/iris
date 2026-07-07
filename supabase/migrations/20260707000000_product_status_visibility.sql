-- Retire the legacy products.published boolean and make products.status the
-- single source of truth for storefront visibility.
--
--   active   = live on the site (what published = true used to mean)
--   draft    = default for new products; hidden and non-purchasable
--   archived = discontinued; hidden and non-purchasable
--
-- This migration preserves current visibility (backfills status from published),
-- flips the default to 'draft', repoints RLS + helper functions to status,
-- then drops the published column.

-- 1. Backfill status from published so nothing that is hidden today suddenly
--    appears, and nothing visible today disappears. Intentional draft/archived
--    values are preserved.
UPDATE "public"."products"
   SET "status" = 'draft'
 WHERE "published" = false
   AND "status" <> 'archived';

UPDATE "public"."products"
   SET "status" = 'active'
 WHERE "published" = true
   AND "status" NOT IN ('draft', 'archived');

-- 2. New products should default to draft.
ALTER TABLE "public"."products" ALTER COLUMN "status" SET DEFAULT 'draft';

-- 3. Repoint RLS policies from published = true to status = 'active'.
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON "public"."products";
CREATE POLICY "Public products are viewable by everyone"
  ON "public"."products"
  FOR SELECT
  USING (("status" = 'active'));

DROP POLICY IF EXISTS "Public images are viewable by everyone" ON "public"."product_images";
CREATE POLICY "Public images are viewable by everyone"
  ON "public"."product_images"
  FOR SELECT
  USING ((EXISTS ( SELECT 1
     FROM "public"."products"
    WHERE (("products"."id" = "product_images"."product_id") AND ("products"."status" = 'active')))));

DROP POLICY IF EXISTS "Public variants are viewable by everyone" ON "public"."product_variants";
CREATE POLICY "Public variants are viewable by everyone"
  ON "public"."product_variants"
  FOR SELECT
  USING ((EXISTS ( SELECT 1
     FROM "public"."products"
    WHERE (("products"."id" = "product_variants"."product_id") AND ("products"."status" = 'active')))));

-- 4. Repoint helper functions that filter by published.
CREATE OR REPLACE FUNCTION "public"."get_drop_products"("drop_handle" "text")
  RETURNS TABLE("id" "uuid", "handle" "text", "title" "text", "base_price" numeric, "sort_order" integer)
  LANGUAGE "plpgsql"
  AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.handle, p.title, p.base_price, dp.sort_order
  FROM products p
  JOIN drop_products dp ON dp.product_id = p.id
  JOIN drops d ON d.id = dp.drop_id
  WHERE d.handle = drop_handle
    AND d.is_active = true
    AND p.status = 'active'
    AND p.deleted_at IS NULL
  ORDER BY dp.sort_order, p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_products_by_gender"("target_gender" "text")
  RETURNS TABLE("id" "uuid", "handle" "text", "title" "text", "base_price" numeric, "gender" "text", "product_type" "text")
  LANGUAGE "plpgsql"
  AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.handle, p.title, p.base_price, p.gender, p.product_type
  FROM products p
  WHERE p.gender = target_gender
    AND p.status = 'active'
    AND p.deleted_at IS NULL
  ORDER BY p.created_at DESC;
END;
$$;

-- 5. Drop the legacy column and its index.
DROP INDEX IF EXISTS "public"."idx_products_published";
ALTER TABLE "public"."products" DROP COLUMN IF EXISTS "published";
