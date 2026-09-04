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
  apiClient: (...args: unknown[]) => mockApiClient(...args),
  setToken: (...args: unknown[]) => mockSetToken(...args),
}));

// Feedback is delivered as toasts, not inline text.
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("message");
  });

  it("renders the login form", () => {
    render(<LoginPage />);
    expect(screen.getByText("Log In")).toBeInTheDocument();
    expect(screen.getByText("Enter your credentials to continue.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("shows signup and reset-password links", () => {
    render(<LoginPage />);
    expect(screen.getByRole("link", { name: "Sign Up" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Forgot Password?" })).toHaveAttribute("href", "/reset-password");
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

  it("toasts the password-updated notice when ?message=password-updated", () => {
    mockSearchParams.set("message", "password-updated");
    render(<LoginPage />);
    expect(toast.success).toHaveBeenCalledWith(
      "Password updated successfully. Please log in with your new password.",
    );
  });

  it("does not toast the notice without the query param", () => {
    render(<LoginPage />);
    expect(toast.success).not.toHaveBeenCalled();
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

  it("toasts the error on failed login", async () => {
    const error = Object.assign(new Error("Invalid email or password"), {
      data: { message: "Invalid email or password" },
    });
    mockApiClient.mockRejectedValue(error);

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Email address"), "bad@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "wrongpass");
    await user.click(screen.getByText("Sign in"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid email or password", { duration: 6000 });
    });
  });
});
