-- 007: per-child companion choice.
--
-- The companion is the animal mascot that follows the kid through the flow.
-- Stored on the `children` row so it persists across devices and is rendered
-- as the child's avatar in the Netflix-style profile selector.
--
-- Valid values are the CompanionType slugs in components/mascot/types.ts.
-- Null = kid hasn't picked yet → CompanionPicker shows on first load.

alter table public.children
  add column if not exists companion_type text
    check (companion_type in (
      'lion', 'fox', 'owl', 'panda', 'octopus', 'robot',
      'unicorn', 'dragon', 'rabbit', 'alien', 'cat', 'polar-bear'
    ));

comment on column public.children.companion_type is
  'Chosen animal companion slug. Matches CompanionType in components/mascot/types.ts. Null = not yet picked.';
