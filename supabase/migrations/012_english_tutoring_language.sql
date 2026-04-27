-- LektieRo 012: parent-controlled tutoring language for engelsk tasks.
--
-- For Danish kids early in school, English homework needs Danish
-- scaffolding ("Hvad betyder 'green'? Det er den farve på græs.").
-- For older kids, the AI should answer mostly IN English to give them
-- exposure ("Right, three is green. What colour is four?").
--
-- Values:
--   auto    — resolved from grade at the API edge (≤4 → danish, ≥5 → english)
--   danish  — narrate in Danish, English only inside quotes (today's behaviour)
--   english — narrate in English, Danish only when scaffolding a stuck kid
--
-- Default 'auto' so existing rows pick up the grade-based default without
-- a parent ever having to touch the setting.

alter table public.children
  add column if not exists english_tutoring_language text not null default 'auto';

comment on column public.children.english_tutoring_language is
  'Engelsk tutoring language preference. Known values: auto, danish, english. Validated by /api/children PATCH.';
