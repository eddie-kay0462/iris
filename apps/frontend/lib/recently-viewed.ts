import { useState, useEffect, useCallback } from "react";
import type { Product } from "@/lib/api/products";

const KEY = "iris_recently_viewed";
const MAX = 8;

function readFromStorage(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Product[]) : [];
  } catch {
    return [];
  }
}

function writeToStorage(products: Product[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(products));
  } catch {
    // storage may be full or blocked
  }
}

export function addRecentlyViewed(product: Product) {
  const existing = readFromStorage().filter((p) => p.id !== product.id);
  writeToStorage([product, ...existing].slice(0, MAX));
}

export function useRecentlyViewed(excludeId?: string) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    const all = readFromStorage();
    setItems(excludeId ? all.filter((p) => p.id !== excludeId) : all);
  }, [excludeId]);

  const refresh = useCallback((excludeId?: string) => {
    const all = readFromStorage();
    setItems(excludeId ? all.filter((p) => p.id !== excludeId) : all);
  }, []);

  return { items, refresh };
}
