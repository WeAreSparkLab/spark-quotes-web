-- Records what happened to each notification attempt.
--
-- Delivery failures have so far been invisible: the cron runs on Vercel and
-- its logs are not reachable from here, so diagnosing "nothing arrived" meant
-- guessing. Writing outcomes here makes it answerable from the database.
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz not null default now(),
  user_id uuid,
  token_prefix text,
  status text not null,          -- 'sent' | 'failed'
  error text,                    -- FCM's message when it refuses
  quote_preview text
);

create index if not exists notification_log_sent_at_idx
  on public.notification_log (sent_at desc);

-- Service role only: the cron writes it, nobody reads it from the browser.
alter table public.notification_log enable row level security;
