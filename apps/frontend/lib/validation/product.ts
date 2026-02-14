import { z } from "zod";

export const variantSchema = z.object({
  option1_name: z.string().optional(),
  option1_value: z.string().optional(),
  option2_name: z.string().optional(),
  option2_value: z.string().optional(),
  option3_name: z.string().optional(),
  option3_value: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive").optional(),
  compare_at_price: z.coerce.number().min(0).optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  inventory_quantity: z.coerce
    .number()
    .int()
    .min(0, "Quantity must be non-negative")
    .optional(),
  weight: z.coerce.number().min(0).optional(),
  weight_unit: z.string().optional(),
});

export const productSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  handle: z.string().optional(),
  base_price: z.coerce.number().min(0, "Price must be positive").optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  gender: z.enum(["men", "women", "all"]).optional(),
  product_type: z.string().optional(),
  vendor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
});

export const stockAdjustmentSchema = z.object({
  variant_id: z.string().min(1, "Variant is required"),
  quantity_change: z.coerce.number().int("Must be a whole number"),
  movement_type: z.enum([
    "adjustment",
    "sale",
    "return",
    "restock",
    "damaged",
    "transfer",
    "preorder",
  ]),
  notes: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type VariantFormValues = z.infer<typeof variantSchema>;
export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>;
