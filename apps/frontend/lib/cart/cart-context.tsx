"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import { track } from "@/lib/analytics/tracker";

// --- Types ---

export interface CartItem {
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string | null;
  price: number;
  image: string | null;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  hydrated: boolean;
}

type CartAction =
  | { type: "ADD"; item: Omit<CartItem, "quantity">; quantity?: number }
  | { type: "REMOVE"; variantId: string }
  | { type: "UPDATE_QTY"; variantId: string; quantity: number }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; items: CartItem[] }
  | { type: "SYNC"; items: CartItem[] };

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
}

// --- Storage ---

const STORAGE_KEY = "iris_cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full or unavailable
  }
}

// --- Reducer ---

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE": {
      // Hydration is deferred to an effect (to avoid SSR/client mismatches),
      // so it's possible for an ADD to land in memory before this fires. Merge
      // rather than replace, or that optimistic add gets silently discarded —
      // which surfaces as the same variant "re-appearing" as a separate line
      // the next time it's added, since the merge it should have had never happened.
      if (state.hydrated) return state;
      const merged = [...action.items];
      for (const item of state.items) {
        const idx = merged.findIndex((i) => i.variantId === item.variantId);
        if (idx >= 0) {
          merged[idx] = {
            ...merged[idx],
            quantity: merged[idx].quantity + item.quantity,
          };
        } else {
          merged.push(item);
        }
      }
      return { items: merged, hydrated: true };
    }

    // Another tab/window persisted a change — adopt it as-is, since it was
    // already merged through this same reducer in that tab.
    case "SYNC":
      return { ...state, items: action.items, hydrated: true };

    case "ADD": {
      const existing = state.items.find(
        (i) => i.variantId === action.item.variantId,
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.variantId === action.item.variantId
              ? { ...i, quantity: i.quantity + (action.quantity ?? 1) }
              : i,
          ),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          { ...action.item, quantity: action.quantity ?? 1 },
        ],
      };
    }

    case "REMOVE":
      return {
        ...state,
        items: state.items.filter((i) => i.variantId !== action.variantId),
      };

    case "UPDATE_QTY": {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.variantId !== action.variantId),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.variantId === action.variantId
            ? { ...i, quantity: action.quantity }
            : i,
        ),
      };
    }

    case "CLEAR":
      return { ...state, items: [] };

    default:
      return state;
  }
}

// --- Context ---

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    hydrated: false,
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    dispatch({ type: "HYDRATE", items: loadCart() });
  }, []);

  // Re-hydrate when another tab/window writes a newer cart, so a stale
  // in-memory copy here doesn't overwrite it on the next save.
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        dispatch({ type: "SYNC", items: loadCart() });
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Persist on every change (after hydration)
  useEffect(() => {
    if (state.hydrated) {
      saveCart(state.items);
    }
  }, [state.items, state.hydrated]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity?: number) => {
      dispatch({ type: "ADD", item, quantity });
      track("add_to_cart", {
        productId: item.productId,
        value: item.price * (quantity ?? 1),
      });
    },
    [],
  );

  const removeItem = useCallback((variantId: string) => {
    dispatch({ type: "REMOVE", variantId });
  }, []);

  const updateQuantity = useCallback(
    (variantId: string, quantity: number) => {
      dispatch({ type: "UPDATE_QTY", variantId, quantity });
    },
    [],
  );

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        itemCount,
        subtotal,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
