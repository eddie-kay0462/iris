import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupPage from "./page";

// Mock next/navigation
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders all form fields", () => {
    render(<SignupPage />);

    expect(screen.getByText("Create an account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("First name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Last name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Phone number (optional)")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
    expect(screen.getByText("Sign up")).toBeInTheDocument();
  });

  it("shows link to login page", () => {
    render(<SignupPage />);

    const loginLink = screen.getByRole("link", { name: "Log in" });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("shows validation errors for empty required fields", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.click(screen.getByText("Sign up"));

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });
  });

  it("shows error for password too short", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(
      screen.getByPlaceholderText("Email address"),
      "test@example.com"
    );
    await user.type(screen.getByPlaceholderText("Password"), "short");
    await user.type(screen.getByPlaceholderText("Confirm password"), "short");
    await user.click(screen.getByText("Sign up"));

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters")
      ).toBeInTheDocument();
    });
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(
      screen.getByPlaceholderText("Email address"),
      "test@example.com"
    );
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.type(
      screen.getByPlaceholderText("Confirm password"),
      "different123"
    );
    await user.click(screen.getByText("Sign up"));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("submits form and redirects on success (201)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 201,
      json: async () => ({ success: true, user: { id: "1", email: "test@example.com" } }),
    });

    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByPlaceholderText("First name"), "John");
    await user.type(screen.getByPlaceholderText("Last name"), "Doe");
    await user.type(
      screen.getByPlaceholderText("Email address"),
      "test@example.com"
    );
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.type(
      screen.getByPlaceholderText("Confirm password"),
      "password123"
    );
    await user.click(screen.getByText("Sign up"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"email":"test@example.com"'),
      });
      expect(mockPush).toHaveBeenCalledWith("/login?registered=true");
    });
  });

  it("shows server error on 409 (user exists)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 409,
      json: async () => ({ error: "User already registered" }),
    });

    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(
      screen.getByPlaceholderText("Email address"),
      "existing@example.com"
    );
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.type(
      screen.getByPlaceholderText("Confirm password"),
      "password123"
    );
    await user.click(screen.getByText("Sign up"));

    await waitFor(() => {
      expect(
        screen.getByText("User already registered")
      ).toBeInTheDocument();
    });
  });

  it("shows network error on fetch failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(
      screen.getByPlaceholderText("Email address"),
      "test@example.com"
    );
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.type(
      screen.getByPlaceholderText("Confirm password"),
      "password123"
    );
    await user.click(screen.getByText("Sign up"));

    await waitFor(() => {
      expect(
        screen.getByText("Network error. Please try again.")
      ).toBeInTheDocument();
    });
  });
});
