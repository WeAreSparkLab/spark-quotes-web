-- PROPOSED, NOT APPLIED. Review, then move to supabase/migrations/ to apply.
--
-- Found while testing the security rules on 2026-11-12 (all tests were run
-- as simulated users inside rolled-back transactions):
--
-- 1. Any signed-in user can set is_supporter = true on their own profile.
--    The "update own" / "insert own" policies check the row belongs to the
--    caller but not which columns change, and the schema-wide default grants
--    give authenticated users UPDATE on every column. Impact today is only
--    the "Supporter" badge in Settings (supporter keys are switched off), but
--    it would matter the moment supporter status unlocks anything.
--    Fix: let browsers write only the id (all the app's ensureProfile upsert
--    needs). is_supporter stays writable by the redeem-support-key edge
--    function, which uses the service role.
--
-- 2. delete_user() removes favourites, reminders, device tokens and the
--    profile, but not rows in four other tables that point at the user.
--    Three of them have foreign keys to auth.users / profiles, so if any such
--    row existed, deleting the account would fail. All four are empty today,
--    which is why it works; this makes it hold as the app grows.
--
-- 3. favorite_quotes has no unique (user_id, quote_id). The app checks before
--    inserting, but a double tap can race past that check. No duplicates exist
--    today, so the constraint can be added safely.

begin;

-- 1. Supporter flag
revoke insert, update on quotes.profiles from anon, authenticated;
grant insert (id) on quotes.profiles to authenticated;
grant update (id, updated_at) on quotes.profiles to authenticated;

-- 2. Complete account deletion
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
  delete from quotes.favorites where user_id = uid;
  delete from quotes.notification_preferences where user_id = uid;
  delete from quotes.fcm_tokens where user_id = uid;
  delete from quotes.expo_push_tokens where user_id = uid;
  -- Pending submissions are the user's own words; approved ones already live
  -- on as quotes and are not tied to the account.
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

-- 3. One favourite per quote per person
alter table quotes.favorite_quotes
  add constraint favorite_quotes_user_quote_key unique (user_id, quote_id);

commit;
