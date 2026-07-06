-- Scope variant SKU uniqueness to the owning product.
--
-- Previously `product_variants.sku` had a GLOBAL unique constraint
-- (`product_variants_sku_key`). Combined with the admin's deterministic
-- auto-SKU generator (title-initials + colour + size), two different products
-- with the same initials reusing the same colour produced identical SKUs
-- (e.g. `SP-MUS`), and the second insert was rejected store-wide. To the
-- merchant this looked like an arbitrary cap on the number of variants.
--
-- We now enforce uniqueness per product instead, which still prevents genuine
-- duplicates within a single product while allowing the same SKU to appear on
-- different products. The partial predicate keeps multiple blank (NULL) SKUs
-- allowed, matching the previous behaviour.

ALTER TABLE "public"."product_variants"
  DROP CONSTRAINT IF EXISTS "product_variants_sku_key";

CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_product_sku_key"
  ON "public"."product_variants" ("product_id", "sku")
  WHERE ("sku" IS NOT NULL);
