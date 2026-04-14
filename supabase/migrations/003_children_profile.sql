-- 003: richer child profile data for AI personalisation.
--
-- `interests` + `special_needs` are soft signals fed into the Stage-2 hint
-- prompt so the AI can adjust tone, examples, and pacing to the kid.
--   - interests: free-form, comma-or-spaces list ("Minecraft, fodbold, heste")
--   - special_needs: free-form, optional ("ordblind", "ADHD", "let sensitiv til...")
--
-- Both nullable — no personalisation data is acceptable, just less tailored.

alter table public.children
  add column if not exists interests text,
  add column if not exists special_needs text;

comment on column public.children.interests is
  'Free-form list of interests the AI can use to theme examples. Optional.';
comment on column public.children.special_needs is
  'Free-form pedagogical considerations (dyslexia, ADHD, etc.). Optional.';
