-- Close the four tables flagged as fully exposed to the anon/publishable key
-- that ships in the browser bundle.
--
-- Safe to lock with no policies because nothing legitimate reaches them
-- through a public key:
--   * approved_quotes_staging - orphaned and empty; submit-quote now writes
--     to quotes_for_review
--   * push_tokens             - unused; the app stores tokens in fcm_tokens
--   * supporter_keys          - only touched by the redeem-support-key edge
--     function, which uses the service role (bypasses RLS)
--   * support_key_redemptions - same
--
-- redeem_key() is SECURITY DEFINER, so it keeps working against support_keys.
--
-- Verified after applying: reads of approved_quotes still return 200, and
-- inserts via the publishable key are rejected with 42501.

alter table public.approved_quotes_staging enable row level security;
alter table public.push_tokens             enable row level security;
alter table public.supporter_keys          enable row level security;
alter table public.support_key_redemptions enable row level security;
