-- Lets an authenticated user delete their own Supabase Auth account.
-- A client can never do this directly -- auth.users is off-limits to
-- anon/authenticated -- so this runs as the function owner (security
-- definer) to get that privilege, but is hard-scoped to auth.uid(): there
-- is no way to pass a target id, so it can only ever delete the caller's
-- own account. search_path is locked down since security definer
-- functions are a classic target for search-path hijacking.
--
-- Deletes the caller's app-data rows first, then the auth.users row
-- itself, all in one transaction -- if anything fails, nothing is
-- deleted, rather than leaving the account half gone (which is what the
-- previous client-side version could do: it deleted app data first, and
-- only found out afterwards that the account deletion itself didn't
-- exist as an RPC at all).
--
-- Applied directly to sparklab-apps (zckbrbqxnibzmuesqsok) on 2026-09-23;
-- this file brings the migration history in sync with that.
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

  delete from quotes.favorite_quotes where user_id = uid;
  delete from quotes.notification_preferences where user_id = uid;
  delete from quotes.fcm_tokens where user_id = uid;
  delete from quotes.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function quotes.delete_user() from public;
revoke all on function quotes.delete_user() from anon;
grant execute on function quotes.delete_user() to authenticated;
