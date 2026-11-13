-- PROPOSED, NOT APPLIED. The Spark Journal.
--
-- One table for private journal entries: a reflection (optionally about a
-- quote) or a small intention for the day.
--
-- Privacy:
--   * Row-level security: a person can read, add, change and delete only
--     their own entries. Logged-out visitors (anon) have no access at all.
--   * user_id defaults to the signed-in user and is checked on every write,
--     so an entry can never be filed under someone else.
--   * Deleting an account deletes its entries (on delete cascade, and
--     delete_user() is updated to say so explicitly).
--   * Entries are never sent to any AI service. Nothing in the app reads
--     them except the Journal screen for their owner.
--   * As with favourites, the database owner (you, via the Supabase
--     dashboard or service key) can technically see rows. See the note in
--     the chat about end-to-end encryption if that matters.

begin;

create table quotes.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('reflection', 'intention')),
  body text not null check (char_length(body) between 1 and 2000),
  -- the quote it was written about, copied so the entry still reads right
  -- if the quote is later edited or removed
  quote_id text,
  quote_text text check (quote_text is null or char_length(quote_text) <= 500),
  quote_author text check (quote_author is null or char_length(quote_author) <= 120),
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index journal_entries_user_created_idx on quotes.journal_entries (user_id, created_at desc);

alter table quotes.journal_entries enable row level security;

-- The schema grants table access to the browser keys by default; take it
-- back from anon entirely, and give signed-in users only what they need.
revoke all on quotes.journal_entries from anon, authenticated;
grant select, insert, delete on quotes.journal_entries to authenticated;
grant update (body, updated_at) on quotes.journal_entries to authenticated;

create policy "journal select own" on quotes.journal_entries
  for select to authenticated using (user_id = auth.uid());
create policy "journal insert own" on quotes.journal_entries
  for insert to authenticated with check (user_id = auth.uid());
create policy "journal update own" on quotes.journal_entries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "journal delete own" on quotes.journal_entries
  for delete to authenticated using (user_id = auth.uid());

-- Account deletion: say it explicitly as well as relying on the cascade.
create or replace function quotes.delete_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from quotes.journal_entries where user_id = uid;
  delete from quotes.favorite_quotes where user_id = uid;
  delete from quotes.favorites where user_id = uid;
  delete from quotes.notification_preferences where user_id = uid;
  delete from quotes.fcm_tokens where user_id = uid;
  delete from quotes.expo_push_tokens where user_id = uid;
  delete from quotes.quotes_for_review where submitted_by_user_id = uid and status = 'pending';
  update quotes.quotes_for_review set submitted_by_user_id = null where submitted_by_user_id = uid;
  update quotes.quote_reports set reported_by_user_id = null where reported_by_user_id = uid;
  update quotes.support_keys set redeemed_by = null where redeemed_by = uid;
  update quotes.supporter_keys set used_by = null where used_by = uid;
  delete from quotes.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function quotes.delete_user() from public;
revoke all on function quotes.delete_user() from anon;
grant execute on function quotes.delete_user() to authenticated;

commit;
