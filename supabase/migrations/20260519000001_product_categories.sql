-- Add broad category column to products table.
-- category = one of: Tops, Bottoms, Accessories, Footwear
-- product_type is normalised to a clean set of subcategories in the same migration.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT;

-- Tops → T-Shirts
UPDATE public.products
SET product_type = 'T-Shirts', category = 'Tops'
WHERE LOWER(TRIM(product_type)) IN (
  't-shirt', 'tee', 'basic top', 'top', 'baby tee', 'long sleeve', 'jersey'
);

-- Tops → Shirts (Polo/Polo Tee treated as Shirts per spec)
UPDATE public.products
SET product_type = 'Shirts', category = 'Tops'
WHERE LOWER(TRIM(product_type)) IN ('shirt', 'polo', 'polo tee');

-- Tops → Sweatshirts & Tracksuits (Windbreaker included)
UPDATE public.products
SET product_type = 'Sweatshirts & Tracksuits', category = 'Tops'
WHERE LOWER(TRIM(product_type)) IN (
  'sweatshirt', 'hoodie', 'quarter zip', 'windbreaker', 'tracksuit'
);

-- Bottoms → Shorts
UPDATE public.products
SET product_type = 'Shorts', category = 'Bottoms'
WHERE LOWER(TRIM(product_type)) = 'shorts';

-- Bottoms → Pants (Sweatpants normalised to Pants)
UPDATE public.products
SET product_type = 'Pants', category = 'Bottoms'
WHERE LOWER(TRIM(product_type)) IN ('pants', 'sweatpants');

-- Accessories → Bags
UPDATE public.products
SET product_type = 'Bags', category = 'Accessories'
WHERE LOWER(TRIM(product_type)) IN ('bag', 'tote bag');

-- Accessories → Caps
UPDATE public.products
SET product_type = 'Caps', category = 'Accessories'
WHERE LOWER(TRIM(product_type)) = 'cap';

-- Accessories → Socks
UPDATE public.products
SET product_type = 'Socks', category = 'Accessories'
WHERE LOWER(TRIM(product_type)) = 'socks';

-- Footwear → Mules
UPDATE public.products
SET product_type = 'Mules', category = 'Footwear'
WHERE LOWER(TRIM(product_type)) = 'mules';

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category)
  WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_product_type_idx ON public.products (product_type)
  WHERE product_type IS NOT NULL;
