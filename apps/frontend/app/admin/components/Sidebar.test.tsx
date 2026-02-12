import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./Sidebar";

// Mock next/navigation
let mockPathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

// Mock lucide-react (just enough to render)
vi.mock("lucide-react", () => {
  const icon = ({ className }: { className?: string }) => (
    <span className={className}>icon</span>
  );
  return {
    LayoutDashboard: icon,
    Package: icon,
    ShoppingCart: icon,
    Warehouse: icon,
    Users: icon,
    ClipboardList: icon,
    BarChart3: icon,
    Settings: icon,
    PanelLeftOpen: icon,
    PanelLeftClose: icon,
    X: icon,
  };
});

describe("Sidebar", () => {
  it("renders all nav items for admin role", () => {
    render(<Sidebar role="admin" />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getByText("Waitlist")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("filters nav items for staff role", () => {
    render(<Sidebar role="staff" />);

    // Staff has: products:read, orders:read, customers:read, inventory:read
    expect(screen.getByText("Dashboard")).toBeInTheDocument(); // No permission required
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(screen.getByText("Customers")).toBeInTheDocument();

    // Staff does NOT have: waitlist:read, analytics:read, settings:read
    expect(screen.queryByText("Waitlist")).not.toBeInTheDocument();
    expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("filters nav items for manager role", () => {
    render(<Sidebar role="manager" />);

    // Manager has most permissions but NOT settings:read
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getByText("Waitlist")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();

    // Manager does NOT have settings:read
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("shows mobile overlay when mobileOpen is true", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Sidebar role="admin" mobileOpen={true} onClose={onClose} />
    );

    // Should have backdrop overlay
    const backdrop = container.querySelector(".fixed.inset-0.z-40");
    expect(backdrop).toBeInTheDocument();

    // Should have mobile sidebar
    const mobileSidebar = container.querySelector(".fixed.inset-y-0.left-0.z-50");
    expect(mobileSidebar).toBeInTheDocument();
  });

  it("does not show mobile overlay when mobileOpen is false", () => {
    const { container } = render(<Sidebar role="admin" mobileOpen={false} />);

    const backdrop = container.querySelector(".fixed.inset-0.z-40");
    expect(backdrop).not.toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Sidebar role="admin" mobileOpen={true} onClose={onClose} />
    );

    const backdrop = container.querySelector(".fixed.inset-0.z-40") as Element;
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when a nav link is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Sidebar role="admin" mobileOpen={true} onClose={onClose} />);

    // Click the Products link (there may be multiple due to desktop + mobile rendering)
    const productLinks = screen.getAllByText("Products");
    await user.click(productLinks[0]);

    expect(onClose).toHaveBeenCalled();
  });

  it("highlights the active nav item", () => {
    mockPathname = "/admin/products";
    render(<Sidebar role="admin" />);

    // Find the Products link - it should have active styling (bg-white/10)
    const productLinks = screen.getAllByText("Products");
    const productLink = productLinks[0].closest("a");
    expect(productLink?.className).toContain("bg-white/10");

    // Dashboard should not be active
    const dashboardLinks = screen.getAllByText("Dashboard");
    const dashboardLink = dashboardLinks[0].closest("a");
    expect(dashboardLink?.className).not.toContain("bg-white/10");
  });
});
