-- Default was five notifications a day (09:00, 12:00, 15:00, 18:00, 21:00),
-- which is how apps get muted. One a day at 09:00 is the promise the in-app
-- prompt makes; anyone who wants more can add slots in Settings.
--
-- Existing rows are left alone — those are deliberate user choices.
alter table public.notification_preferences
  alter column times set default array['09:00']::text[];
