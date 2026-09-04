/**
 * Reading messages off a thrown error.
 *
 * `apiClient` attaches the parsed response body to the error as `data`, which
 * is where Nest puts its `message` (a string, or an array of strings when
 * class-validator rejects a payload) and its `error`. A failed request never
 * gets that far though — a dropped connection throws a plain TypeError with
 * nothing but `message` — so both shapes have to be read defensively.
 */

type ApiErrorBody = { message?: unknown; error?: unknown };

function bodyOf(err: unknown): ApiErrorBody | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const { data } = err as { data?: unknown };
  return typeof data === "object" && data !== null ? (data as ApiErrorBody) : undefined;
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined;
  // Nest returns an array of strings for validation failures.
  if (Array.isArray(value)) {
    const parts = value.filter((v): v is string => typeof v === "string" && v !== "");
    return parts.length > 0 ? parts.join(", ") : undefined;
  }
  return undefined;
}

/** The message the API sent back in its response body, if it sent a usable one. */
export function apiErrorMessage(err: unknown): string | undefined {
  const body = bodyOf(err);
  return asText(body?.message) ?? asText(body?.error);
}

/**
 * The thrown error's own message — what you get from a network failure, as
 * opposed to a request the server actually rejected.
 */
export function thrownMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message || undefined;
  if (typeof err !== "object" || err === null) return undefined;
  return asText((err as { message?: unknown }).message);
}
