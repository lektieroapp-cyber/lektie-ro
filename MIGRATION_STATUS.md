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
