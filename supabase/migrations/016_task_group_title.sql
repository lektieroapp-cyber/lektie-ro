-- LektieRo 016: bundle title — kid-facing name for a multi-task submission.
--
-- Migration 015 added task_group_id (the shared uuid that ties sibling tasks
-- together). Tavle now renders the bundle as one expandable card on the
-- board, but the headline is still the static "N opgaver fra ét lektiebillede"
-- placeholder — not scannable when a parent has several photos in the
-- pile. 016 adds an optional title that:
--
--   1. The vision extractor can suggest at upload time ("Subtraktion side
--      16", "Fodbold-økonomi"), and
--   2. The parent can edit before committing the bundle.
--
-- Stored denormalised on every sibling row so a single SELECT on tasks
-- carries everything Tavle needs — no extra round-trip to a groups table.
-- Same shape as the task_group_id rationale in 015. If we ever need richer
-- bundle metadata (cover photo, parent note, due date) we'll promote to
-- a real groups table and back-fill from this column.

alter table public.tasks
  add column if not exists task_group_title text;
