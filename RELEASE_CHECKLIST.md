# LektieRo v1 release checklist

This is the marketing/waitlist launch — no AI yet. Public users land on the hero, submit their email, and that's it. Existing testers reach the dashboard via `/da/login` (real account) or `/da/signup?invite=<code>`.

Run through this top to bottom before pointing DNS at production. Tick as you go.

## Hard blockers (must be done)

- [ ] **Legal placeholders filled** in `app/[locale]/(marketing)/privacy/page.tsx` and `app/[locale]/(marketing)/terms/page.tsx`:
  - [ ] `[Virksomhedsnavn indsættes]` → real ApS / IVS name
  - [ ] `[CVR-nummer]` → 8-digit CVR
  - [ ] `[Adresse]` → registered address
- [ ] **Email forwarding live** for `privacy@lektiero.dk`, `support@lektiero.dk`, `hello@lektiero.dk` (these addresses are referenced in privacy/terms — they must reach a real inbox)
- [ ] **Migration applied to prod Supabase** (`supabase/migrations/001_initial.sql`) — verify `public.profiles` and `public.waitlist` exist with RLS enabled
- [ ] **Supabase Auth** Site URL + redirect URLs include `https://lektiero.dk/**` and `https://lektiero.dk/auth/callback`
- [ ] **Vercel env vars (Production)** all set per `.env.local.example` Phase 1 block:
  - [ ] `NEXT_PUBLIC_SITE_URL=https://lektiero.dk`
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `RESEND_API_KEY` (and audience id if using)
  - [ ] `EARLY_ACCESS_INVITE_CODE` set to a long random string — share with testers only
  - [ ] `DEV_BYPASS_AUTH` **NOT SET** (or `false`)
- [ ] **DNS at Simply** points apex `lektiero.dk` to Vercel A record `76.76.21.21` and `www` to `cname.vercel-dns.com`
- [ ] **Vercel Domains** has both `lektiero.dk` and `www.lektiero.dk` added; `www` redirects 308 to apex; SSL green

## Smoke test on staging URL (vercel.app preview)

- [ ] `/` redirects 307 to `/da`
- [ ] `/da` renders hero + waitlist + promise band + benefit cards + pricing teaser + footer
- [ ] Submitting waitlist with a fresh email returns success → row appears in `public.waitlist`
- [ ] Submitting same email twice → "Du er allerede på listen" (no duplicate row)
- [ ] `/da/faq` opens, accordion items expand
- [ ] `/da/pricing`, `/da/privacy`, `/da/terms` all render
- [ ] `/da/login` is centered, both email/password and Google login work
- [ ] `/da/signup` shows the invite-only holding card; `/da/signup?invite=<code>` shows the real form
- [ ] Logged-in user lands on `/da/parent/dashboard` and the mock scan flow works end-to-end (image → spinner → tasks → streamed hint)
- [ ] `/da/parent/overview` renders the empty stats placeholder
- [ ] Promote yourself to admin in SQL editor: `update profiles set role='admin' where id=auth.uid();` — `/da/admin` then shows waitlist count + table; admin nav item appears in the sidebar with the coral "KUN ADMIN" pill
- [ ] Logout returns to `/da` and clears the session
- [ ] On a real phone (375px), navbar shows just logo + Log ind, parent shell collapses to a top icon bar, hero stacks cleanly

## SEO + sharing

- [ ] `https://lektiero.dk/sitemap.xml` lists `/da`, `/da/faq`, `/da/pricing`, `/da/privacy`, `/da/terms` with hreflang alternates
- [ ] `https://lektiero.dk/robots.txt` disallows `/api/`, `/auth/`, `/*/parent/`, `/*/admin/`, `/*/login`, `/*/signup`
- [ ] View source on `/da` — `<script type="application/ld+json">` blocks for `Organization` + `WebSite` render
- [ ] View source on `/da/login` — `<meta name="robots" content="noindex,nofollow">` present
- [ ] Open Graph preview check: paste `https://lektiero.dk/da` into [opengraph.xyz](https://www.opengraph.xyz) — image renders correctly, title + description correct
- [ ] Favicon shows in browser tab (the coral heart on cream background)
- [ ] Submit `https://lektiero.dk/sitemap.xml` to Google Search Console after first deploy

## Final commit + deploy

- [ ] `npm run typecheck` green
- [ ] `npm run build` green
- [ ] No `console.log` / debug statements left in changed files
- [ ] Commit + push to main → Vercel auto-deploys
- [ ] Hit `https://lektiero.dk/da` in an incognito window — final visual check
- [ ] Submit your own email to the waitlist and confirm Resend audience picks it up

## Day-1 monitoring

- [ ] Check Supabase → `select count(*) from waitlist;` once a day
- [ ] Check Resend → emails sent / bounces
- [ ] Vercel → Functions logs for errors on `/api/waitlist`

## Out of scope for v1 (intentional)

- Azure OpenAI integration (Phase 2)
- Real photo capture pipeline → Storage upload → vision call (Phase 2)
- Sessions / turns / families / children tables (Phase 2)
- Parent Coach nightly email (Phase 3)
- Stripe / Dodo payments
- Swedish / Norwegian content
