import { describe, it, expect, vi, afterEach } from 'vitest';
import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  afterEach(() => vi.useRealTimers());

  it('shares one load across concurrent misses on the same key', async () => {
    const cache = new TtlCache<number>(1000, 10);
    const load = vi.fn(async () => 1);
    await Promise.all([cache.get('k', load), cache.get('k', load)]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reloads once the entry expires', async () => {
    vi.useFakeTimers();
    const cache = new TtlCache<number>(1000, 10);
    const load = vi.fn(async () => 1);
    await cache.get('k', load);
    vi.advanceTimersByTime(1001);
    await cache.get('k', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('never serves a failed load from cache', async () => {
    const cache = new TtlCache<number>(1000, 10);
    await expect(cache.get('k', async () => { throw new Error('db down'); })).rejects.toThrow();
    await expect(cache.get('k', async () => 2)).resolves.toBe(2);
  });

  it('evicts the oldest key past the size cap', async () => {
    const cache = new TtlCache<number>(1000, 2);
    const load = vi.fn(async () => 1);
    await cache.get('a', load);
    await cache.get('b', load);
    await cache.get('c', load);
    await cache.get('a', load); // evicted, so loaded again
    expect(load).toHaveBeenCalledTimes(4);
  });
});
