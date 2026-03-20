-- Migration to add image_id to product_variants

ALTER TABLE "public"."product_variants" 
ADD COLUMN "image_id" UUID REFERENCES "public"."product_images"("id") ON DELETE SET NULL;

-- Optional: Create an index for faster lookups if you frequently query variants by image
CREATE INDEX IF NOT EXISTS "idx_product_variants_image_id" ON "public"."product_variants"("image_id");
