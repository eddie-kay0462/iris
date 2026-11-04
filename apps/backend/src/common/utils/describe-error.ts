/**
 * One-line description of an error that keeps the underlying network cause.
 *
 * Node's fetch rejects with a bare `TypeError: fetch failed`; the reason that
 * actually matters (DNS failure, refused connection, timeout, TLS) is on
 * `err.cause`. supabase-js turns that rejection into a PostgREST error object
 * whose `message` is still just "TypeError: fetch failed" and whose `details`
 * carries a "Caused by: ..." line. Logging `err.message` alone throws both
 * away, which leaves every outage reading as the same unhelpful string.
 */
export function describeError(err: unknown): string {
  if (err == null) return String(err);
  if (typeof err !== 'object') return String(err);

  const e = err as { message?: unknown; details?: unknown; cause?: unknown };
  const parts: string[] = [typeof e.message === 'string' ? e.message : String(err)];

  // Native Error cause chain (fetch → undici error, possibly nested).
  let cause = e.cause;
  for (let depth = 0; cause && depth < 3; depth++) {
    const c = cause as { message?: unknown; code?: unknown; cause?: unknown };
    const msg = typeof c.message === 'string' ? c.message : String(cause);
    parts.push(`caused by: ${msg}${c.code ? ` (${String(c.code)})` : ''}`);
    cause = c.cause;
  }

  // supabase-js / PostgREST error object: the cause lives in `details`.
  if (!e.cause && typeof e.details === 'string') {
    const line = e.details.split('\n').find((l) => l.startsWith('Caused by:'));
    if (line) parts.push(line.replace(/^Caused by:\s*/, 'caused by: '));
  }

  return parts.join(' — ');
}
