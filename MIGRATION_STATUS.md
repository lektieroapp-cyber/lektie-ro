# Migrations

| File | Applied to dev (eu-north-1) | Applied to prod | Notes |
|---|---|---|---|
| `supabase/migrations/001_initial.sql` | ☑ | ☑ | profiles + waitlist + trigger + RLS |
| `supabase/migrations/002_children.sql` | ☑ | ☑ | children table + RLS (parent owns, admin reads) |
| `supabase/migrations/003_children_profile.sql` | ☑ | ☑ | adds `interests` + `special_needs` columns for AI personalisation |
| `supabase/migrations/004_admin_rls_fix.sql` | ☑ | ☑ | fixes recursive RLS on admin role checks (CRITICAL — admin promotion silently no-ops without it) |
| `supabase/migrations/005_subscription_tier.sql` | ☑ | ☑ | adds `subscription_tier` to profiles (free/standard/family) to enforce child slot limits |

Run in Supabase SQL editor → paste the file contents → verify `subscription_tier` column appears on `profiles`.

Next migrations needed (Phase 2):
- `006_sessions.sql` — `sessions` + `turns` tables (needed before Azure AI integration)
