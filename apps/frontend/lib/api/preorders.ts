import { apiClient } from "./client";

export type PreorderStatus = "pending" | "stock_held" | "fulfilled" | "cancelled" | "refunded";

export interface MyPreorder {
  id: string;
  order_number: string;
  product_name: string;
  variant_title: string | null;
  quantity: number;
  unit_price: number;
  payment_method: string;
  payment_status: string;
  status: PreorderStatus;
  notified_at: string | null;
  notes: string | null;
  created_at: string;
  product_variants?: {
    option1_value: string | null;
    option2_value: string | null;
    option3_value: string | null;
    product_images?: { src: string }[];
  } | null;
}

export interface CreatePreorderInput {
  item: {
    variantId: string;
    productTitle: string;
    variantTitle?: string;
    quantity: number;
    price: number;
  };
  paymentReference: string;
  notes?: string;
}

export async function createPreorder(dto: CreatePreorderInput): Promise<MyPreorder> {
  return apiClient<MyPreorder>("/preorders", { method: "POST", body: dto });
}

export async function getMyPreorders(): Promise<MyPreorder[]> {
  return apiClient<MyPreorder[]>("/preorders/my");
}
