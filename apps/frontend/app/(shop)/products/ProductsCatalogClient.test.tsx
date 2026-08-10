import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let currentQuery = "";
const replace = vi.fn((url: string) => {
  currentQuery = url.includes("?") ? url.split("?")[1] : "";
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(currentQuery),
  useRouter: () => ({ replace }),
  usePathname: () => "/products",
}));

vi.mock("../components/InfiniteProductGrid", () => ({
  InfiniteProductGrid: (p: Record<string, string>) => (
    <div data-testid="grid" data-category={p.category || ""} data-pt={p.productType || ""} />
  ),
}));
vi.mock("../components/PersonalisedStrip", () => ({
  PersonalisedStrip: () => null,
}));

import { ProductsCatalogClient } from "./ProductsCatalogClient";

function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("category buttons", () => {
  beforeEach(() => {
    currentQuery = "";
    replace.mockClear();
  });

  it("sets the clicked category", () => {
    const { rerender } = render(<ProductsCatalogClient />);
    click("Tops");
    expect(currentQuery).toBe("category=Tops");
    rerender(<ProductsCatalogClient />);
    expect(screen.getByTestId("grid").dataset.category).toBe("Tops");
  });

  it("keeps category alongside gender", () => {
    const { rerender } = render(<ProductsCatalogClient />);
    click("Men's");
    rerender(<ProductsCatalogClient />);
    click("Bottoms");
    expect(currentQuery).toBe("gender=men&category=Bottoms");
  });

  it("switching category drops the old product_type", () => {
    const { rerender } = render(<ProductsCatalogClient />);
    click("Tops");
    rerender(<ProductsCatalogClient />);
    click("Shirts");
    expect(currentQuery).toBe("category=Tops&product_type=Shirts");
    rerender(<ProductsCatalogClient />);
    click("Accessories");
    expect(currentQuery).toBe("category=Accessories");
  });

  it("category chip × clears category and product_type", () => {
    const { rerender } = render(<ProductsCatalogClient />);
    click("Tops");
    rerender(<ProductsCatalogClient />);
    click("Shirts");
    rerender(<ProductsCatalogClient />);
    const chip = screen.getAllByRole("button", { name: "×" })[0];
    fireEvent.click(chip);
    expect(currentQuery).toBe("");
  });

  it("'All' clears the category filter", () => {
    const { rerender } = render(<ProductsCatalogClient />);
    click("Footwear");
    rerender(<ProductsCatalogClient />);
    click("All");
    expect(currentQuery).toBe("");
  });
});
