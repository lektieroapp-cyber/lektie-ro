# Migrations

| File | Applied to dev (eu-north-1) | Applied to prod | Notes |
|---|---|---|---|
| `supabase/migrations/001_initial.sql` | ☐ | ☐ | profiles + waitlist + trigger + RLS |
| `supabase/migrations/002_children.sql` | ☐ | ☐ | children table + RLS (parent owns, admin reads) |
| `supabase/migrations/003_children_profile.sql` | ☐ | ☐ | adds `interests` + `special_needs` columns for AI personalisation |

Apply by pasting SQL into Supabase SQL editor, or run `npx supabase db push` if the CLI is linked. Tick the boxes above once applied and commit.
