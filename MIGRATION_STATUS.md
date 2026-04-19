# Migrations

| File | Applied to dev (eu-north-1) | Applied to prod | Notes |
|---|---|---|---|
| `supabase/migrations/001_initial.sql` | ☑ | ☑ | profiles + waitlist + trigger + RLS |
| `supabase/migrations/002_children.sql` | ☑ | ☑ | children table + RLS (parent owns, admin reads) |
| `supabase/migrations/003_children_profile.sql` | ☑ | ☑ | adds `interests` + `special_needs` columns for AI personalisation |
| `supabase/migrations/004_admin_rls_fix.sql` | ☑ | ☑ | fixes recursive RLS on admin role checks (CRITICAL — admin promotion silently no-ops without it) |
| `supabase/migrations/005_subscription_tier.sql` | ☑ | ☑ | adds `subscription_tier` to profiles (free/standard/family) to enforce child slot limits |

Run in Supabase SQL editor → paste the file contents → verify `subscription_tier` column appears on `profiles`.

| `supabase/migrations/006_sessions_turns.sql` | ☐ | ☐ | `sessions` + `turns` tables + RLS — **run before going live with AI** |
| `supabase/migrations/007_child_companion.sql` | ☐ | ☐ | `companion_type` on children — kid's chosen animal mascot persisted per-profile |

**To apply 006:** paste contents into Supabase SQL editor (dev first, then prod).
Enables: session tracking, difficulty scoring, parent overview real stats, turn history.

**To apply 007:** same — adds one nullable column. Before it's applied the CompanionContext
falls back to the `lr_companion` cookie, so the flow still works; after it's applied the
choice is saved to the `children` row and shown as the kid's avatar on the profile selector.
