-- LektieRo — Step 1 schema: parent accounts, roles, waitlist.
-- Lazy by design: families/children/sessions arrive in Step 2 when needed.

create extension if not exists "citext";

-- ───────────────────────────────────────────────────────────────
-- Enum for application-level roles (extend via ALTER TYPE later).
-- ───────────────────────────────────────────────────────────────
do $$ begin
  create type public.user_role as enum ('parent', 'admin');
exception
  when duplicate_object then null;
end $$;

-- ───────────────────────────────────────────────────────────────
-- profiles — 1:1 with auth.users, created by trigger on signup.
-- ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'parent',
  display_name text,
  created_at timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- waitlist — pre-signup email capture.
-- ───────────────────────────────────────────────────────────────
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  locale text not null default 'da',
  source text,
  created_at timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- Trigger: mirror auth.users insert into public.profiles.
-- ───────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────────────────────────────────────────
-- RLS
-- ───────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.waitlist enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles admin read" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "waitlist admin read" on public.waitlist;
create policy "waitlist admin read" on public.waitlist
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
-- Writes to waitlist only via service-role key (API route).
