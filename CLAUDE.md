# LektieRo — Claude Code context

AI homework helper for Danish kids (ages 8–14). Snap a photo → Socratic hint, never the answer.
Parents own the account; children log in with a PIN.

**Brand name:** written as **"LektieRo"** (capital R — splits "lektie" + "ro" / homework + calm).
The npm package, domain, and repo folder stay lowercase `lektiero`.

---

## The one rule

**Never give the answer. Always guide with a hint or question.**

This is the entire reason the product exists. Every AI response, every system prompt, every fallback string must be Socratic. If a code path can return a direct answer to a homework problem, that path is a bug. Test for it.

---

## Read first, every session

1. This file (stack, structure, gotchas, lessons baked in)
2. `C:\Users\Daniel\projects\website-scanner\skills\CLAUDE.md` — Random Code shared playbook (versions, scaffold, conventions)
3. The relevant `SKILL-*.md` from `website-scanner/skills/` for your task

The website-scanner skills are the source of truth for shared patterns. **Do not duplicate them here — link.** Only Lektier-specific divergences live in this file.

---

## Stack — locked

| Layer | Choice | Why locked |
|---|---|---|
| Framework | Next.js 16 App Router + TypeScript | Random Code default |
| Hosting | Vercel | edge streaming for AI responses |
| DB / Auth | Supabase, **eu-north-1 region** | GDPR — region cannot be changed later |
| Storage | Supabase Storage, private bucket, 24h auto-delete | homework photos are PII |
| Realtime | Supabase Realtime | parent dashboard subscribes to sessions |
| AI vendor | **Azure OpenAI — Sweden Central only** | GDPR. No OpenAI direct, no Anthropic, ever. |
| Models | `gpt-4o` (vision + complex), `gpt-4o-mini` (text + classify) | |
| Styling | Tailwind v4 (no config file) + Nunito (kids) + Inter (parents) | |
| Email | Resend | Random Code default |
| Analytics | PostHog EU, cookieless default | GDPR |
| Payments | Dodo Payments | when monetising |

**GDPR is non-negotiable. All processing in the EU. No exceptions for any data path.**

---

## Auth — different from other Random Code products

This product does **not** use magic links. Two distinct auth flows:

### Parents — email + password + Google OAuth
- Supabase Auth, password flow (`signInWithPassword` / `signUp`)
- Google OAuth ready from day one (one Google Cloud project for Lektier — never share)
- Email verification required before first login
- No "forgot password" complexity in MVP — Supabase password reset email is enough
- Same PKCE callback gotchas apply (see below)

### Children — PIN, no Supabase account
- Child enters 4-digit PIN on device
- `POST /api/child-auth` → bcrypt compare against `children.pin_hash` → return signed JWT
- JWT payload: `{ child_id, family_id }`, 8h expiry, `CHILD_JWT_SECRET`
- All child API calls send `Authorization: Bearer <jwt>`
- **Children never have a `auth.users` row.** No email, no phone, no PII beyond `name + grade`.
- Rate-limit PIN attempts per device (5/hour) — children share devices, brute force is real.

### Auth gotchas — bake into setup, don't relearn
1. **`/auth/callback` route MUST live at `app/auth/callback/route.ts`** — not inside `(auth)` group. Route groups strip the segment.
2. **Supabase redirect URLs need BOTH** `https://lektiero.dk/**` (wildcard) AND `https://lektiero.dk/auth/callback` (exact).
3. **Postgres trigger** that inserts into `public.profiles` on `auth.users` insert — without it, signup succeeds but app row is missing and every read returns null.
4. **Dashboard layout must re-check session** server-side. Don't trust middleware alone.
5. **Navbar reads session in the server layout**, passes `user` as prop — never read auth client-side in navbar (flicker).
6. **`type CookieOptions` import** is required: `import { createServerClient, type CookieOptions } from "@supabase/ssr"`.
7. **`cursor-pointer` on every `<button>`** — Tailwind doesn't add it.

---

## Project structure

```
app/
  (parent)/                 ← Supabase session-gated
    layout.tsx              ← reads session, redirects to /login if none
    dashboard/page.tsx      ← Realtime subscription to family sessions
    children/page.tsx       ← create / edit child profiles, set PINs
    settings/page.tsx
  (child)/                  ← JWT-gated (middleware checks Authorization)
    layout.tsx
    snap/page.tsx           ← camera capture (client component)
    hint/page.tsx           ← streaming hint conversation
    done/page.tsx           ← XP + streak celebration
  (marketing)/              ← public — landing, pricing, privacy, terms
  login/page.tsx            ← parent login
  signup/page.tsx           ← parent signup
  auth/
    callback/route.ts       ← OAuth + email verify callback (NOT in route group)
  api/
    solve/route.ts          ← POST: fetch image → Azure → stream hint
    upload-url/route.ts     ← POST: signed Supabase Storage upload URL
    child-auth/route.ts     ← POST: PIN check → JWT
    session/route.ts        ← GET/POST: create + read sessions
    webhook/dodo/route.ts   ← when payments ship
components/
  camera/CameraCapture.tsx          ← getUserMedia, iOS quirks (see below)
  hint/HintBubble.tsx, FollowUpInput.tsx, SubjectBadge.tsx
  dashboard/SessionFeed.tsx, ChildCard.tsx, ProgressBar.tsx
  auth/AuthCard.tsx                 ← password + Google (copy + adapt from website-scanner)
  marketing/Navbar.tsx, Footer.tsx, Logo.tsx, Hero.tsx
  analytics/PostHogProvider.tsx
lib/
  azure.ts                  ← AzureOpenAI client
  supabase/{client,server,admin}.ts
  prompts.ts                ← system prompt + extraction + classification (Danish)
  session.ts                ← session state helpers
  child-jwt.ts              ← sign + verify child JWTs
  analytics.ts
  email.ts
proxy.ts                    ← Next.js 16 — file is `proxy.ts`, function is `proxy`
```

**Rules — same as every Random Code project:**
- Files: `kebab-case.ts`. Functions: `camelCase`. Types: `PascalCase`. Constants: `SCREAMING_SNAKE`.
- No classes. Functions only. (Wrap `new AzureOpenAI()` in `getAzure()` factory.)
- Components ≤150 lines. Route handlers ≤80 lines (logic in `lib/`).
- `index.ts` = assembler only, no logic.
- One responsibility per file.

---

## Reusable from website-scanner — copy on day 1

These are the exact files Daniel has already shipped. Copy-paste, then adapt the marked spots.

| File | Adapt |
|---|---|
| `lib/supabase/{client,server,admin}.ts` | nothing |
| `lib/coalesced-fetch.ts` | nothing |
| `lib/dev-user.ts` | nothing |
| `lib/analytics.ts` | replace event catalog |
| `lib/email.ts` | `FROM` address |
| `app/auth/callback/route.ts` | nothing |
| `components/auth/AuthCard.tsx` | swap magic-link UI → password fields + Google button; keep "Last used" badge pattern |
| `components/marketing/*` | props at call site |
| `components/analytics/PostHogProvider.tsx` | nothing |
| `components/seo/JsonLd.tsx` | nothing |
| `proxy.ts` | protected route paths: `(parent)`, `(child)` |
| `app/robots.ts`, `app/sitemap.ts` | routes |
| `.env.local.example` | values below |

After copying: find/replace `indigo` → Lektier accent (`#3D6AFF` blue or `#FF8C42` orange depending on context).

---

## AI pipeline — two stages, one image call

```
Photo → [Stage 1: gpt-4o vision, ONCE per session] → JSON {subject, grade, problem_text, problem_type, has_diagram}
      → [Stage 2: gpt-4o-mini text, EVERY turn]    → streamed Danish hint
```

- Stage 1 result is cached on the `sessions` row. Re-running it on every turn burns money and is the #1 cost trap.
- Stage 2 uses `gpt-4o-mini` by default. Upgrade to `gpt-4o` only for STEM problems in grades 7–9 (matematik especially).
- Stream Stage 2 via `ReadableStream` to the client. No JSON polling.
- **Max 8 turns per session.** Warn at turn 6. Hard stop at 8 — prevents infinite loops and bill blowouts.
- Image is fetched server-side from Supabase Storage as base64 — never trust a client-supplied image URL.

```ts
// lib/azure.ts — the only Azure client in the app
import { AzureOpenAI } from "openai"
export function getAzure(deployment: string) {
  return new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_KEY,
    apiVersion: "2024-10-21",
    deployment,
  })
}
```

### System prompt — Danish, lives in `lib/prompts.ts`

```
Du er en tålmodig og venlig lektieguide for danske folkeskoleelever.

VIGTIGE REGLER:
1. Giv ALDRIG det færdige svar direkte. Guide altid eleven trin for trin.
2. Stil ét hjælpende spørgsmål ad gangen.
3. Tilpas dit sprog til {grade}. klasse.
4. Fag: {subject}. Brug fagspecifik dansk terminologi.
5. Hold svar korte — maks 3-4 sætninger.
6. Vær opmuntrende. Fejl er en del af læringen.
7. Undgå at kopiere opgaveteksten tilbage til eleven.

TONELEJET: Varm, rolig, aldrig nedladende. Som en klog storebror/-søster.
```

### Test the rule
Add a Vitest suite that feeds 10 known homework problems through Stage 2 and asserts the response **does not contain** the answer (regex match against the expected number / word). If this suite passes, the product exists. If it fails, ship is blocked.

---

## Child profile data — the whole point of onboarding

The onboarding form (`components/session/OnboardingForm.tsx`) captures:

- **name** — how the AI addresses the kid
- **grade** (0–10) — tunes vocabulary level + problem complexity
- **interests** (free-form) — themes the AI pulls examples from. "Minecraft, fodbold" → math word problems about pickaxes and goals, not generic apples.
- **special_needs** (free-form, optional) — e.g. "ordblindhed", "ADHD", "let sensitiv til afbrydelser". Passed into the Stage-2 system prompt so the AI can adjust pacing, tone, and reading complexity.

**These fields are load-bearing for product quality — they're not decoration.** Stage-2 will interpolate them into the system prompt. An empty profile still works but produces generic hints; a filled-in profile is the whole differentiator vs a plain ChatGPT wrapper.

Storage: `public.children` table. Columns added in `003_children_profile.sql`. Both `interests` and `special_needs` are nullable so the flow degrades gracefully when skipped.

Onboarding shows up in two places:
1. **First-run dashboard** (`/da/parent/dashboard`) when a parent has zero children and hasn't dismissed. Has a "Spring over for nu" link that sets a 30-day `lr_onboarding_skipped` cookie.
2. **Forældre Ro** (`/da/parent/overview`) renders the form inline whenever the parent has no children — no skip option here, this page is explicitly for managing kids.

## Database — minimal, RLS on every table

```sql
families (id, subscription_status, subscription_expires_at)
profiles (id → auth.users, family_id, role)               -- parents
children (id, family_id, name, grade, pin_hash, avatar_emoji, xp, streak_days, last_active_date)
sessions (id, child_id, family_id, started_at, ended_at, subject, grade_estimate,
          problem_text, problem_type, image_path, turn_count, completed, xp_earned)
turns    (id, session_id, role, content, created_at)
```

- RLS: parents read only rows where `family_id = (select family_id from profiles where id = auth.uid())`.
- Children have no `auth.users` row → API routes verify the child JWT and use the service-role client with explicit `family_id` filters.
- **Lazy sub-tables** (lesson from SEOLint): don't auto-create `family_settings` / `billing` rows on signup. Create on first write. Saves migrations.
- Always run migrations: create file → `npx supabase db push` → update a `MIGRATION_STATUS.md`. Never leave unapplied.

---

## Camera — iOS Safari is the hard part

```tsx
// MUST: autoPlay playsInline muted on the <video> — or iOS won't render
// MUST: keep MediaStream in a useRef — re-init on route change re-prompts permission
// MUST: trigger getUserMedia from a user gesture (button click), never on mount
// Snap: canvas.toBlob(b => ..., "image/jpeg", 0.85)
// HEIC (iPhone default): convert with `sharp` server-side before sending to Azure
```

Upload flow: client → `POST /api/upload-url` → signed URL → upload directly to Supabase Storage → store `image_path` on session row → `/api/solve` fetches image server-side. The client never sees the bucket.

---

## Realtime — parent dashboard

```ts
supabase.channel(`family-${familyId}`)
  .on("postgres_changes",
      { event: "*", schema: "public", table: "sessions", filter: `family_id=eq.${familyId}` },
      handler)
  .subscribe()
```

Child mid-session device switch: store `sessionId` in `sessionStorage`, resume from last turn on the new device.

---

## Design — "Warm Studio" (coral + cream, sampled from launched mock)

Aesthetic: Alice.tech warmth + HejAlbert trust, tuned to a Danish family audience. Calm cream background, coral CTAs, emotional display serif, generous whitespace. See `app/globals.css` for the canonical token values.

```
Canvas:       #FBF5EE   warm cream (NEVER pure white)
Canvas warm:  #FCE9DF   hero peach gradient wash
Primary:      #E98873   coral — CTA button "Skriv mig op"
Primary +:    #D97460   hover
Coral deep:   #D85C48   checkmarks, "Til Forældrene" heading
Ink:          #1E2A3A   near-black display text
Navy:         #2E3E56   dark reassurance band bg
Blue soft:    #4A6A8A   secondary headings ("Til Barnet", "Læs mere")
Blue tint:    #EAF1F8   "Til Forældrene" card bg
Amber pill:   #F7E8A0   "Vi åbner snart" badge
Muted:        #7A8596   secondary text
Success:      #34C17A

Font display: Fraunces          emotional headlines — warm humanist serif
Font body:    Inter              UI + parent dashboard
Font kid:     Nunito             reserved for child surfaces (Step 2+)
Radius:       24px cards · 999px buttons (pill) · 50% avatars
Shadow card:  0 8px 24px rgba(30,42,58,.06)
```

**Canonical landing layout** (mock-approved, do not redesign without user sign-off):
1. Two-column hero — left: logo chip → amber pill badge → big Fraunces H1 → subtitle → coral ✓ values (Nærvær · Ro · Overskud) → "Læs mere ↓" anchor link. Right: elevated white waitlist card with email input + coral pill CTA "Skriv mig op" + "Har du allerede en kode? Fortsæt her" (only login entry).
2. Dark navy reassurance band: 💡 "Vi giver aldrig facit – vi viser vejen".
3. Two-card benefits row: "Til Barnet" (white, blue-soft heading) + "Til Forældrene" (blue-tint bg, coral-deep heading).
4. "Kommende medlemskaber" pricing teaser: Standard 229 kr./md + Family Premium 299 kr./md (MEST POPULÆR). Visual-only — no payment plumbing until explicitly requested.
5. Thin footer.

Child screens (Step 2+): camera (full-screen viewfinder, big snap button) → thinking spinner → hint conversation (typewriter, follow-up input pinned bottom) → completion (XP tick-up, streak update) → dashboard (child cards, subject heatmap, live indicator).

---

## i18n — Danish-first, SEO-ready for Nordic expansion

**Route shape:** `/[locale]/...`. `da` is default and the only active locale today. `sv` (Swedish) and `nb` (Norwegian Bokmål) are reserved — when they ship, extend `lib/i18n/config.ts` and add `messages/sv.json` / `messages/nb.json` + slug maps in `lib/i18n/routes.ts`. No other restructuring needed.

- Root `/` redirects to `/da` via `proxy.ts`. Any unprefixed path gets the default locale prepended.
- `<html lang={locale}>` set in `app/[locale]/layout.tsx`.
- `generateMetadata` emits `alternates.languages` — extend when new locales ship.
- `app/sitemap.ts` iterates `locales × PUBLIC_ROUTE_KEYS`.
- URL slugs stay English across all locales for SEO consistency: `/da/pricing`, `/da/privacy`, `/da/terms`. Content is localised via `messages/{locale}.json`; URLs are not. Override in `routeSlugs` only if a locale truly needs a different slug.
- Danish strings live in `messages/da.json` — **never hardcode user-facing copy in JSX**, go through the `t()` helper or import the messages file.

---

## Environment variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server only — never NEXT_PUBLIC_

# Azure OpenAI (Sweden Central)
AZURE_OPENAI_ENDPOINT            # https://<resource>.openai.azure.com
AZURE_OPENAI_KEY
AZURE_OPENAI_DEPLOYMENT          # gpt-4o
AZURE_OPENAI_MINI_DEPLOYMENT     # gpt-4o-mini

# Child auth
CHILD_JWT_SECRET                 # 32+ random bytes, server only

# Site
NEXT_PUBLIC_SITE_URL             # https://lektiero.dk
DEV_BYPASS_AUTH=true             # local only — see lib/dev-user.ts

# Email
RESEND_API_KEY
RESEND_FROM_EMAIL                # hello@lektiero.dk after domain verify

# Analytics
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Use `|| "placeholder"` fallbacks for build-time vars so Vercel builds don't crash before all secrets are set.

---

## What NOT to build (MVP scope)

- **Direct answer mode.** Ever. The product loses its reason to exist.
- Live video / human tutor escalation
- Curriculum content library
- Essay writing for kids
- Anything that sends data outside Azure Sweden Central

---

## Lessons baked in from previous Random Code products

These are the exact things that cost hours on SEOLint / website-scanner. Don't repeat them.

1. **Auth callback NOT in `(auth)` route group** — route groups strip the segment.
2. **Supabase region is permanent** — project lives in eu-north-1. Mistake = new project + migrate.
3. **Cloudflare proxy OFF (grey cloud)** for Vercel records — orange cloud breaks SSL.
4. **One Google Cloud project per product** — sharing OAuth clients causes redirect URI conflicts.
5. **Lazy sub-tables** — don't auto-create `*_settings` / `*_billing` rows on signup.
6. **Always run migrations on file create** — never leave unapplied.
7. **Don't push to prod until the local flow works end-to-end.** Half-deployed states create bugs that look like infra problems.
8. **Fetch shared data once.** Use `coalesced-fetch.ts`. If an endpoint appears 3+ times in the dev log, fix it.
9. **Pre-deploy ritual:** `npm test && npm run typecheck && npm run build` — all three, every time.
10. **Ask before `git push`.** Always.

---

## Pre-launch checklist (Lektier-specific additions on top of `SKILL-launch-playbook.md`)

- [ ] Supabase project in **eu-west** (verify, can't change later)
- [ ] Azure OpenAI resource in **Sweden Central** (Gävle) — confirm region in portal
- [ ] Storage bucket: private, RLS enforced, 24h auto-delete policy live
- [ ] "Never gives answer" Vitest suite green
- [ ] Child PIN brute-force rate-limit live
- [ ] Cookie banner + `/privacy` + `/terms` (Danish + English)
- [ ] Realtime tested across two devices
- [ ] iOS Safari camera tested on a real iPhone (not just simulator)
- [ ] HEIC conversion verified end-to-end
- [ ] Max-8-turns hard stop verified

---

*v1.0 — seeded from website-scanner skills, April 2026*
