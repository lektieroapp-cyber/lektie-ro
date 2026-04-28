-- LektieRo 017: persist per-step expected answers (parent preview).
--
-- Vision extractor already returns `expectedAnswers` per task (the value
-- the AI thinks the kid should arrive at for each step). Until now this
-- was preview-only — surfaced in the AddToBoardForm review queue for
-- the admin to spot-check, then dropped before the task was saved.
--
-- Storing it on the row lets the parent task detail page render the
-- assumed answer next to each step, so a parent can verify "did the AI
-- read the page correctly" days after the upload, not just at curate
-- time. Also useful as tutor reference if we ever want to feed it back
-- into the hint prompt.
--
-- jsonb (not text[]) so we can keep the index-aligned-with-steps shape
-- the extractor produces, including empty strings for unreadable items
-- without losing position. Nullable — pre-017 tasks just won't render
-- the answer column.

alter table public.tasks
  add column if not exists task_expected_answers jsonb;
