import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfilePage from "./page";

// Mock apiClient
const mockApiClient = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
}));

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

    mockApiClient.mockImplementation(async (path: string, options?: any) => {
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
    expect(screen.getByDisplayValue("+1234567890")).toBeInTheDocument();
  });

  it("shows error when profile fetch fails", async () => {
    mockApiClient.mockRejectedValue(new Error("Not found"));
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load profile.")).toBeInTheDocument();
    });
  });

  it("saves profile changes and shows success message", async () => {
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
      expect(screen.getByText("Profile updated.")).toBeInTheDocument();
    });
  });

  it("shows error when save fails", async () => {
    mockApiClient.mockImplementation(async (path: string, options?: any) => {
      if (path === "/profile" && (!options || options.method !== "PUT")) {
        return { first_name: "John", last_name: "Doe", phone_number: "", email_notifications: false, sms_notifications: false };
      }
      const error: any = new Error("Update failed");
      error.data = { error: "Update failed" };
      throw error;
    });

    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Save changes"));

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
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
