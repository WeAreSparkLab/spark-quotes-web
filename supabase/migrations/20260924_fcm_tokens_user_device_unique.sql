-- The client upserts fcm_tokens with onConflict 'user_id,device_id'. PostgREST
-- can't target a partial index, so the earlier partial unique index never
-- matched, and on sparklab-apps it was missing entirely: every token insert
-- failed with "no unique or exclusion constraint matching the ON CONFLICT
-- specification". A plain unique constraint works; rows with a null device_id
-- never conflict with each other.
-- Apply to sparklab-apps (zckbrbqxnibzmuesqsok).
drop index if exists quotes.fcm_tokens_user_device_key;

alter table quotes.fcm_tokens
  add constraint fcm_tokens_user_device_key unique (user_id, device_id);
