import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

// Mock supabase client
const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
    },
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset search params
    mockSearchParams.delete("registered");
  });

  it("renders the login form", () => {
    render(<LoginPage />);
    expect(screen.getByText("Log in")).toBeInTheDocument();
    expect(
      screen.getByText("Receive a one-time code to continue.")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone number")).toBeInTheDocument();
    expect(screen.getByText("Send Code")).toBeInTheDocument();
  });

  it("shows signup and reset-password links", () => {
    render(<LoginPage />);

    const signupLink = screen.getByRole("link", { name: "Sign up" });
    expect(signupLink).toHaveAttribute("href", "/signup");

    const resetLink = screen.getByRole("link", { name: "Forgot password?" });
    expect(resetLink).toHaveAttribute("href", "/reset-password");
  });

  it("shows success banner when ?registered=true", () => {
    mockSearchParams.set("registered", "true");
    render(<LoginPage />);

    expect(
      screen.getByText("Account created successfully. Please log in.")
    ).toBeInTheDocument();
  });

  it("does not show success banner without query param", () => {
    render(<LoginPage />);

    expect(
      screen.queryByText("Account created successfully. Please log in.")
    ).not.toBeInTheDocument();
  });

  it("switches between phone and email method", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // Default is phone
    expect(screen.getByPlaceholderText("Phone number")).toBeInTheDocument();

    // Switch to email
    await user.click(screen.getByLabelText("Email"));
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();

    // Switch back to phone
    await user.click(screen.getByLabelText("Phone"));
    expect(screen.getByPlaceholderText("Phone number")).toBeInTheDocument();
  });

  it("sends OTP and shows verify step", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByLabelText("Email"));
    await user.type(
      screen.getByPlaceholderText("Email address"),
      "test@example.com"
    );
    await user.click(screen.getByText("Send Code"));

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: "test@example.com",
    });

    // Should show OTP input
    expect(screen.getByPlaceholderText("Enter OTP")).toBeInTheDocument();
    expect(screen.getByText("Verify")).toBeInTheDocument();
    expect(screen.getByText("Back")).toBeInTheDocument();
  });

  it("shows error when OTP send fails", async () => {
    mockSignInWithOtp.mockResolvedValue({
      error: { message: "Rate limit exceeded" },
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByLabelText("Email"));
    await user.type(
      screen.getByPlaceholderText("Email address"),
      "test@example.com"
    );
    await user.click(screen.getByText("Send Code"));

    expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
  });

  it("verifies OTP and redirects on success", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    mockVerifyOtp.mockResolvedValue({ error: null });

    const user = userEvent.setup();
    render(<LoginPage />);

    // Send OTP
    await user.click(screen.getByLabelText("Email"));
    await user.type(
      screen.getByPlaceholderText("Email address"),
      "test@example.com"
    );
    await user.click(screen.getByText("Send Code"));

    // Verify OTP
    await user.type(screen.getByPlaceholderText("Enter OTP"), "123456");
    await user.click(screen.getByText("Verify"));

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: "test@example.com",
      token: "123456",
      type: "email",
    });
    expect(mockPush).toHaveBeenCalledWith("/products");
  });

  it("disables send button when input is empty", () => {
    render(<LoginPage />);

    const sendButton = screen.getByText("Send Code");
    expect(sendButton).toBeDisabled();
  });
});
