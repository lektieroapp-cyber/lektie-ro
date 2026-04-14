-- 004: Fix RLS infinite-recursion on admin role checks.
--
-- The original "admin read" policies in 001 / 002 query public.profiles inside
-- a policy ON public.profiles (and similar for waitlist/children). Postgres
-- detects this as recursive and either errors silently or returns no rows —
-- meaning admin role lookups silently fail and the app treats the user as a
-- regular parent.
--
-- Fix: extract the admin check into a SECURITY DEFINER function so it runs
-- with the function owner's privileges (bypassing RLS) and the recursion is
-- broken.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  )
$$;

-- Profiles
drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles admin read" on public.profiles
  for select using (public.is_admin());

-- Waitlist
drop policy if exists "waitlist admin read" on public.waitlist;
create policy "waitlist admin read" on public.waitlist
  for select using (public.is_admin());

-- Children
drop policy if exists "children admin read" on public.children;
create policy "children admin read" on public.children
  for select using (public.is_admin());
