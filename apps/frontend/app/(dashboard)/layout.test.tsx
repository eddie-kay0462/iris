import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardLayout from "./layout";

// Mock next/navigation
const mockPush = vi.fn();
let mockPathname = "/waitlist";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Menu: () => <span data-testid="menu-icon">Menu</span>,
  X: () => <span data-testid="x-icon">X</span>,
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/waitlist";
    global.fetch = vi.fn();
  });

  it("renders the header with brand link and nav items", () => {
    render(
      <DashboardLayout>
        <div>Child content</div>
      </DashboardLayout>
    );

    // Brand
    const brandLink = screen.getByRole("link", { name: "Iris" });
    expect(brandLink).toHaveAttribute("href", "/products");

    // Nav links (desktop nav has them, mobile nav too when open)
    const waitlistLinks = screen.getAllByRole("link", { name: "Waitlist" });
    expect(waitlistLinks.length).toBeGreaterThanOrEqual(1);

    const innerCircleLinks = screen.getAllByRole("link", {
      name: "Inner Circle",
    });
    expect(innerCircleLinks.length).toBeGreaterThanOrEqual(1);

    const profileLinks = screen.getAllByRole("link", { name: "Profile" });
    expect(profileLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders children in main content area", () => {
    render(
      <DashboardLayout>
        <div>Test child content</div>
      </DashboardLayout>
    );

    expect(screen.getByText("Test child content")).toBeInTheDocument();
  });

  it("shows sign out button", () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    const signOutButtons = screen.getAllByText("Sign out");
    expect(signOutButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("toggles mobile navigation on hamburger click", async () => {
    const user = userEvent.setup();
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Click hamburger
    const hamburger = screen.getByTestId("menu-icon").closest("button")!;
    await user.click(hamburger);

    // X icon should appear (mobile nav is open)
    expect(screen.getByTestId("x-icon")).toBeInTheDocument();
  });

  it("handles logout", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Click the first Sign out button (desktop)
    const signOutButtons = screen.getAllByText("Sign out");
    await user.click(signOutButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", {
        method: "POST",
      });
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
