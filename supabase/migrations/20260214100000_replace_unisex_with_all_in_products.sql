-- Migration: Replace unisex with all in products.gender
-- Updates the products_gender_check constraint and migrates existing unisex products to all.

-- Update existing products with gender 'unisex' to 'all'
UPDATE public.products SET gender = 'all' WHERE gender = 'unisex';

-- Drop the old constraint (if it exists)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_gender_check;

-- Add new constraint with men, women, all
ALTER TABLE public.products ADD CONSTRAINT products_gender_check
  CHECK (gender IS NULL OR gender = ANY (ARRAY['men'::text, 'women'::text, 'all'::text]));
