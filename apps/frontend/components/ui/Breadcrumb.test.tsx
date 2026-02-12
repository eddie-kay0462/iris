import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "./Breadcrumb";

// Mock next/navigation
let mockPathname = "/admin/products";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  ChevronRight: ({ className }: { className?: string }) => (
    <span className={className} data-testid="chevron">
      &gt;
    </span>
  ),
}));

describe("Breadcrumb", () => {
  it("auto-generates breadcrumbs from pathname", () => {
    mockPathname = "/admin/products";
    render(<Breadcrumb />);

    // "Admin" should be a link, "Products" should be plain text (last segment)
    const adminLink = screen.getByRole("link", { name: "Admin" });
    expect(adminLink).toHaveAttribute("href", "/admin");

    expect(screen.getByText("Products")).toBeInTheDocument();
  });

  it("renders manual items when provided", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Settings", href: "/settings" },
          { label: "Users" },
        ]}
      />
    );

    const homeLink = screen.getByRole("link", { name: "Home" });
    expect(homeLink).toHaveAttribute("href", "/");

    const settingsLink = screen.getByRole("link", { name: "Settings" });
    expect(settingsLink).toHaveAttribute("href", "/settings");

    // Last item should not be a link
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Users").tagName).toBe("SPAN");
  });

  it("renders chevron separators between items", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "About", href: "/about" },
          { label: "Team" },
        ]}
      />
    );

    // Should have 2 chevrons (between 3 items)
    const chevrons = screen.getAllByTestId("chevron");
    expect(chevrons).toHaveLength(2);
  });

  it("converts kebab-case segments to Title Case", () => {
    mockPathname = "/admin/inner-circle";
    render(<Breadcrumb />);

    expect(screen.getByText("Inner Circle")).toBeInTheDocument();
  });

  it("returns null for empty path", () => {
    mockPathname = "/";
    const { container } = render(<Breadcrumb />);

    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders last item as non-link (current page)", () => {
    mockPathname = "/admin/products";
    render(<Breadcrumb />);

    const productsText = screen.getByText("Products");
    expect(productsText.tagName).toBe("SPAN");
    // Should have font-medium for the active page
    expect(productsText.className).toContain("font-medium");
  });
});
