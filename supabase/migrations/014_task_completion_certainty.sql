-- LektieRo 014: per-task completion certainty.
--
-- The vision extractor sets this on every task it returns based on how
-- sure it is about the completion criteria:
--   high   = clean checklist (math a/b/c, grammar with answer key)
--   medium = enumerable but uncertain (picture crossword, blurry rows)
--   low    = open-ended (creative writing, interview, free conversation)
--
-- The tutor prompt branches on this so a "low" task lets the kid signal
-- done with no friction, while a "high" task can hold them to all steps.
-- Defaults to "medium" — the safe middle that trusts the kid without
-- being too lenient on rigorous tasks.
--
-- Validated at the API edge (no DB CHECK) so adding a new tier later is
-- a code change, not a migration.

alter table public.tasks
  add column if not exists completion_certainty text not null default 'medium';

comment on column public.tasks.completion_certainty is
  'Vision-extractor confidence in the task''s completion criteria. Known values: high, medium, low. Used by the AI tutor to scope completion friction. Validated at the /api/tasks edge.';
