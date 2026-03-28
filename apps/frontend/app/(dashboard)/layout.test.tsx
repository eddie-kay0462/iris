import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardLayout from "./layout";

// Mock next/navigation
const mockPush = vi.fn();
let mockPathname = "/profile";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: any }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Menu: () => <span data-testid="menu-icon">Menu</span>,
  X: () => <span data-testid="x-icon">X</span>,
}));

// Mock apiClient and clearToken
const mockApiClient = vi.fn();
const mockClearToken = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
  clearToken: () => mockClearToken(),
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/profile";
  });

  it("renders the header with brand link and nav items", () => {
    render(
      <DashboardLayout>
        <div>Child content</div>
      </DashboardLayout>
    );

    // Brand link points to /products
    const brandLink = screen.getByRole("link", { name: "1NRI" });
    expect(brandLink).toHaveAttribute("href", "/products");

    // Nav links
    const ordersLinks = screen.getAllByRole("link", { name: "Orders" });
    expect(ordersLinks.length).toBeGreaterThanOrEqual(1);

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

    const hamburger = screen.getByTestId("menu-icon").closest("button")!;
    await user.click(hamburger);

    expect(screen.getByTestId("x-icon")).toBeInTheDocument();
  });

  it("handles logout — clears token and redirects to login", async () => {
    mockApiClient.mockResolvedValue({});

    const user = userEvent.setup();
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    const signOutButtons = screen.getAllByText("Sign out");
    await user.click(signOutButtons[0]);

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
      expect(mockClearToken).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
