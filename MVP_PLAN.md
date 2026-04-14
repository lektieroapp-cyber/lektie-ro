# LektieRo — MVP plan (v1)

Maps the freelance contract scope (April 2026) to concrete implementation steps. Aligned with the 3-phase payment schedule (5k / 12.5k / 12.5k).

Legend: ✅ done in Step 1 · 🟡 partial · ⬜ todo

---

## Status snapshot (after Step 1)

| Contract item | Status | Where |
|---|---|---|
| Discovery & arkitektur alignment | ✅ | `CLAUDE.md` + `C:\Users\Daniel\.claude\plans\foamy-juggling-unicorn.md` |
| Projekt-skelet | ✅ | Next.js 16 + Tailwind v4 + TS |
| Supabase konto (eu-north-1) | ✅ | env + migration wired |
| Azure OpenAI konto | ⬜ | phase 2 |
| Vercel + DNS + domæne | ⬜ | phase 1 (below) |
| Database schema | 🟡 | `profiles`, `waitlist` done; `families`/`children`/`sessions`/`turns` needed in phase 2 |
| Landingsside (lektiero.dk) | ✅ | `/da` |
| Waitlist → Supabase | ✅ | `/api/waitlist` + `public.waitlist` |
| Resend opsætning | 🟡 | lib ready; domain + audience needed for waitlist capture + Parent Coach email |
| Login flow (Supabase e-mail) | ✅ | `/da/login` `/da/signup` + Google OAuth |
| Mobilvenlig foto-upload | ⬜ | phase 2 |
| AI billedanalyse (Azure vision) | ⬜ | phase 2 |
| Flere opgaver pr. billede | ⬜ | phase 2 |
| Hint-flow (Socratic, streaming) | ⬜ | phase 2 |
| Prompt engineering (Fælles Mål) | ⬜ | phase 2–3 iterative |
| Parent Coach email efter session | ⬜ | phase 3 |
| Forældre-indblik | 🟡 | auth-gated placeholder; needs sessions feed |
| Test & polish | ⬜ | phase 3 |

---

## Environment variables — full MVP contract

Full list lives in `.env.local.example` and is split into three groups:

- **Phase 1 (required now):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `DEV_BYPASS_AUTH`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_AUDIENCE_ID`.
- **Phase 2 (AI pipeline):** `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_MINI_DEPLOYMENT`, `SUPABASE_STORAGE_BUCKET`.
- **Phase 3 (Parent Coach cron):** `CRON_SECRET`.

Intentionally **NOT** in the env:
- `CHILD_JWT_SECRET` — PIN-based child auth is out of contract scope (see "A vs B" below). Kept in `CLAUDE.md` as future reference only.
- Analytics keys — PostHog was removed per user request; no tracking layer in MVP.
- Dodo/Stripe — betalingsopsætning er eksplicit uden for kontrakten.

---

## Locked decisions

1. **Barneadgang:** Barnet bruger forælderens ene konto. Forælder er logget ind → vælger barn fra dashboardet → "Start lektie" → barnet bruger enheden. Ingen PIN, ingen separat børnekonto, ingen `auth.users`-række for børn. Holder MVP inden for kontrakt-scope og sparer child-JWT-infrastruktur.
2. **Azure-ressource:** **Sweden Central** (Gävle) — matches what privacy policy promises og holder alt i EU/EØS. Deployments: `gpt-4o` (vision) + `gpt-4o-mini` (hints). Misbrugslogning (abuse monitoring) skal slås fra via Azure OpenAI Limited Access opt-out — ellers opbevarer Microsoft prompts i op til 30 dage, hvilket bryder privatlivspolitikkens løfte om ingen tredjelandsoverførsel. Estimeret omkostning pr. session: ~0,02–0,05 kr input-token + output — kunden betaler.
3. **Billede-opbevaring:** Supabase Storage private bucket `homework-photos`, auto-delete efter 24 t via `pg_cron`.
4. **Max længde pr. session:** 8 runder. Advarsel ved runde 6, hard stop ved 8.

## Open questions (Marcus)

- **Støttede fag i MVP:** Matematik (1.–6. klasse), dansk (læseforståelse), engelsk (gloser/opgaver). Fælles Mål-materiale: hvilke årgange prioriteres?

---

## Phase 1 — Setup & deploy (efter opstart 5.000 kr)

**Mål:** lektiero.dk er live i eu-north-1 infrastruktur med landingsside + waitlist + parent auth. Konti er åbnet og faktureres til kunden.

- ⬜ Opret Vercel-projekt `lektiero`, tilknyt GitHub repo
- ⬜ Tilføj domæne `lektiero.dk` + `www.lektiero.dk` på Vercel
- ⬜ DNS records hos registrar (A/CNAME til Vercel) — Cloudflare proxy **OFF** (grey cloud) hvis Cloudflare
- ⬜ Vercel ENV: alle variabler fra `.env.local.example` sat i Production + Preview. Phase 1 bruger kun Supabase- + Site- + Resend-blokken; Azure- og cron-variabler tilføjes først ved phase 2/3.
- ⬜ Supabase Auth redirect URLs inkluderer `https://lektiero.dk/**` + `/auth/callback` (local + prod)
- ⬜ Kør migration `001_initial.sql` på prod
- ⬜ Google OAuth client konfigureret til begge domæner (én Google Cloud project for LektieRo)
- ⬜ Resend: domæne verificeret (SPF + DKIM), audience oprettet, API key + audience ID i env
- ⬜ Åbn Azure-subscription (Sweden Central), opret OpenAI resource, deploy `gpt-4o` + `gpt-4o-mini`, ansøg om Limited Access opt-out for abuse monitoring (sagsnummer + begrundelse: børnedata, GDPR), gem endpoint + key (phase 2 bruger)
- ⬜ Smoke-test: `/da` loader, waitlist-submit lander i `public.waitlist`, parent kan signup+login

**Leverance → 12.500 kr fase 2 betaling starter.**

---

## Phase 2 — Kerne-flow (foto → AI → hint)

**Mål:** Barn kan tage billede af lektie, vælge opgave, få Socratisk vejledning.

### 2.1 Schema udvidelse — migration `002_sessions.sql`
- ⬜ `families (id, created_at)` — lazy, oprettes første gang forælder tilføjer barn
- ⬜ `children (id, family_id, name, grade, avatar_emoji, created_at)` — 1:n pr. familie
- ⬜ `sessions (id, family_id, child_id, started_at, ended_at, subject, grade_estimate, problem_text, problem_type, image_path, turn_count, completed)`
- ⬜ `turns (id, session_id, role, content, created_at)`
- ⬜ RLS: forælder læser/skriver kun rækker i egen `family_id`
- ⬜ Storage bucket `homework-photos` privat + 24 t auto-delete policy

### 2.2 Børn-administration (forælder)
- ⬜ `/da/parent/children` — CRUD for børn (navn, klasse, avatar emoji)
- ⬜ Forælder opretter første barn → `families` row lazy-oprettes

### 2.3 Foto-upload flow
- ⬜ `/da/parent/session/new` — vælg barn → kamera/galleri input
- ⬜ `<input type="file" accept="image/*" capture="environment">` (mobil kamera direkte)
- ⬜ HEIC → JPEG konvertering server-side (`sharp`)
- ⬜ Client får signed upload-URL fra `/api/upload-url`, uploader direkte til Storage
- ⬜ Session row oprettes med `image_path`

### 2.4 AI stage 1 — billedanalyse
- ⬜ `/api/solve` henter billede server-side som base64
- ⬜ Azure `gpt-4o` vision call → JSON `{ subject, grade, tasks: [{id, text, type}] }`
- ⬜ Resultat caches på session row — Stage 1 kaldes kun én gang
- ⬜ UI viser opgave-liste → barnet vælger opgave

### 2.5 AI stage 2 — Socratic hint-flow (streaming)
- ⬜ System prompt (dansk) fra `CLAUDE.md` — tilpasset klasse + fag
- ⬜ `gpt-4o-mini` streaming via Next.js `ReadableStream` response
- ⬜ UI: chatboble + "følg op"-input i bunden, pinned
- ⬜ Max 8 runder. Advarsel ved runde 6, hard stop ved 8
- ⬜ `turns` række pr. udveksling
- ⬜ **Test-suite**: 10 kendte opgaver gennem pipeline → assert svar indeholder IKKE facit (regex). Blocker for launch.

**Leverance → sidste 12.500 kr starter.**

---

## Phase 3 — Indblik, emails, polish, test

### 3.1 Forældre-indblik
- ⬜ `/da/parent/dashboard` viser: antal løste opgaver (total), pr. barn-kort med streak + seneste session, sidste 10 sessioner globalt
- ⬜ Session detail-side: gennemse problem_text, turns, subject, dato
- ⬜ Basal fagfordeling (cirkel/barer, ingen avanceret viz)

### 3.2 Parent Coach email
- ⬜ Vercel Cron (`vercel.json`) rammer `/api/cron/parent-coach` hver aften kl. 20:00 CET
- ⬜ Endpoint verificerer `Authorization: Bearer $CRON_SECRET` før kørsel
- ⬜ LLM genererer kort opsummering + 2–3 konkrete forælder-tips pr. barn (aggregeret pr. dag)
- ⬜ Resend sender til forælderens email
- ⬜ Unsub-link (standard Resend audience)

### 3.3 Prompt engineering iteration
- ⬜ Saml ~30 rigtige lektier fra 2.–7. klasse (mat, dansk, engelsk) — Marcus skaffer
- ⬜ Evalueringsrunder: juster system prompt + pre-classification → ingen facit, pædagogisk ton, klasse-tilpasset sprog
- ⬜ Dokumenter prompt-version i `lib/prompts.ts` med `PROMPT_VERSION` konstant — logges på hver session

### 3.4 Polish & QA
- ⬜ Mobil test på iPhone Safari + Android Chrome (rigtig hardware)
- ⬜ Dansk copy gennemgang (pris-/dashboard-/fejltekster)
- ⬜ Lighthouse > 90 på `/da`
- ⬜ Privatlivspolitik + vilkår (kort, på dansk — Marcus leverer tekst)
- ⬜ Fejl-state UI: offline, upload-fejl, AI-timeout, Azure 429
- ⬜ Session resume: hvis enhed skifter midt i session, gem `sessionId` i `sessionStorage`, genoptag fra sidste runde

### 3.5 Launch-readiness
- ⬜ Vitest "never gives answer"-suite grøn
- ⬜ Alle migrationer applied i prod og noteret i `MIGRATION_STATUS.md`
- ⬜ End-to-end manuel gennemkørsel: signup → tilføj barn → foto → hint → email
- ⬜ Overdragelse: kunden har adgang til alle konti som ejer (Vercel, Supabase, Azure, Resend, Google Cloud, domæne-registrar)

**Leverance → MVP godkendt, slutbetaling.**

---

## 2-ugers tidsplan (fra underskriftsdato D)

| Dag | Fokus |
|---|---|
| D – D+1 | Phase 1: Vercel/DNS/konti, Supabase prod, migration, Resend domæne, Azure resource |
| D+2 – D+4 | Phase 2.1 schema + 2.2 børn-admin + 2.3 foto-upload |
| D+5 – D+8 | Phase 2.4 + 2.5 AI pipeline + første prompt-iteration |
| D+9 | Milestone 2 demo til Marcus + buffer til AI-iteration |
| D+10 – D+11 | Phase 3.1 indblik + 3.2 Parent Coach |
| D+12 | Phase 3.3 prompt iteration med rigtige lektier |
| D+13 | Phase 3.4 polish + mobile QA |
| D+14 | Phase 3.5 launch-readiness + overdragelse |

Buffer: ingen. Enhver scope-ændring eller forsinket feedback flytter D+14.

---

## Explicit out-of-scope (genbekræft før kontrakt)

Per contract §2 er disse IKKE inkluderet:
- Avanceret design (brand system, illustrationer ud over mock)
- Fuld GDPR/forældre-flow (samtykkestyring, DPA)
- Monitorering (Sentry, uptime, alerting)
- Google login (bemærk: Step 1 har Google OAuth tilsluttet allerede — det bliver i koden gratis, men skal ikke kvalitetssikres som feature)
- Betalingsopsætning (Stripe/Dodo)
- PIN-baseret child auth (kræver change request — se "A vs B" ovenfor)
- Avanceret analytics (PostHog etc.) — fjernet fra projektet
- Swedish/Norwegian lokalisering (infrastruktur klar, copy ikke leveret)
- Realtime parent dashboard (sessioner refresher ved sideindlæsning, ingen live subscription)
- Camera-raw / HEIC kvalitets-pipeline udover basal konvertering
- XP/streak gamification (kan tilføjes senere uden arkitektonisk ændring)

Alt ovenstående kan tilføjes som change request à 800 kr/t ekskl. moms.
