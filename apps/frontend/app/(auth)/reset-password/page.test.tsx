import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordPage from "./page";

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

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders the reset password form", () => {
    render(<ResetPasswordPage />);

    expect(screen.getByText("Reset password")).toBeInTheDocument();
    expect(
      screen.getByText("Enter your email and we'll send you a reset link.")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByText("Send reset link")).toBeInTheDocument();
  });

  it("shows link back to login", () => {
    render(<ResetPasswordPage />);

    const loginLink = screen.getByRole("link", { name: "Back to login" });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("disables submit button when email is empty", () => {
    render(<ResetPasswordPage />);

    const submitButton = screen.getByText("Send reset link");
    expect(submitButton).toBeDisabled();
  });

  it("submits and shows success message", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(
      screen.getByPlaceholderText("Email address"),
      "test@example.com"
    );
    await user.click(screen.getByText("Send reset link"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      });
    });

    // Success message should replace the form
    await waitFor(() => {
      expect(
        screen.getByText(/password reset link has been sent/)
      ).toBeInTheDocument();
    });

    // Form should no longer be visible
    expect(
      screen.queryByPlaceholderText("Email address")
    ).not.toBeInTheDocument();
  });

  it("shows error on API failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Something went wrong" }),
    });

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(
      screen.getByPlaceholderText("Email address"),
      "test@example.com"
    );
    await user.click(screen.getByText("Send reset link"));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    // Form should still be visible (no success state)
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
  });

  it("shows network error on fetch failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network failure")
    );

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(
      screen.getByPlaceholderText("Email address"),
      "test@example.com"
    );
    await user.click(screen.getByText("Send reset link"));

    await waitFor(() => {
      expect(
        screen.getByText("Network error. Please try again.")
      ).toBeInTheDocument();
    });
  });
});
