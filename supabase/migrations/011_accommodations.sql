-- LektieRo 011: structured accommodations on children.
--
-- The free-text special_needs column stays for narrative notes
-- ("foretrækker korte sætninger, brug for korte pauser"). The new
-- accommodations array carries machine-readable flags the app reacts
-- to:
--   dyslexia  — kid-facing surfaces render with larger/clearer text.
--   adhd      — reserved for future tuning (no behaviour change yet).
--
-- Empty array = no flags. Default-empty is intentional so existing rows
-- aren't silently re-tagged.

alter table public.children
  add column if not exists accommodations text[] not null default '{}';

-- Sanity-check supported values without locking us into a hard CHECK
-- constraint (so adding a new flag later doesn't require ALTER TABLE
-- + downtime). Validation happens at the API edge.
comment on column public.children.accommodations is
  'Structured accommodation flags. Known values: dyslexia, adhd. Validated by /api/children PATCH.';
