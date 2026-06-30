"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface FavouritesDrawerValue {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const FavouritesDrawerContext = createContext<FavouritesDrawerValue | null>(null);

export function FavouritesDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  return (
    <FavouritesDrawerContext.Provider value={{ open, openDrawer, closeDrawer }}>
      {children}
    </FavouritesDrawerContext.Provider>
  );
}

export function useFavouritesDrawer() {
  const ctx = useContext(FavouritesDrawerContext);
  if (!ctx) {
    throw new Error("useFavouritesDrawer must be used within a FavouritesDrawerProvider");
  }
  return ctx;
}
