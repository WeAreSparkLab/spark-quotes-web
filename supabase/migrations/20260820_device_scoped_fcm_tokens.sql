-- An FCM token identifies a browser, not a user, but the table allowed the
-- same token under several user_ids (and a user to hold several tokens for
-- the same browser). The cron sends to every token of every scheduled user,
-- so one desktop was receiving the same notification two or three times.
delete from public.fcm_tokens a
using public.fcm_tokens b
where a.token = b.token
  and (a.updated_at < b.updated_at
       or (a.updated_at = b.updated_at and a.id < b.id));

alter table public.fcm_tokens drop constraint if exists fcm_tokens_user_id_token_key;
alter table public.fcm_tokens add constraint fcm_tokens_token_key unique (token);

-- A client-generated device_id makes registration idempotent per browser:
-- re-registering updates that device's row instead of adding another.
alter table public.fcm_tokens add column if not exists device_id text;

create unique index if not exists fcm_tokens_user_device_key
  on public.fcm_tokens (user_id, device_id)
  where device_id is not null;

-- Tokens only refresh when the app is opened, so anything this stale belongs
-- to a browser that has not been back in months. Real devices re-register
-- automatically on next open.
delete from public.fcm_tokens where updated_at < timestamptz '2026-08-01';
