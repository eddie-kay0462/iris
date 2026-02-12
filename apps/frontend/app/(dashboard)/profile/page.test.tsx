import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfilePage from "./page";

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
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

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      async (url: string, options?: RequestInit) => {
        if (url === "/api/profile" && (!options || options.method !== "PUT")) {
          return { ok: true, json: async () => defaultProfile };
        }
        if (url === "/api/profile" && options?.method === "PUT") {
          return {
            ok: true,
            json: async () => ({ success: true, profile: defaultProfile }),
          };
        }
        return { ok: false, json: async () => ({ error: "Not found" }) };
      }
    );
  }

  it("shows loading state initially", () => {
    // Never resolve the fetch to keep loading state
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );

    render(<ProfilePage />);
    expect(screen.getByText("Loading profile...")).toBeInTheDocument();
  });

  it("loads and displays profile data", async () => {
    mockProfileFetch();
    render(<ProfilePage />);

    // Wait for the form to appear and values to be populated by reset()
    await waitFor(() => {
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+1234567890")).toBeInTheDocument();
  });

  it("shows error when profile fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Not found" }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load profile.")).toBeInTheDocument();
    });
  });

  it("saves profile changes and shows success message", async () => {
    mockProfileFetch();

    const user = userEvent.setup();
    render(<ProfilePage />);

    // Wait for profile data to load into the form
    await waitFor(() => {
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    });

    // Clear and type a new name
    const firstNameInput = screen.getByDisplayValue("John");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane");

    // Submit
    await user.click(screen.getByText("Save changes"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
      expect(screen.getByText("Profile updated.")).toBeInTheDocument();
    });
  });

  it("shows error when save fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      async (url: string, options?: RequestInit) => {
        if (url === "/api/profile" && (!options || options.method !== "PUT")) {
          return {
            ok: true,
            json: async () => ({
              first_name: "John",
              last_name: "Doe",
              phone_number: "",
              email_notifications: false,
              sms_notifications: false,
            }),
          };
        }
        if (url === "/api/profile" && options?.method === "PUT") {
          return {
            ok: false,
            json: async () => ({ error: "Update failed" }),
          };
        }
        return { ok: false, json: async () => ({}) };
      }
    );

    const user = userEvent.setup();
    render(<ProfilePage />);

    // Wait for the form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Save changes"));

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });

  it("renders notification checkboxes", async () => {
    mockProfileFetch({ email_notifications: true, sms_notifications: false });
    render(<ProfilePage />);

    await waitFor(() => {
      const emailCheckbox = screen.getByLabelText(
        "Email notifications"
      ) as HTMLInputElement;
      expect(emailCheckbox.checked).toBe(true);
    });

    const smsCheckbox = screen.getByLabelText(
      "SMS notifications"
    ) as HTMLInputElement;
    expect(smsCheckbox.checked).toBe(false);
  });
});
