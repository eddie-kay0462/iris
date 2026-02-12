import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "./Header";

// Mock next/navigation
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Menu: () => <span data-testid="menu-icon">Menu</span>,
}));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders the header with title", () => {
    render(<Header />);

    expect(screen.getByText("Iris admin")).toBeInTheDocument();
    expect(screen.getByText("Operations")).toBeInTheDocument();
  });

  it("shows sign out button", () => {
    render(<Header />);

    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("shows hamburger menu when onMenuToggle is provided", () => {
    render(<Header onMenuToggle={() => {}} />);

    expect(screen.getByTestId("menu-icon")).toBeInTheDocument();
  });

  it("does not show hamburger when onMenuToggle is not provided", () => {
    render(<Header />);

    expect(screen.queryByTestId("menu-icon")).not.toBeInTheDocument();
  });

  it("calls onMenuToggle when hamburger is clicked", async () => {
    const onMenuToggle = vi.fn();
    const user = userEvent.setup();
    render(<Header onMenuToggle={onMenuToggle} />);

    const hamburger = screen.getByTestId("menu-icon").closest("button")!;
    await user.click(hamburger);

    expect(onMenuToggle).toHaveBeenCalledTimes(1);
  });

  it("handles logout on sign out click", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByText("Sign out"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/admin/logout", {
        method: "POST",
      });
      expect(mockPush).toHaveBeenCalledWith("/admin/login");
    });
  });
});
