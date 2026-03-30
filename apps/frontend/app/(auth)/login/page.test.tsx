import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock apiClient and setToken
const mockApiClient = vi.fn();
const mockSetToken = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
  setToken: (...args: any[]) => mockSetToken(...args),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("message");
  });

  it("renders the login form", () => {
    render(<LoginPage />);
    expect(screen.getByText("Log in")).toBeInTheDocument();
    expect(screen.getByText("Enter your credentials to continue.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("shows signup and reset-password links", () => {
    render(<LoginPage />);
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/reset-password");
  });

  it("disables sign in button when fields are empty", () => {
    render(<LoginPage />);
    expect(screen.getByText("Sign in")).toBeDisabled();
  });

  it("enables sign in button when both fields are filled", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");

    expect(screen.getByText("Sign in")).not.toBeDisabled();
  });

  it("shows password-updated banner when ?message=password-updated", () => {
    mockSearchParams.set("message", "password-updated");
    render(<LoginPage />);
    expect(
      screen.getByText("Password updated successfully. Please log in with your new password.")
    ).toBeInTheDocument();
  });

  it("does not show the banner without query param", () => {
    render(<LoginPage />);
    expect(
      screen.queryByText(/Password updated successfully/)
    ).not.toBeInTheDocument();
  });

  it("submits and redirects on success", async () => {
    mockApiClient.mockResolvedValue({ access_token: "fake-jwt" });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByText("Sign in"));

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith("/auth/login", {
        method: "POST",
        body: { email: "test@example.com", password: "password123" },
      });
      expect(mockSetToken).toHaveBeenCalledWith("fake-jwt");
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("shows error message on failed login", async () => {
    const error: any = new Error("Invalid email or password");
    error.data = { message: "Invalid email or password" };
    mockApiClient.mockRejectedValue(error);

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Email address"), "bad@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "wrongpass");
    await user.click(screen.getByText("Sign in"));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    });
  });
});
