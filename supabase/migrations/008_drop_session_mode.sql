-- LektieRo 008: drop the sessions.mode column.
--
-- The kid flow went pickTask → hint directly starting 2026-04-23 — the
-- ModeSelector step that produced "explain" rows was removed from the
-- live UI, and the explain-mode prompt path was deleted entirely in the
-- 2026-04-24 refactor. Every new session writes mode="hint", so the
-- column carries no signal.
--
-- Dropping instead of "keep but ignore" because:
--   1. RLS + parent reads no longer filter by mode.
--   2. The overview UI has dropped the "Forstå / Hint" label.
--   3. Legacy "explain" rows aren't meaningfully different — the same
--      Socratic prompt now handles both orientation and guidance.
--
-- This is reversible: add the column back with default 'hint' if needed.
-- No data loss beyond the historical explain/hint label.

alter table public.sessions
  drop column if exists mode;
