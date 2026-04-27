# Migrations

| File | Applied to dev (eu-north-1) | Applied to prod | Notes |
|---|---|---|---|
| `supabase/migrations/001_initial.sql` | ☑ | ☑ | profiles + waitlist + trigger + RLS |
| `supabase/migrations/002_children.sql` | ☑ | ☑ | children table + RLS (parent owns, admin reads) |
| `supabase/migrations/003_children_profile.sql` | ☑ | ☑ | adds `interests` + `special_needs` columns for AI personalisation |
| `supabase/migrations/004_admin_rls_fix.sql` | ☑ | ☑ | fixes recursive RLS on admin role checks (CRITICAL — admin promotion silently no-ops without it) |
| `supabase/migrations/005_subscription_tier.sql` | ☑ | ☑ | adds `subscription_tier` to profiles (free/standard/family) to enforce child slot limits |
| `supabase/migrations/006_sessions_turns.sql` | ☑ | ? | `sessions` + `turns` tables + RLS. Dev verified 2026-04-23 via REST probe (rows exist). Prod: re-confirm before handover. |
| `supabase/migrations/007_child_companion.sql` | ☑ | ? | `companion_type` on children. Dev verified 2026-04-23 via REST probe (column exists). Prod: re-confirm before handover. |
| `supabase/migrations/008_drop_session_mode.sql` | ☑ | ? | drops `sessions.mode` — explain/hint distinction gone from UI + prompt. Applied on dev 2026-04-24. Prod: re-apply after the code change (stop-writing-mode) is deployed. |
| `supabase/migrations/009_session_insights.sql` | ☑ | ? | adds `steps_done`, `steps_total`, `completion_kind`, `concepts_solid[]`, `concepts_struggled[]`, `insights jsonb`, `analyzed_at` to sessions. Required before /api/session/analyze runs in prod — without it the post-session insight call writes no-op. GIN indexes on concept arrays for the parent-dashboard aggregation. Applied on dev 2026-04-27. |
| `supabase/migrations/010_tasks.sql` | ☑ | ? | `tasks` table (board) + `sessions.task_id` FK + RLS. Lifecycle pending → in_progress → done/dismissed. `approved_by_parent` gates kid visibility. Required for the new Tavle/Ny opgave flow. Applied on dev 2026-04-27. |
| `supabase/migrations/011_accommodations.sql` | ☑ | ? | adds `children.accommodations text[]` for structured accommodation flags (`dyslexia`, `adhd`). Free-text `special_needs` stays. Drives the kid-facing reading-mode (larger text). Validation lives at the `/api/children` PATCH edge — no DB CHECK so adding new flags later is just a code change. Applied on dev 2026-04-27. |

Run in Supabase SQL editor → paste the file contents → verify the new columns / tables appear.

Quick dev-check (runs against whatever `.env.local` points at):

```bash
node --env-file=.env.local -e "
const u = process.env.NEXT_PUBLIC_SUPABASE_URL, k = process.env.SUPABASE_SERVICE_ROLE_KEY;
['sessions','turns'].forEach(t => fetch(u+'/rest/v1/'+t+'?select=id&limit=1',{headers:{apikey:k,Authorization:'Bearer '+k}}).then(r=>r.text()).then(b=>console.log(t,b.slice(0,120))));
fetch(u+'/rest/v1/children?select=companion_type&limit=1',{headers:{apikey:k,Authorization:'Bearer '+k}}).then(r=>r.text()).then(b=>console.log('companion_type',b.slice(0,120)));
"
```

200 + a row = applied. 404 / missing-column error = not applied.
