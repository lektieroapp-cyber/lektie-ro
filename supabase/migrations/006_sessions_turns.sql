-- LektieRo 006: sessions + turns tables.
--
-- sessions  — one row per homework session (one photo → one help conversation).
--             Created when a child picks a mode (explain / hint).
--             Completed when the child confirms they're done.
--
-- turns     — each message in the session conversation.
--             Recorded so we can build history views and compute difficulty.
--
-- difficulty_score is derived server-side when completing:
--   1 = understood quickly (≤2 assistant turns)
--   2 = a little help needed (3-4 turns)
--   3 = quite hard (5-6 turns)
--   4 = very hard (7+ turns, completed)
--   5 = gave up (not completed, 4+ turns)

create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references public.children(id) on delete cascade,
  parent_id     uuid not null references public.profiles(id) on delete cascade,
  subject       text not null,
  grade         smallint not null,
  problem_text  text,
  problem_type  text,
  image_path    text,
  mode          text not null default 'hint'
                  check (mode in ('explain', 'hint')),
  turn_count    smallint not null default 0,
  completed     boolean not null default false,
  difficulty_score smallint check (difficulty_score between 1 and 5),
  created_at    timestamptz not null default now(),
  ended_at      timestamptz
);

create index if not exists sessions_child_id_idx  on public.sessions(child_id);
create index if not exists sessions_parent_id_idx on public.sessions(parent_id);
create index if not exists sessions_created_at_idx on public.sessions(created_at desc);

create table if not exists public.turns (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists turns_session_id_idx on public.turns(session_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table public.sessions enable row level security;
alter table public.turns    enable row level security;

-- Parents read/write their own children's sessions.
drop policy if exists "sessions parent access" on public.sessions;
create policy "sessions parent access" on public.sessions
  for all
  using  (parent_id = auth.uid())
  with check (parent_id = auth.uid());

-- Admins can read everything for support.
drop policy if exists "sessions admin read" on public.sessions;
create policy "sessions admin read" on public.sessions
  for select
  using (public.is_admin());

-- Turns follow session access (parent sees turns for their sessions).
drop policy if exists "turns parent read" on public.turns;
create policy "turns parent read" on public.turns
  for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.parent_id = auth.uid()
    )
  );

drop policy if exists "turns admin read" on public.turns;
create policy "turns admin read" on public.turns
  for select
  using (public.is_admin());
