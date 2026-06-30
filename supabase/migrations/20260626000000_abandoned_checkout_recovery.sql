-- Abandoned checkout recovery: track recovery-email sends, secure recovery links,
-- and conversions so we can compute a recovery rate.

alter table checkout_sessions
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists recovery_token   uuid not null default gen_random_uuid(),
  add column if not exists recovered_at      timestamptz;

-- Cron scans open sessions that haven't been reminded yet, ordered by idle time.
create index if not exists checkout_sessions_pending_reminder
  on checkout_sessions (updated_at)
  where status = 'open' and reminder_sent_at is null;

-- Recovery links are looked up by token.
create unique index if not exists checkout_sessions_recovery_token
  on checkout_sessions (recovery_token);
