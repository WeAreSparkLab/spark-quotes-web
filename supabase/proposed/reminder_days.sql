-- PROPOSED, NOT APPLIED.
--
-- "Which days" in Settings has never had any effect: the chosen days are
-- only stored on the device, and api/send-notifications.js never looks at
-- days. Someone who unticks Saturday still gets a Saturday quote.
--
-- This adds the column the notification job needs. Every existing row gets
-- all seven days, so nobody's reminders change when it is applied.
--
-- Needs two code changes, shipped in the same release, after this is applied:
--   1. app/settings.tsx: save and load `days` with `times` (as 'Mon'..'Sun').
--   2. api/send-notifications.js: skip a user when their local weekday
--      (in their saved timezone) is not in `days`.
-- If the code shipped first, saving Settings would fail on the unknown column.

alter table quotes.notification_preferences
  add column if not exists days text[] not null
  default array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
