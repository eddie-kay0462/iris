import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const push = vi.fn();
const openCart = vi.fn();
const openFavourites = vi.fn();
const onClose = vi.fn();

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
vi.mock("@/lib/theme/theme-provider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));
vi.mock("@/lib/locale/locale-provider", () => ({
  useLocale: () => ({
    region: { flag: "🇬🇭", countryCode: "GH" },
    currency: "GHS",
    setCurrency: vi.fn(),
  }),
  CURRENCIES: [{ code: "GHS", name: "Cedi", symbol: "₵" }],
}));

import NavDrawer from "./NavDrawer";

describe("NavDrawer bag / saved items rows (signed out)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    render(<NavDrawer open onClose={onClose} />);
  });

  it("opens the cart drawer instead of navigating", () => {
    fireEvent.click(screen.getByRole("button", { name: /^Bag/ }));
    expect(openCart).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("opens the favourites drawer instead of routing to /favourites", () => {
    fireEvent.click(screen.getByRole("button", { name: /^Saved Items/ }));
    expect(openFavourites).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("no longer links signed-out users to /favourites or /login from Info", () => {
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).not.toContain("/favourites");
  });

  it("shows bag and saved counts", () => {
    expect(screen.getByRole("button", { name: /^Bag/ })).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: /^Saved Items/ })).toHaveTextContent("2");
  });
});
