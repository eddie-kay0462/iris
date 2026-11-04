import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { describeError } from './describe-error';

// Nothing listens on this localhost port, so the connection is refused
// immediately without touching the network. (fetch blocks well-known ports
// like 9 outright, which would test a different error.)
const DEAD_URL = 'http://127.0.0.1:59999';

describe('describeError', () => {
  it('keeps the cause of a native fetch failure', async () => {
    const err = await fetch(DEAD_URL).catch((e) => e);
    expect(err.message).toBe('fetch failed');
    expect(describeError(err)).toMatch(/^fetch failed — caused by: .*ECONNREFUSED/);
  });

  it('pulls the cause out of a supabase-js error object', async () => {
    const db = createClient(DEAD_URL, 'test-key', { auth: { persistSession: false } });
    const { error } = await db.from('orders').select('id').limit(1);
    expect(error?.message).toBe('TypeError: fetch failed');
    expect(describeError(error)).toMatch(/^TypeError: fetch failed — caused by: .*ECONNREFUSED/);
  });

  it('passes plain errors and non-errors through', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
    expect(describeError('text')).toBe('text');
    expect(describeError(null)).toBe('null');
  });
});
