-- Moderation queue for user-submitted quotes.
--
-- Previously submit-quote wrote to approved_quotes_staging, a three-column
-- table with RLS disabled and no link to approved_quotes, so submissions
-- never reached the app and could not be moderated. This moves submissions
-- into quotes_for_review and adds an explicit approve/reject step.

-- 1. Close the moderation bypass: any logged-in user could insert straight
--    into approved_quotes, skipping review entirely.
drop policy if exists "Allow authenticated user to insert into approved quotes" on public.approved_quotes;

-- 2. Remove the permissive insert policy on quotes_for_review. Policies are
--    OR'd, so a with_check of `true` overrode the one that pins
--    submitted_by_user_id to the caller, letting rows be attributed to anyone.
drop policy if exists "submit quote (insert only)" on public.quotes_for_review;

-- 3. Let a user read back their own submissions. Needed for real rate
--    limiting (counting recent rows) and lets them see pending status.
drop policy if exists "qfr_select_own" on public.quotes_for_review;
create policy "qfr_select_own"
  on public.quotes_for_review
  for select
  to authenticated
  using (submitted_by_user_id = auth.uid());

-- 4. Index supporting the rate-limit lookup.
create index if not exists quotes_for_review_submitter_created_idx
  on public.quotes_for_review (submitted_by_user_id, created_at desc);

-- 5. Approve a pending submission: copy into approved_quotes and mark it.
create or replace function public.approve_quote(review_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into approved_quotes (text, author, category, original_submission_id)
  select text, author, category, id
    from quotes_for_review
   where id = review_id
     and status = 'pending'
  returning id into new_id;

  if new_id is null then
    raise exception 'No pending quote with id %', review_id;
  end if;

  update quotes_for_review
     set status = 'approved', updated_at = now()
   where id = review_id;

  return new_id;
end;
$$;

-- 6. Reject a pending submission.
create or replace function public.reject_quote(review_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotes_for_review
     set status = 'rejected', updated_at = now()
   where id = review_id
     and status = 'pending';

  if not found then
    raise exception 'No pending quote with id %', review_id;
  end if;
end;
$$;

-- These bypass RLS by design, so keep them out of reach of the public keys
-- that ship in the browser bundle.
revoke all on function public.approve_quote(uuid) from public, anon, authenticated;
revoke all on function public.reject_quote(uuid) from public, anon, authenticated;

-- 7. Convenience view for the moderation queue.
create or replace view public.pending_quotes as
select id, text, author, category, submitted_by_user_id, created_at
  from quotes_for_review
 where status = 'pending'
 order by created_at desc;

revoke all on public.pending_quotes from anon, authenticated;
