-- Add subscription_tier to profiles so we can enforce child slot limits per plan.
--
-- Tiers:
--   free     → 0 children (waitlist / not paying)
--   standard → 1 child   (229 kr/md)
--   family   → 4 children (299 kr/md)
--
-- Admin role is checked separately in the API and bypasses the limit entirely.
-- The families table (multi-parent households) is intentionally deferred — see CLAUDE.md.
-- When payments ship, update this column from the Dodo Payments webhook.

alter table public.profiles
  add column if not exists subscription_tier text
  not null default 'standard'
  check (subscription_tier in ('free', 'standard', 'family'));

comment on column public.profiles.subscription_tier is
  'Subscription plan for this parent. Controls how many children they can add. Updated by payments webhook when billing ships.';
