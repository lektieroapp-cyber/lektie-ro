-- LektieRo 002: children table.
-- One parent (profiles row) has many children. No separate `families` table
-- today — the parent IS the family. When multi-parent support lands, we'll
-- introduce a `families` table + `family_members` without disturbing this.

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  grade smallint not null check (grade between 0 and 10),
  avatar_emoji text,
  created_at timestamptz not null default now()
);

create index if not exists children_parent_id_idx on public.children(parent_id);

alter table public.children enable row level security;

-- Parent can read, insert, update, delete their own children.
drop policy if exists "children parent full access" on public.children;
create policy "children parent full access" on public.children
  for all
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

-- Admins can read all for support/debugging.
drop policy if exists "children admin read" on public.children;
create policy "children admin read" on public.children
  for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
