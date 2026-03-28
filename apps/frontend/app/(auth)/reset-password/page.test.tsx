import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordPage from "./page";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock Supabase client
const mockResetPasswordForEmail = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  }),
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the reset password form", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText("Reset password")).toBeInTheDocument();
    expect(screen.getByText("Enter your email and we'll send you a reset link.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByText("Send reset link")).toBeInTheDocument();
  });

  it("shows link back to login", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByRole("link", { name: "Back to login" })).toHaveAttribute("href", "/login");
  });

  it("disables submit button when email is empty", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText("Send reset link")).toBeDisabled();
  });

  it("submits and shows success message", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.click(screen.getByText("Send reset link"));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        expect.objectContaining({ redirectTo: expect.stringContaining("/update-password") })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/password reset link has been sent/)).toBeInTheDocument();
    });

    // Form should be replaced by success message
    expect(screen.queryByPlaceholderText("Email address")).not.toBeInTheDocument();
  });

  it("shows error on Supabase failure", async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      error: { message: "Something went wrong. Please try again." },
    });

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.click(screen.getByText("Send reset link"));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
    });

    // Form should still be visible
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
  });

  it("shows error on network failure", async () => {
    mockResetPasswordForEmail.mockRejectedValue(new Error("Network failure"));

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.click(screen.getByText("Send reset link"));

    await waitFor(() => {
      expect(screen.getByText("Network failure")).toBeInTheDocument();
    });
  });
});
