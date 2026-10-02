/**
 * When the current sign-in expires, read from the JWT cookie the login page
 * sets. Client-only (returns null on the server or if the cookie is missing),
 * so call it after mount or from something that only renders on interaction.
 */
export function sessionExpiry(): Date | null {
  if (typeof document === "undefined") return null;
  const token = document.cookie
    .split("; ")
    .find((c) => c.startsWith("iris_jwt="))
    ?.slice("iris_jwt=".length);
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    const exp = JSON.parse(json).exp;
    return typeof exp === "number" ? new Date(exp * 1000) : null;
  } catch {
    return null;
  }
}
