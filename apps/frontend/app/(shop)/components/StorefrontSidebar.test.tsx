import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const push = vi.fn();
const openCart = vi.fn();
const openFavourites = vi.fn();
const onClose = vi.fn();
const setCurrency = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api/client", () => ({ hasToken: () => false }));
vi.mock("@/lib/api/profile", () => ({ useProfile: () => ({ data: null }) }));
vi.mock("@/lib/cart", () => ({
  useCart: () => ({ itemCount: 3, hydrated: true, openDrawer: openCart }),
}));
vi.mock("@/lib/favourites", () => ({
  useFavourites: () => ({ data: [{ id: "a" }, { id: "b" }] }),
}));
vi.mock("@/lib/favourites-drawer", () => ({
  useFavouritesDrawer: () => ({ openDrawer: openFavourites }),
}));
vi.mock("@/lib/locale/locale-provider", () => ({
  useLocale: () => ({ currency: "GHS", setCurrency }),
  CURRENCIES: [
    { code: "GHS", name: "Ghana Cedi", symbol: "₵" },
    { code: "USD", name: "US Dollar", symbol: "$" },
  ],
}));

import StorefrontSidebar, { currencyShortLabel } from "./StorefrontSidebar";

describe("StorefrontSidebar (signed out)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    render(<StorefrontSidebar open onClose={onClose} />);
  });

  it("opens the cart drawer instead of navigating", () => {
    fireEvent.click(screen.getAllByRole("button", { name: /^Bag/ })[0]);
    expect(openCart).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("opens the favourites drawer instead of routing to /favourites", () => {
    fireEvent.click(screen.getAllByRole("button", { name: /^Saved Items/ })[0]);
    expect(openFavourites).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("never links to /favourites", () => {
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).not.toContain("/favourites");
  });

  it("shows bag and saved counts", () => {
    expect(screen.getAllByRole("button", { name: /^Bag/ })[0]).toHaveTextContent("3");
    expect(screen.getAllByRole("button", { name: /^Saved Items/ })[0]).toHaveTextContent("2");
  });

  it("is a modal dialog that closes on Escape", () => {
    expect(screen.getByRole("dialog", { name: "Menu" })).toHaveAttribute("aria-modal", "true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("opens the secondary panel for a parent category on click", () => {
    const tops = screen.getAllByRole("button", { name: /^Tops/ })[0];
    expect(tops).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(tops);
    expect(tops).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("link", { name: "T-Shirts" }).length).toBeGreaterThan(0);
  });

  it("changes currency from the footer menu", () => {
    fireEvent.click(screen.getByRole("button", { name: /Ghana · GHS/ }));
    fireEvent.click(screen.getByRole("option", { name: /United States · USD/ }));
    expect(setCurrency).toHaveBeenCalledWith("USD");
  });

  it("submits the search to the products page", () => {
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "hoodie" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/products?search=hoodie");
    expect(onClose).toHaveBeenCalled();
  });
});

describe("currencyShortLabel", () => {
  it("maps codes to the header short form", () => {
    expect(currencyShortLabel("GHS")).toBe("GH / GHS");
    expect(currencyShortLabel("GBP")).toBe("UK / GBP");
    expect(currencyShortLabel("XYZ")).toBe("XY / XYZ");
  });
});
