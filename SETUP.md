# LektieRo — Setup checklist

Work through this top to bottom. Boxes on the left; tick when done.

## 1. Supabase (eu-north-1)

- [x] Open the Supabase project (eu-north-1) and grab the three values below from **Project Settings → API**.
- [ ] In **SQL Editor**, paste the contents of `supabase/migrations/001_initial.sql` and run it.
- [ ] Verify two tables exist: `public.profiles` and `public.waitlist` (both with RLS enabled).
- [ ] Update `MIGRATION_STATUS.md` — tick the box for `001_initial.sql`.

### Supabase Auth settings (**Authentication → URL Configuration**)

- [x] **Site URL:** `http://localhost:3000` for local; `https://lektiero.dk` for prod.
- [x] **Redirect URLs:** add BOTH of these (local + prod each):
  - `http://localhost:3000/**`
  - `http://localhost:3000/auth/callback`
  - `https://lektiero.dk/**`
  - `https://lektiero.dk/auth/callback`
- [x ] **Email provider:** confirm "Confirm email" is enabled (default).
- [ ] **Google OAuth:** Authentication → Providers → Google → paste client ID + secret from your Google Cloud project (OAuth 2.0 client, type "Web application"). Authorized redirect URI on Google's side must be the Supabase callback: `https://<project-ref>.supabase.co/auth/v1/callback`.

## 2. `.env.local`

- [ x] Copy the template: `cp .env.local.example .env.local`
- [ x] Fill in:
  - [x ] `NEXT_PUBLIC_SUPABASE_URL` — from Supabase API settings
  - [ x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon public key
  - [ x] `SUPABASE_SERVICE_ROLE_KEY` — service_role key (**server-only, never commit**)
  - [ x] `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000`
  - [ x] `RESEND_API_KEY` — from Resend dashboard (optional for local — waitlist still works without it, just skips the audience add)
  - [ x] `RESEND_FROM_EMAIL` — defaults to `hello@lektiero.dk`
  - [ x] `RESEND_AUDIENCE_ID` — create an audience in Resend → copy the ID (optional)

## 3. Resend (optional but recommended)

- [x ] Create a Resend account.
- [x ] Add and verify the `lektiero.dk` domain (SPF + DKIM DNS records).
- [ ] Create an audience called "Waitlist DA" → copy its ID into `RESEND_AUDIENCE_ID`.
- [ ] Generate an API key with **Sending** and **Contacts** permissions → paste into `RESEND_API_KEY`.

## 4. Google OAuth (optional for local — required before launch)

Google login is already wired in `AuthCard.tsx`. It just needs credentials on three places: Google Cloud (issues them), Supabase (consumes them), and Supabase's auth callback URL registered at Google. **One Google Cloud project per product** — do not reuse another project's OAuth client (lesson #4 in `CLAUDE.md`).

### 4a. Create the Google Cloud project

- [ ] Open [console.cloud.google.com](https://console.cloud.google.com) → **Select project** dropdown → **New project**.
  - Project name: `lektiero`
  - Organisation: your org if you have one, else "No organisation"
- [ ] Wait for it to finish provisioning, then switch to the new project in the top bar.

### 4b. Configure the OAuth consent screen

- [ ] **APIs & Services → OAuth consent screen**.
- [ ] User type: **External** → Create.
- [ ] Fill app information:
  - App name: `LektieRo`
  - User support email: your email (e.g. `support@lektiero.dk` once forwarding is live)
  - App logo (optional, skip for now)
  - Application home page: `https://lektiero.dk`
  - Application privacy policy link: `https://lektiero.dk/da/privacy`
  - Application terms of service link: `https://lektiero.dk/da/terms`
  - Authorized domains: add `lektiero.dk`
  - Developer contact email: your email
- [ ] **Scopes** step → add the three default scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`. Nothing more — we only need identity.
- [ ] **Test users** step → add your own Gmail while the app is in "Testing" mode. You can skip once you publish.
- [ ] Back on the OAuth consent screen, click **Publish app** → **Confirm**. Because we only use basic scopes (email + profile + openid) Google does **not** require a verification review. If you later add sensitive scopes (Drive, Gmail, etc.) a review is triggered.

### 4c. Create the OAuth client ID

- [ ] **APIs & Services → Credentials → + Create Credentials → OAuth client ID**.
- [ ] Application type: **Web application**.
- [ ] Name: `LektieRo Web`.
- [ ] **Authorized JavaScript origins** — add both:
  - `http://localhost:3000`
  - `https://lektiero.dk`
- [ ] **Authorized redirect URIs** — this is the Supabase callback, **not** our `/auth/callback`:
  - `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback`
  - (Find `<project-ref>` in Supabase → Project Settings → General → Reference ID.)
- [ ] Click **Create** → copy the **Client ID** and **Client secret** (you'll only see the secret once — save it).

### 4d. Paste into Supabase

- [ ] Supabase → **Authentication → Providers → Google**.
- [ ] Toggle **Enable**.
- [ ] Paste **Client ID** + **Client secret**.
- [ ] Leave "Skip nonce checks" **off**.
- [ ] Authorized Client IDs: leave blank (only used for mobile/native clients).
- [ ] Save.

### 4e. Verify

- [ ] `npm run dev` → visit `http://localhost:3000/da/login` → click **Fortsæt med Google**.
- [ ] Google consent screen should say "Continue to lektiero.supabase.co" — that's expected.
- [ ] After accepting you should land at `/da/parent/dashboard`.
- [ ] On the Supabase side: **Authentication → Users** shows a new row with `provider: google`.
- [ ] Row exists in `public.profiles` too (created by the trigger).

### 4f. Common failures

- **"Error 400: redirect_uri_mismatch"** → the URI in your Google client's Authorized redirect URIs must exactly match `https://<project-ref>.supabase.co/auth/v1/callback`. No trailing slash, correct project ref.
- **"Error 403: access_denied"** while in Testing mode → add your Gmail to the Test users list or Publish the app.
- **Stuck on Supabase callback** → confirm the Supabase redirect URLs list (step 1) contains both `https://lektiero.dk/**` and `http://localhost:3000/**`.
- **Landed on `/da/login?error=auth`** → check Supabase logs (Auth → Logs). Usually means the secret was pasted with a trailing space.

## 5. Run it

- [ ] `npm install`
- [ ] `npm run dev`
- [ ] Open `http://localhost:3000` → should 307-redirect to `/da` and render the landing page in Danish.
- [ ] Submit the waitlist form with a test email → confirmation state shows → row appears in `public.waitlist`.
- [ ] Re-submit the same email → "Du er allerede på listen" (no duplicate row).
- [ ] Go to `/da/signup` (URL only, not linked) → create a parent account → follow the email confirmation link → lands on `/da/parent/dashboard`.
- [ ] Click "Log ud" → returns to `/da`.
- [ ] Log in again via `/da/login`.

## 6. Promote yourself to admin

- [ ] In Supabase SQL Editor, while logged in through the app:
  ```sql
  update public.profiles set role = 'admin' where id = auth.uid();
  ```
  (Or: look up your user id in `auth.users` and run `update public.profiles set role='admin' where id = '…';`.)
- [ ] Visit `/da/admin` → waitlist count + recent tilmeldinger render.
- [ ] Log out → `/da/admin` returns 404. 

## 7. Verify

- [ ] `npm run typecheck` — green
- [ ] `npm run build` — green
- [ ] `curl http://localhost:3000/sitemap.xml` — contains `/da/...` URLs
- [ ] `curl http://localhost:3000/robots.txt` — disallows `/api/`, `/auth/`, protected paths

## Not needed yet (Step 2+)

- Azure OpenAI keys
- `CHILD_JWT_SECRET`
- Child/families/sessions tables
- Dodo / payments
- Privacy + terms proper Danish legal copy (currently placeholder)
