-- LektieRo 010: tasks as first-class persistent entities.
--
-- A task = one extracted homework problem with optional ordered steps,
-- belonging to a child. Lifecycle:
--   pending        — parent approved, kid hasn't opened it yet
--   in_progress    — kid has at least one session against it
--   done           — kid completed (Færdig). Removed from the active board.
--   dismissed      — parent removed before/after approval. Stays in DB for
--                    history but never shown on the active board.
--
-- approved_by_parent gates visibility for the kid: extracted-but-not-yet
-- approved tasks live in the parent review queue, not on the kid's board.
--
-- Sessions get a nullable task_id FK so the existing one-shot flow keeps
-- working, while board-driven sessions tie back to their task.

create table if not exists public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  child_id            uuid not null references public.children(id) on delete cascade,
  parent_id           uuid not null references public.profiles(id) on delete cascade,
  subject             text not null check (subject in ('matematik','dansk','engelsk','tysk')),
  task_title          text,
  task_text           text not null,
  task_type           text not null default 'task',
  task_goal           text,
  task_steps          jsonb,
  task_context        text,
  needs_paper         boolean,
  source_image_path   text,
  status              text not null default 'pending'
                          check (status in ('pending','in_progress','done','dismissed')),
  approved_by_parent  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  approved_at         timestamptz,
  completed_at        timestamptz,
  dismissed_at        timestamptz
);

create index if not exists tasks_child_id_idx  on public.tasks(child_id);
create index if not exists tasks_parent_id_idx on public.tasks(parent_id);
create index if not exists tasks_board_idx
  on public.tasks(child_id, subject, status)
  where status in ('pending','in_progress') and approved_by_parent;
create index if not exists tasks_pending_review_idx
  on public.tasks(parent_id, created_at desc)
  where approved_by_parent = false and status <> 'dismissed';

-- Auto-bump updated_at.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- Sessions point at the task they're tutoring. Nullable so legacy sessions
-- (pre-board) still validate. ON DELETE SET NULL — deleting a task should
-- preserve session history for the parent overview.
alter table public.sessions
  add column if not exists task_id uuid references public.tasks(id) on delete set null;
create index if not exists sessions_task_id_idx on public.sessions(task_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.tasks enable row level security;

drop policy if exists "tasks parent access" on public.tasks;
create policy "tasks parent access" on public.tasks
  for all
  using  (parent_id = auth.uid())
  with check (parent_id = auth.uid());

drop policy if exists "tasks admin read" on public.tasks;
create policy "tasks admin read" on public.tasks
  for select
  using (public.is_admin());
