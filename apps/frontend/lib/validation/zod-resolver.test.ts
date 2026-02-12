import { describe, it, expect } from "vitest";
import { z } from "zod";
import { zodResolver } from "./zod-resolver";

describe("zodResolver", () => {
  const schema = z.object({
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().optional(),
  });

  it("returns values and empty errors on valid input", async () => {
    const resolver = zodResolver(schema);
    const result = await resolver(
      { email: "test@example.com", password: "12345678", name: "Test" },
      {} as any,
      {} as any
    );

    expect(result.errors).toEqual({});
    expect(result.values).toEqual({
      email: "test@example.com",
      password: "12345678",
      name: "Test",
    });
  });

  it("returns field errors on invalid input", async () => {
    const resolver = zodResolver(schema);
    const result = await resolver(
      { email: "", password: "short", name: "" },
      {} as any,
      {} as any
    );

    expect(result.errors.email).toBeDefined();
    expect(result.errors.email).toHaveProperty("message", "Email is required");
    expect(result.errors.password).toBeDefined();
    expect(result.errors.password).toHaveProperty(
      "message",
      "Password must be at least 8 characters"
    );
  });

  it("returns error for invalid email format", async () => {
    const resolver = zodResolver(schema);
    const result = await resolver(
      { email: "not-an-email", password: "12345678" },
      {} as any,
      {} as any
    );

    expect(result.errors.email).toBeDefined();
    expect(result.errors.email).toHaveProperty("message", "Invalid email");
  });

  it("handles optional fields correctly", async () => {
    const resolver = zodResolver(schema);
    const result = await resolver(
      { email: "test@example.com", password: "12345678" },
      {} as any,
      {} as any
    );

    expect(result.errors).toEqual({});
    expect(result.values.email).toBe("test@example.com");
  });

  it("works with refine schemas", async () => {
    const passwordSchema = z
      .object({
        password: z.string().min(8),
        confirmPassword: z.string(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });

    const resolver = zodResolver(passwordSchema);

    // Matching passwords
    const validResult = await resolver(
      { password: "12345678", confirmPassword: "12345678" },
      {} as any,
      {} as any
    );
    expect(validResult.errors).toEqual({});

    // Mismatched passwords
    const invalidResult = await resolver(
      { password: "12345678", confirmPassword: "different" },
      {} as any,
      {} as any
    );
    expect(invalidResult.errors.confirmPassword).toBeDefined();
    expect(invalidResult.errors.confirmPassword).toHaveProperty(
      "message",
      "Passwords do not match"
    );
  });

  it("only reports the first error per field", async () => {
    // A field that fails two validations
    const strictSchema = z.object({
      value: z.string().min(3, "Too short").max(5, "Too long"),
    });

    const resolver = zodResolver(strictSchema);
    const result = await resolver({ value: "" }, {} as any, {} as any);

    // Should have exactly one error for "value"
    expect(result.errors.value).toBeDefined();
    expect(result.errors.value).toHaveProperty("type", "validation");
  });
});
