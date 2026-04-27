-- LektieRo 013: track effective time-on-task per session.
--
-- Before this column the parent overview computed duration as
-- (created_at → now()) for in-progress sessions, so "Aktiv i 39 min" really
-- meant "the page has been open for 39 min" — even when the kid actually
-- engaged for the first 4 min and walked away. That reads as misleading
-- engagement on the parent dashboard.
--
-- `last_active_at` is bumped on every assistant turn (via the progress
-- endpoint) and on session finalisation. The dashboard uses it as the
-- effective end-time for in-progress rows, so the duration reflects the
-- engagement WINDOW (start → last activity) rather than wall-clock time.
--
-- Default = now() so brand-new rows have a sensible value out of the gate;
-- existing pre-013 rows get backfilled to created_at since we have no
-- per-turn record to reconstruct the real last-activity moment.

alter table public.sessions
  add column if not exists last_active_at timestamptz not null default now();

-- Backfill: pre-013 in-flight rows get last_active_at = ended_at when set,
-- otherwise created_at (no further engagement signal available).
update public.sessions
  set last_active_at = coalesce(ended_at, created_at)
  where last_active_at is null
     or last_active_at = '1970-01-01T00:00:00Z';

comment on column public.sessions.last_active_at is
  'Bumped on every assistant turn and on session finalisation. Used by the parent overview to compute time-on-task as last_active_at − created_at instead of now() − created_at.';
