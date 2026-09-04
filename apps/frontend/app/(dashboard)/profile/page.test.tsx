import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfilePage from "./page";

// Mock apiClient
const mockApiClient = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: (...args: unknown[]) => mockApiClient(...args),
}));

// Feedback is delivered as toasts, not inline text.
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockProfileFetch(profile = {}) {
    const defaultProfile = {
      first_name: "John",
      last_name: "Doe",
      phone_number: "+1234567890",
      email_notifications: true,
      sms_notifications: false,
      ...profile,
    };

    mockApiClient.mockImplementation(async (path: string, options?: { method?: string }) => {
      if (path === "/profile" && (!options || options.method !== "PUT")) {
        return defaultProfile;
      }
      if (path === "/profile" && options?.method === "PUT") {
        return { success: true, profile: defaultProfile };
      }
      throw new Error("Not found");
    });
  }

  it("shows loading state initially", () => {
    // Never resolves — keeps loading state
    mockApiClient.mockImplementation(() => new Promise(() => {}));

    render(<ProfilePage />);
    expect(screen.getByText("Loading profile...")).toBeInTheDocument();
  });

  it("loads and displays profile data", async () => {
    mockProfileFetch();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
    // Rendered by PhoneInput: the +1 dial code moves into the country selector.
    expect(screen.getByDisplayValue("234567890")).toBeInTheDocument();
    expect((screen.getByLabelText("Country dial code") as HTMLSelectElement).value).toBe("US");
  });

  it("toasts an error when profile fetch fails", async () => {
    mockApiClient.mockRejectedValue(new Error("Not found"));
    render(<ProfilePage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load profile.", { duration: 6000 });
    });
  });

  it("saves profile changes and toasts success", async () => {
    mockProfileFetch();

    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    });

    const firstNameInput = screen.getByDisplayValue("John");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane");

    await user.click(screen.getByText("Save changes"));

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith("/profile", expect.objectContaining({
        method: "PUT",
        body: expect.objectContaining({ first_name: "Jane" }),
      }));
      expect(toast.success).toHaveBeenCalledWith("Profile updated.");
    });
  });

  it("toasts an error when save fails", async () => {
    mockApiClient.mockImplementation(async (path: string, options?: { method?: string }) => {
      if (path === "/profile" && (!options || options.method !== "PUT")) {
        return { first_name: "John", last_name: "Doe", phone_number: "", email_notifications: false, sms_notifications: false };
      }
      throw Object.assign(new Error("Update failed"), { data: { error: "Update failed" } });
    });

    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Save changes"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed", { duration: 6000 });
    });
  });

  it("renders notification checkboxes with correct initial state", async () => {
    mockProfileFetch({ email_notifications: true, sms_notifications: false });
    render(<ProfilePage />);

    await waitFor(() => {
      const emailCheckbox = screen.getByLabelText("Email notifications") as HTMLInputElement;
      expect(emailCheckbox.checked).toBe(true);
    });

    const smsCheckbox = screen.getByLabelText("SMS notifications") as HTMLInputElement;
    expect(smsCheckbox.checked).toBe(false);
  });
});
