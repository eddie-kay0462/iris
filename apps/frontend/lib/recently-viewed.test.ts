import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Product } from "@/lib/api/products";

type Mod = typeof import("./recently-viewed");
let addRecentlyViewed: Mod["addRecentlyViewed"];
let useRecentlyViewed: Mod["useRecentlyViewed"];

function product(id: string): Product {
  return { id, handle: id, title: id } as unknown as Product;
}

beforeEach(async () => {
  window.localStorage.clear();
  // The snapshot cache lives at module scope, so reload the module per test.
  vi.resetModules();
  ({ addRecentlyViewed, useRecentlyViewed } = await import("./recently-viewed"));
});

describe("useRecentlyViewed", () => {
  it("starts empty when nothing is stored", () => {
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.items).toEqual([]);
  });

  it("updates a mounted hook when a product is added", () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => addRecentlyViewed(product("new")));
    expect(result.current.items.map((p) => p.id)).toEqual(["new"]);
  });

  it("returns most-recent-first and caps the list at 8", () => {
    const { result } = renderHook(() => useRecentlyViewed());
    for (let i = 0; i < 10; i++) act(() => addRecentlyViewed(product(`p${i}`)));
    expect(result.current.items).toHaveLength(8);
    expect(result.current.items[0].id).toBe("p9");
  });

  it("excludes the id it is given", () => {
    const { result } = renderHook(() => useRecentlyViewed("p1"));
    act(() => addRecentlyViewed(product("p1")));
    act(() => addRecentlyViewed(product("p2")));
    expect(result.current.items.map((p) => p.id)).toEqual(["p2"]);
  });

  it("moves a re-viewed product to the front without duplicating it", () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => addRecentlyViewed(product("p1")));
    act(() => addRecentlyViewed(product("p2")));
    act(() => addRecentlyViewed(product("p1")));
    expect(result.current.items.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("reads what a previous session stored", () => {
    window.localStorage.setItem("iris_recently_viewed", JSON.stringify([product("old")]));
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.items.map((p) => p.id)).toEqual(["old"]);
  });

  it("survives corrupt stored data", () => {
    window.localStorage.setItem("iris_recently_viewed", "not json");
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.items).toEqual([]);
  });
});
