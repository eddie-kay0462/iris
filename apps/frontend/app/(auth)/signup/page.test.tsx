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
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock apiClient
const mockApiClient = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: (...args: unknown[]) => mockApiClient(...args),
}));

// Feedback is delivered as toasts, not inline text.
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }));

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(<SignupPage />);
    expect(screen.getByText("Create an account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("First name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Last name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("024 123 4567")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
    expect(screen.getByText("Sign up")).toBeInTheDocument();
  });

  it("shows link to login page", () => {
    render(<SignupPage />);
    expect(screen.getByRole("link", { name: "Log In" })).toHaveAttribute("href", "/login");
  });

  it("shows validation error for empty email", async () => {
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

    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "short");
    await user.type(screen.getByPlaceholderText("Confirm password"), "short");
    await user.click(screen.getByText("Sign up"));

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    });
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "different123");
    await user.click(screen.getByText("Sign up"));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("submits form and redirects to verify on success", async () => {
    mockApiClient.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByPlaceholderText("First name"), "John");
    await user.type(screen.getByPlaceholderText("Last name"), "Doe");
    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "password123");
    await user.click(screen.getByText("Sign up"));

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith("/auth/signup", expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ email: "test@example.com" }),
      }));
      expect(mockPush).toHaveBeenCalledWith(
        "/verify?email=test%40example.com"
      );
    });
  });

  it("toasts the server error when signup fails", async () => {
    const error = Object.assign(new Error("An account with this email already exists"), {
      data: { message: "An account with this email already exists" },
    });
    mockApiClient.mockRejectedValue(error);

    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByPlaceholderText("Email address"), "existing@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "password123");
    await user.click(screen.getByText("Sign up"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "An account with this email already exists",
        { duration: 6000 },
      );
    });
  });

  it("toasts a fallback error on network failure", async () => {
    mockApiClient.mockRejectedValue(new Error("fetch failed"));

    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "password123");
    await user.click(screen.getByText("Sign up"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong", { duration: 6000 });
    });
  });
});
