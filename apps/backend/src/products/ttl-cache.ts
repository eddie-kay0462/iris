/**
 * A small in-process cache for public catalog reads.
 *
 * Each API replica keeps its own copy, so there's no cross-replica
 * invalidation: an admin edit shows up once the entry expires. Keep the TTL
 * short. The storefront already holds product lists for minutes on the client
 * side, so a few seconds of server-side staleness is never what a shopper sees.
 *
 * Entries hold the in-flight promise, not the settled value, so a burst of
 * identical requests on a cold key shares one database round trip. A rejected
 * load is dropped immediately so an error is never served from cache.
 */
export class TtlCache<T> {
  private entries = new Map<string, { expires: number; value: Promise<T> }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
  ) {}

  get(key: string, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.entries.get(key);
    if (hit && hit.expires > now) return hit.value;

    const value = load();
    this.entries.delete(key);
    this.entries.set(key, { expires: now + this.ttlMs, value });
    value.catch(() => {
      if (this.entries.get(key)?.value === value) this.entries.delete(key);
    });

    // Search terms make the key space unbounded; drop the oldest insertions.
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string;
      this.entries.delete(oldest);
    }

    return value;
  }
}
