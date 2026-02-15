import type { FieldValues } from "react-hook-form";
import type { ZodType, ZodError } from "zod";

/**
 * Custom Zod resolver for react-hook-form.
 * Avoids the need for @hookform/resolvers dependency.
 */
export function zodResolver<T extends FieldValues>(schema: ZodType<T>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (values: any) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const zodError = result.error as ZodError;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors: Record<string, any> = {};

    for (const issue of zodError.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) {
        errors[path] = {
          type: "validation",
          message: issue.message,
        };
      }
    }

    return { values: {}, errors };
  };
}
