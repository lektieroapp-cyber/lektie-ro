-- LektieRo 009: session-level progress fields + post-session insights.
--
-- The PATCH /api/session endpoint already accepts stepsDone / stepsTotal /
-- completionKind from the client (HintChat's CompletionStatus) but until
-- now silently dropped them. Persisting them lets the parent overview
-- show "3/4 trin klaret" per session and gives the analyze pass a clean
-- progress signal that doesn't depend on parsing turns.
--
-- The insights columns power the post-processing analysis pass:
--   - `concepts_solid`     — flat array of curriculum concepts the kid
--                            handled confidently. Aggregated across sessions
--                            to surface "Strong areas" on the parent dashboard.
--   - `concepts_struggled` — same shape, for "Areas to focus on".
--   - `insights`           — raw structured JSON from the analysis call
--                            (summary, patterns, next-focus suggestion).
--                            Kept separate so we can iterate the prompt
--                            without churning the schema each time.
--
-- All new columns are nullable so old rows keep working and the analyze
-- pipeline is allowed to skip sessions (e.g. 0-turn rows that were never
-- engaged with).

alter table public.sessions
  add column if not exists steps_done       smallint,
  add column if not exists steps_total      smallint,
  add column if not exists completion_kind  text
    check (completion_kind in ('completed', 'partial', 'abandoned')),
  add column if not exists concepts_solid     text[],
  add column if not exists concepts_struggled text[],
  add column if not exists insights         jsonb,
  add column if not exists analyzed_at      timestamptz;

-- GIN index on the flat concept arrays so per-child / per-subject
-- aggregation queries stay cheap as the table grows.
create index if not exists sessions_concepts_solid_idx
  on public.sessions using gin (concepts_solid);
create index if not exists sessions_concepts_struggled_idx
  on public.sessions using gin (concepts_struggled);
