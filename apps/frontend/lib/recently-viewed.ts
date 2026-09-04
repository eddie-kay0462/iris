import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Product } from "@/lib/api/products";

const KEY = "iris_recently_viewed";
const MAX = 8;

/** Stable empty result, so the server snapshot never changes identity. */
const EMPTY: Product[] = [];

function readFromStorage(): Product[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Product[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeToStorage(products: Product[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(products));
  } catch {
    // storage may be full or blocked
  }
}

// `useSyncExternalStore` re-reads on every render and bails out only when the
// snapshot is referentially equal, so the parsed list has to be cached rather
// than re-parsed each call — otherwise every render would look like a change.
let snapshot: Product[] | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Product[] {
  if (snapshot === null) snapshot = readFromStorage();
  return snapshot;
}

function getServerSnapshot(): Product[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Drop the cached snapshot and wake every hook reading this store. */
function invalidate() {
  snapshot = null;
  for (const listener of listeners) listener();
}

export function addRecentlyViewed(product: Product) {
  const existing = readFromStorage().filter((p) => p.id !== product.id);
  writeToStorage([product, ...existing].slice(0, MAX));
  invalidate();
}

export function useRecentlyViewed(excludeId?: string) {
  // Read through the store rather than an effect: localStorage isn't available
  // during the server render, and `getServerSnapshot` lets React reconcile that
  // without a state update on mount.
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const items = useMemo(
    () => (excludeId ? all.filter((p) => p.id !== excludeId) : all),
    [all, excludeId],
  );
  const refresh = useCallback(() => invalidate(), []);

  return { items, refresh };
}
