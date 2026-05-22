import { apiClient } from "./client";

export interface FavouriteProduct {
  id: string;
  product_id: string;
  created_at: string;
  products: {
    id: string;
    title: string;
    handle: string;
    base_price: number | null;
    product_images: { src: string; position: number; alt_text?: string | null }[];
  };
}

export async function getMyFavourites(): Promise<FavouriteProduct[]> {
  return apiClient<FavouriteProduct[]>("/favourites/my");
}

export async function addFavourite(productId: string): Promise<void> {
  return apiClient("/favourites", { method: "POST", body: { productId } });
}

export async function removeFavourite(productId: string): Promise<void> {
  return apiClient(`/favourites/${productId}`, { method: "DELETE" });
}
