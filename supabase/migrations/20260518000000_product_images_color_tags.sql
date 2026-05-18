-- Add color_tags to product_images so an image can belong to multiple colour
-- variants. An empty array means "show for all colours" (shared / lifestyle).
-- option1_value is kept for backwards compatibility but the gallery now reads
-- color_tags instead.

ALTER TABLE "public"."product_images"
  ADD COLUMN IF NOT EXISTS "color_tags" TEXT[] NOT NULL DEFAULT '{}';

-- Seed color_tags from existing option1_value data so nothing breaks on deploy.
UPDATE "public"."product_images"
  SET "color_tags" = ARRAY[option1_value]
  WHERE option1_value IS NOT NULL
    AND array_length(color_tags, 1) IS NULL;

CREATE INDEX IF NOT EXISTS "idx_product_images_color_tags"
  ON "public"."product_images" USING GIN ("color_tags");
