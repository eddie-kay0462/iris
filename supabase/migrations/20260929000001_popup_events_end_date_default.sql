-- A single-day pop-up ends on the day it starts. Until now its end_date was left
-- null and every reader fell back to event_date; the API now saves both ends of
-- the range, so bring the existing rows in line.
--
-- This also covers multi-day pop-ups whose end date was lost: createEvent never
-- saved end_date, so those rows are indistinguishable from single-day ones and
-- already behave as single-day. Filling end_date in changes nothing about when
-- they close; their real end dates have to be set again by hand.

update public.popup_events
set end_date = event_date
where end_date is null
  and event_date is not null;
