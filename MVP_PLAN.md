# LektieRo — MVP plan (v3, 2026-04-24)

Maps the freelance contract scope (§2) to concrete implementation state. Bumped after the 2026-04-23 → 24 push night: extraction-validation, session simulator, voice-quality and flow fixes driven by real kid-testing.

Legend: ✅ shipped · 🟡 partial / in progress · ⬜ todo · ➕ delivered beyond contract scope

---

## Status snapshot (2026-04-24)

| Contract item | Status | Where / notes |
|---|---|---|
| Discovery & arkitektur alignment | ✅ | `CLAUDE.md` + `docs/` |
| Projekt-skelet (Next.js 16 + Tailwind v4 + TS) | ✅ | repo |
| Supabase konto (eu-north-1) | ✅ | live, migrations 001–007 (006+007 applied på dev 2026-04-23, prod skal bekræftes) |
| Vercel + DNS + domæne | ✅ | `lektiero.dk` live, apex + www |
| Database schema | ✅ | 001–007 — profiles, waitlist, children (+interests, special_needs, companion_type), sessions, turns, subscription_tier |
| Landingsside (lektiero.dk) | ✅ | `/da` — hero, promise band, benefits, pricing teaser, footer |
| Waitlist → Supabase | ✅ | `/api/waitlist` + Resend audience-add, idempotent |
| Google Search Console | ✅ | site verificeret + sitemap indsendt 2026-04-23 |
| On-page SEO | ✅ | sitemap + hreflang + XSL, robots.txt, dynamic OG, JSON-LD |
| SEOLint optimering | ✅ | freelancers eget værktøj |
| Resend opsætning | ✅ | SMTP + audience, branded HTML for auth-mails |
| Login flow (Supabase e-mail) | ✅ | login, signup (invite-gated), forgot-password, welcome/set-password, Google OAuth flag-gated |
| Admin dashboard | ✅ | `/da/admin` — waitlist, users, invite, emails, voice-costs |
| Mobilvenlig foto-upload | ✅ | kamera, galleri, drag-drop, Cmd+V paste, Supabase Storage `homework-photos` |
| AI billedanalyse (Azure vision) | ✅ | `/api/solve` kalder Azure `gpt-5-mini` live (fallback til mock i `AI_MODE=test`). Ekstraheret til `lib/vision.ts` så dev-scripts kan genbruge |
| Flere opgaver pr. billede | ✅ | TaskPicker viser 1–N opgaver, skjuler løste opgaver ved retur, viser "N tilbage / alle klaret" |
| Hint-flow (Socratic, streaming) | ✅ | `/api/hint` streamer Azure response med max 25 runder (advarsel v. runde 20). Stabil konversations-historik (stale-closure fix 2026-04-24), auto-færdiggørelse via `[progress done="all"]`, partial-completion tracking |
| Prompt engineering (Fælles Mål) | ✅ | `lib/curriculum/` — matematik, dansk, engelsk, **tysk** × klasse 1–7. Task-type scaffolding + subject-language rules + template-detection for fri-tekst-opgaver |
| E-mail (transaktionelle) | ✅ | Resend + branded templates i `lib/email/templates.ts` |
| Forældre-indblik | ✅ | `/da/parent/overview` — session-stats pr. barn, faglig difficulty, seneste sessioner |
| Prisvenlig test på rigtige lektier | ✅ | 19 rigtige lektie-fotos kørt gennem `test:extraction`, 12 kørt gennem `test:sessions` (sim + LLM-grader). Resultater + findings i `docs/extraction-validation-2026-04-24.md` + `docs/eval-loop.md`. Prod end-to-end med rigtig familie mangler stadig. |
| Polish & QA | 🟡 | mobil + copy ongoing |
| GDPR-compliant privacy + terms | 🟡 | dansk copy live, **mangler virksomhedsnavn/CVR/adresse** |
| HIBP password protection | ✅ | aktiveret i Supabase Auth |

**Hvad mangler før handover:**
1. Migration 006 + 007 verificeret på prod (dev er ✅).
2. End-to-end test med rigtig familie (ikke bare simuleret — 19 fotos er kørt gennem extraction+sim, men en kids-using-it-for-homework seance mangler).
3. Virksomhedsnavn, CVR og adresse indsat i `privacy/page.tsx` + `terms/page.tsx`.
4. Overdragelsesmøde med Marcuz (konti, koder, dokumentation).

---

## Environment variables

Splittet i tre grupper i `.env.local.example`:

- **Phase 1 (live):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_AUDIENCE_ID`, `DEV_BYPASS_AUTH`.
- **Phase 2 (AI pipeline):** `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, `AZURE_OPENAI_DEPLOYMENT`, `SUPABASE_STORAGE_BUCKET`, `AI_MODE`.
- **Voice (post-MVP tilføjelse):** `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `NEXT_PUBLIC_VOICE_ENABLED`, `ELEVENLABS_API_KEY` (opt-in, admin-only).

Intentionally **NOT** in env for MVP:
- `CHILD_JWT_SECRET` — PIN-baseret barnelogin er uden for kontraktens scope.
- `CRON_SECRET` — Parent Coach nightly email er ikke implementeret (se nedenfor).
- Dodo/Stripe — betalingsopsætning eksplicit uden for scope.

---

## Locked decisions

1. **Barneadgang:** Forælder logger ind → vælger barn fra profile-selector → "Start lektie". Ingen PIN, ingen separat børnekonto.
2. **Azure-ressource:** Sweden Central (Gävle). Deployment: `gpt-5-mini` (en enkelt model håndterer både vision og hints). Speech-resourcen ligger også i Sweden Central.
3. **Billede-opbevaring:** Supabase Storage private bucket `homework-photos`, auto-delete efter 24 t.
4. **Max længde pr. session:** 25 runder (øget fra oprindelige 8 — Louise's ros-ris-ros + H'erne kræver flere turns end først estimeret). Advarsel ved runde 20, hard stop ved 25.
5. **AI-mode toggle:** `AI_MODE=live|test` i env + admin kan flippe per browser via dev-panelet.

---

## Phase 1 — Setup & deploy ✅

**Mål:** lektiero.dk er live i eu-north-1 infrastruktur med landingsside + waitlist + parent auth. ✅

- ✅ Vercel-projekt + GitHub repo
- ✅ Domæne `lektiero.dk` + `www.lektiero.dk`, www redirects 308 til apex
- ✅ DNS records konfigureret
- ✅ Vercel ENV sat i Production + Preview
- ✅ Supabase Auth redirect URLs inkluderer `https://lektiero.dk/**` + `/auth/callback`
- ✅ Migrations 001–005 kørt på prod
- ✅ Google OAuth client klar (flag-gated off per default)
- ✅ Resend: domæne verificeret, audience oprettet
- ✅ Azure-subscription + OpenAI resource (`gpt-5-mini` deployment i Sweden Central)
- ✅ Smoke-test på staging

---

## Phase 2 — Kerne-flow (foto → AI → hint) ✅

### 2.1 Schema udvidelse
- ✅ `children` i `002_children.sql` + `003_children_profile.sql` (interests + special_needs) + `007_child_companion.sql` (companion_type)
- ✅ `sessions` + `turns` i `006_sessions_turns.sql` (applied på dev; **prod skal verificeres**)
- ✅ Storage bucket `homework-photos` privat (24 t auto-delete policy skal verificeres på prod)

### 2.2 Børn-administration (forælder)
- ✅ Børn CRUD via `/api/children` + onboarding-form på første dashboard-besøg
- ✅ Inline form på Forældre Ro når forælder har 0 børn

### 2.3 Foto-upload flow
- ✅ Kamera / galleri / drag-drop / Cmd+V paste
- ✅ `<input accept="image/*,.heic,.heif">` — HEIC passerer gennem direkte til Azure (modellen håndterer formatet)
- ✅ Signed upload-URL fra `/api/upload-url` → direkte upload til Supabase Storage
- ✅ Session row oprettes når AI analyserer billedet

### 2.4 AI stage 1 — billedanalyse
- ✅ `/api/solve` henter billede server-side som data-URL
- ✅ Azure `gpt-5-mini` vision → JSON `{ subject, subjectConfidence, tasks, reason, detectionNotes }`
- ✅ Lav confidence → subject picker → TaskPicker

### 2.5 AI stage 2 — Socratic hint-flow (streaming)
- ✅ System prompt (dansk) fra `lib/prompts.ts` — klasse + fag + child-profil (interests, special_needs)
- ✅ `gpt-5-mini` streaming via `ReadableStream`, `reasoning_effort: "minimal"` for snappy first-token
- ✅ UI: chatboble + pinned follow-up input, typing-gate (`MIN_THINKING_MS`)
- ✅ Max 25 runder, advarsel v. runde 20
- ✅ Turns persisteres via `/api/session`
- ⬜ **Vitest "never gives answer"-suite** — ikke skrevet endnu. Manuel test sker via ros-ris-ros prompt + løbende AI-iteration. Vigtig at tilføje før skalering.

---

## Phase 3 — Indblik, emails, polish, test

### 3.1 Forældre-indblik ✅
- ✅ `/da/parent/overview` — totals, pr. barn difficulty-dots pr. fag, seneste sessioner
- ✅ Difficulty scoret 1–5 fra turn count

### 3.2 Parent Coach (rollout-justering fra nightly email → interactive Q&A)
- ✅ `/api/coach` + `CoachPanel` — forældre kan stille konkrete spørgsmål og få Louise-tunet svar
- ⬜ **Nightly email via cron er ikke bygget.** Kontrakten nævner ikke eksplicit automatisk email; interaktiv Q&A erstatter i MVP. Kan tilføjes som change request hvis Marcuz foretrækker push-model.

### 3.3 Prompt engineering iteration
- ✅ Curriculum knowledge base (`lib/curriculum/`) — fag × klasse (inkl. tysk 5.–7.)
- ✅ Voice-delivery prompt rules (tilføjet med voice-mode)
- ✅ ros-ris-ros + H'erne + Louise-feedback-loop
- ✅ Task-type scaffolding (word-problem, reading, interview, composition, puzzle, dictation, vocabulary) + subject-language block for engelsk
- ✅ Template-task detection (composition med fast skabelon) — Dani lister sætningerne op front, emitter pseudo-step progress, auto-færdiggør ved `[progress done="all"]`
- ✅ Number equivalence rule — "3" / "three" / "tre" accepteres identisk, fulde sætninger der indeholder svaret godkendes
- ✅ Evaluering via simulator: `npm run test:extraction` + `npm run test:sessions` (se `docs/eval-loop.md`). 19 fotos × 12 sims i baseline-kørsel
- ✅ Findings-loop: `docs/extraction-validation-2026-04-24.md` + simulator grader-reports pr. session
- ⬜ `PROMPT_VERSION` konstant logges ikke på sessions
- ⬜ Grade/subject-specifikke prompt-varianter (baseret på simulator data) — baseline peger på "Vi er ved A" over-scaffolding, manglende metakognitive prompts, engelsk silent-translation

### 3.4 Polish & QA
- ✅ Fejl-state UI: upload-fejl, AI-timeout fallback, manglende billede
- ✅ Branded 404
- ✅ Responsive på mobil (kid-canvas, voice-canvas, parent shell, admin)
- 🟡 iPhone Safari + Android Chrome på rigtig hardware — løbende
- 🟡 Dansk copy gennemgang
- ⬜ Lighthouse > 90 på `/da` — ikke verificeret
- 🟡 Privatlivspolitik + vilkår — **mangler CVR/adresse**
- ✅ Session resume via sessionStorage (admin dev-panel kan jumpe ind i hvilket som helst stage)

### 3.5 Launch-readiness
- ⬜ Vitest "never gives answer"-suite grøn
- 🟡 Alle migrationer applied i prod — dev er ✅, prod skal verificeres
- ⬜ End-to-end manuel gennemkørsel med rigtig lektie
- ⬜ Overdragelse: kunden får adgang til alle konti (Vercel, Supabase, Azure, Resend, Google Cloud, domæne-registrar)

---

## ➕ Scope leveret ud over kontrakten

Følgende er ikke listet i §2 men er bygget og fungerer i den nuværende kodebase. Per §6 er disse change-request-territorium — enten faktureres som ekstra timer (800 kr/t) eller logges som goodwill ift. den fremadrettede aftale.

### Stemme (STT + TTS + voice-agent)
- ➕ Mic-knap i tekst-chat → Azure Speech STT → transcript i input (`/api/stt`, `lib/voice/azure.ts`)
- ➕ Auto-TTS af Dani's svar → Azure Neural TTS (Christel / Jeppe) med SSML prosody (`/api/tts`)
- ➕ Fuld voice-agent loop (VoiceCanvas + VAD + auto-mic + auto-TTS) — "ring op til Dani"
- ➕ Barge-in detection (kid afbryder Dani midt i sætning → TTS stopper, mic åbner)
- ➕ Sentence-chunked TTS — Dani begynder at tale på sætning 1 mens LLM stadig skriver sætning 2 (cutter ~2s dead-air/turn)
- ➕ PCM WAV recording (16 kHz mono, Web Audio API) — omgår Azures flaky webm/opus-transcoding som tidligere droppede dansk lyd
- ➕ Voice-delivery prompt-regler (ingen bold, kortere sætninger, spoken-language patterns)
- ➕ Grade-based voice-default: 0.–4. klasse → voice, 5.+ → text. Toggle kun synlig for grade 5+
- ➕ **Multi-locale STT** — engelsk/tysk opgaver sender `en-US,da-DK` / `de-DE,da-DK` til parallel transkription, højeste-confidence vinder. Fikser kid-speaker-Danish-on-engelsk-task der tidligere blev til gibberish ("A really familiar procedure is Jessica")
- ➕ **æ/ø/å-fix i TTS** — quoted Danish content skippes fra `<lang xml:lang="en-US">` wrap så "æble" ikke længere udtales med engelske vokal-fonemer
- ➕ TTS SSML-fallback — hvis dekoreret SSML afvises med 400, retry med plain-text SSML så kid ikke ender i stilhed
- ➕ Voice-pick af opgave (`VoiceTaskChoice`) + subject-confirm (`VoiceSubjectChoice`) — barn vælger opgave med stemmen før hint-flow starter
- ➕ Admin voice-cost calculator (`/da/admin/voice` + `/da/admin/costs`) med pris-matrix på tværs af Azure/ElevenLabs/Deepgram
- ➕ Admin voice-tester (paste tekst → hør begge voices A/B)
- ➕ ElevenLabs provider scaffold (admin-only, gated indtil EU DPA er på plads)
- ➕ Voice-mode per-browser override via admin dev-panel

### Evaluation & prompt-tuning loop
- ➕ `lib/vision.ts` — ekstraheret fra `/api/solve`, isomorph så dev-scripts kan genbruge extractor uden Next.js runtime
- ➕ `scripts/test-extraction.ts` — batch-kørsel af vision-extractor mod alle fotos i `task-samples/`, genererer pr.-billede JSON + aggregate `REPORT.md`. Cached som default, `--no-skip` til re-run efter prompt-edits
- ➕ `scripts/simulate-session.ts` — tre-rolle LLM-simulation (Dani + syntetisk elev med grade/subject-specifik persona + pædagogisk grader) for hver cachede extraction. Output: `<image>.session.json` + aggregate `SESSIONS.md` med per-grade×subject matrix + svageste sessioner
- ➕ `docs/eval-loop.md` — proces-doc for hvordan simulator + grader bruges til iteration (hvornår køre, hvordan læse, hvordan oversætte issues til prompt-edits)
- ➕ `docs/extraction-validation-2026-04-24.md` — per-billede validerings-rapport, fangede 1 type-enum-violation + 2 truncation-bugs
- ➕ `docs/task-taxonomy.md` — observerede opgave-mønstre pr. klasse × fag, hands-on vs chat-solvable, multi-part word problems
- ➕ Admin test-images page (`/da/admin/test-images`) — genbrug tidligere uploadede fotos til regression-test uden re-upload
- ➕ `task-samples/` folder + .gitignore-regel (538 MB PII-fotos må aldrig committes)

### Curriculum knowledge base
- ➕ Struktureret læringsmateriale pr. fag × klasse (`lib/curriculum/`) — koncepter, almindelige fejl, nøgleord, pædagogisk tilgang
- ➕ `formatCurriculumForPrompt()` injicerer automatisk i hver AI-prompt
- ➕ Dækker matematik, dansk, engelsk, **tysk** — klasse 1–7 (tysk 5.–7.)

### UI & UX ud over base-flowet
- ➕ Companion-system: 4 mascotter (løve, kanin, pingvin, ræv), kid-vælger, persisteret pr. barn (migration 007)
- ➕ Netflix-style profile selector (full-screen, staggered animations, last-active chip)
- ➕ Context-aware sidebar (parent vs child mode, simplified nav for kid)
- ➕ Mode selector — "Forstå opgaven" vs "Jeg sidder fast" (to eksplicitte help-modes)
- ➕ 16 interaktive læringsblokke (ten-frame, fraction bar, number line, clock, balance scale, syllable chips, word-class sort, verb timeline, side-by-side translation, tryit-input, etc.)
- ➕ Inline `[tryit]` answer-blocks i AI-svar — barnet kan svare direkte i bubblen
- ➕ Celebration-panel ved opgave-løsning (konfetti + companion cheer + "næste opgave" CTA)
- ➕ **Step-checklist pr. opgave** — StepChecklist i toppen viser A/B/C-pills med flueben, `[progress done="..." current="..."]` markers fra Dani driver den live
- ➕ **Synthesized pseudo-steps for template-opgaver** — composition/template-tasks uden pre-defined steps får auto-genererede 1/4-2/4-3/4-pills ud fra Dani's interne nummerering
- ➕ **Auto-complete på `[progress done="all"]`** — Dani markerer opgaven færdig → SessionFlow flipper til celebration (uden at kid skal trykke knap)
- ➕ **Partial-completion tracking** — `CompletionStatus {kind: completed|partial|abandoned, stepsDone, stepsTotal}` flyder fra HintChat til `/api/session`, driver difficulty-score nuance (3/4 partial ≠ 0/4 abandoned)
- ➕ **Goal banner + modality chip** — MÅL vises eksplicit øverst med modalitet-ikon (✏️ skriv, 🎤 interview, 📖 læs, ✍️ skriv tekst osv.) så kid ved både hvad og hvordan fra start
- ➕ **TaskPicker-filtrering** — løste opgaver skjules fra pickeren ved retur; "N opgaver tilbage" headline; "alle klaret!" state med prominent "Tag et nyt billede" CTA
- ➕ **Kompakt task-headline i hint-skærm** — kort title + "Vis hele opgaven" expander; erstatter wall-of-text dump af raw task
- ➕ **Eksplicit Færdig-knap i voice-dock** — mint pille med ✓ + tekst "Færdig" (tidligere rødt X der lignede cancel)
- ➕ **ImagePreviewPanel** — dev-only floating thumbnail af upload-billedet

### Forælder-værktøjer
- ➕ Interactive parent coaching Q&A (`/api/coach` + CoachPanel) — "Hvordan forklarer jeg brøker til min datter?"
- ➕ Parent dashboard med difficulty heatmap + per-subject drill-down
- ➕ Onboarding-form med interests + special_needs → direkte input til AI-prompt

### Admin-værktøjer
- ➕ Emails template gallery (`/da/admin/emails`) med copy-to-clipboard for Supabase-template-installation
- ➕ User management (`/da/admin/users`) — invite, role-promotion
- ➕ Voice cost calculator + pricing matrix
- ➕ Waitlist management
- ➕ Per-user AI-cost synlig i dashboard

### Auth & security
- ➕ Invite-gated signup (`EARLY_ACCESS_INVITE_CODE`)
- ➕ Invite-link security fix (sign out før set-session på invited user)
- ➕ Set-password welcome-flow efter invite
- ➕ Triple-guarded dev-bypass-auth (kun localhost, env'd, eksplicit opt-in)

### Infrastructure & DX
- ➕ AI-mode toggle (`AI_MODE=live|test` + per-browser override)
- ➕ Dev-flow-panel (admin-only, localhost-only — jump til hvilket som helst stage med mock data)
- ➕ Dev-log med streaming-events (first-token latency, turn count, TTS provider + ms, STT locale + confidence på multi-locale runs)
- ➕ **Session cost panel** — `lib/dev-cost.ts` singleton + `SessionCostPanel.tsx` viser løbende USD/DKK-total baseret på rigtig Azure-usage (vision + hint + STT + TTS) via `[[LR_USAGE:…]]` sentinel og response headers
- ➕ Voice-mode localStorage preferences + grade-gated toggle
- ➕ `npm run test:extraction` + `npm run test:sessions` scripts + `scripts/README.md`

---

## Post-MVP backlog (efter handover / fremadrettet scope)

Prioriteret — øverst = næste ting at bygge.

### Pædagogisk backlog (fra gennemgang mod `docs/pedagogy.md`)

| Item | Hvorfor | Kompleksitet |
|---|---|---|
| **SMART-målsætning som sub-flow** | Per `docs/pedagogy.md` §10 er SMART "det pædagogiske fundament". I dag har hver opgave et `goal` fra extractor, men der er ingen kid-sets-own-goal-dialog eller cross-session mål-tracking ("7/10 brøk-opgaver inden fredag"). Biggest pedagogical gap. | Høj |
| **Brobygge via tidligere læring** | Pedagogy §5. Sessioner refererer ikke til tidligere koncepter. Kræver `sessions` med concept-tags + prompt-injection af "sidste gang arbejdede du med Y". | Medium-høj |
| **Læse-Makker (voice use case B)** | Pedagogy §9. "Killer feature" per Louise-doc. Kræver streaming STT + word-level timestamps + ny comparison-UI. | Høj |
| **Aktive pauser** | Pedagogy §4. Prompten nævner pauser reaktivt; mangler alders-differentieret schedule og automatisk trigger. | Lav-medium |
| **Per-trin svar-felter (ikke fri chat)** | Pedagogy §11. "Barnet skal vide præcist hvor svaret til hvert delspørgsmål skrives ind" — i dag er det én fri chat uanset step-count. | Medium |
| **Forælder-indblik med faglige retningslinjer** | Pedagogy §6–7. Difficulty dots findes; mangler per-subject-grade narrative ("3. klasse matematik arbejder med X lige nu, sådan kan du tale om det hjemme"). | Medium |
| **Ordliste-flow i sprogfag** | Pedagogy §11. Prompten peger passivt på ordlister; mangler aktiv flow hvor Dani guider kid gennem opslag. | Medium |
| **Stuck/escape-hatch UX** | Kid kan sidde fast uden vej ud — behov for "jeg er forvirret" → reset/switch/eskalér beslutning. | Lav (UX) |

### Teknisk backlog

| Item | Hvorfor | Kompleksitet |
|---|---|---|
| **Migration 008 — partial completion columns på sessions** | Backend accepterer `stepsDone`/`stepsTotal`/`completionKind` i request body men persisterer dem ikke. Tilføj kolonner så data ikke tabes. | Lav |
| **Vitest "never gives answer"-suite** | Det er hele produktets eksistensberettigelse — ingen skalering uden automatiseret assurance. Simulator-graderen er en del af dækningen men ikke nok alene. | Lav (1 dag) |
| **Native English voice via nested SSML** | Aktuelt wrapper Christel quoted English i `<lang xml:lang="en-US">` → falsk engelsk udtale. Nested `<voice name="en-US-JennyNeural">` blev afvist af Azure REST (skal være direct child af `<speak>`). Løsning: split meddelelse i sibling-voice-blokke under `<speak>` — kræver SSML-builder. | Medium |
| **Bold-markdown English i engelsk-tasks** | `**house**` i "Sig **house** eller **flat**" læses som dansk. Fix: pre-transform `**X**` → `"X"` scoped til engelsk/tysk tasks (kræver subject plumbing til TTS endpoint). | Lav-medium |
| **Grade/subject-specifikke prompt-varianter** | Simulator baseline 2026-04-24 viser gentagelser af "Vi er ved A", manglende metakognitive prompts, engelsk silent-translation. Første par fixes er rullet ud (rule 3 strammes op, number equivalence, template detection) — fuld sweep på 19 fotos er næste skridt. | Medium (itererende) |
| **`PROMPT_VERSION` konstant + logging** | Nødvendigt for at A/B-teste prompt-iterationer på rigtige data + korrelere simulator-scores med produktions-adfærd. | Lav |
| **Per-child voice-minute cap** | Uden det blæser en heavy voice-bruger budget på Family Premium plan (se `docs/voice-pricing-estimates.md`). | Lav-medium |
| **Parent override af voice/text pr. barn** | Grade-5 gate er på plads, men forælder kan ikke overrule på et grade-3 barn endnu — kræver `children.conversation_mode` kolonne. | Medium (migration + UI) |
| **Subscription-tier gate på voice** | `profiles.subscription_tier` eksisterer men bruges ikke af voice. Gate ElevenLabs-premium-stemme til Family Premium. | Lav |
| **CVR / virksomhedsnavn / adresse i legal** | Kontraktkrav — skal ske før offentlig launch. | Trivielt (kræver info) |
| **Streaming STT via Azure Speech SDK** | Skal have for at lande under 1.2s turn-tid + forudsætning for Læse-Makker. | Medium |
| **Parent Coach nightly email** | Alternativ til den interaktive CoachPanel — push i stedet for pull. | Medium (Vercel Cron) |
| **Lighthouse > 90 på `/da`** | SEO + conversion — tjek og fix. | Lav |
| **Sv + Nb lokalisering** | Routing er klar, copy skal leveres. | Medium (oversættelse + testing) |
| **Stripe / Dodo betalingsintegration** | Eksplicit ude af MVP — tilføjes når monetisering går live. | Høj |
| **PIN-baseret barnelogin** | Kræver change request — ikke nødvendigt mens familien deler én forælder-konto. | Høj |

---

## Explicit out-of-scope (bekræftet fra §2)

Ikke inkluderet i MVP-prisen:
- Avanceret design ud over mock-niveau
- Fuld GDPR/DPA-samtykkestyring
- Monitorering (Sentry, uptime, alerting)
- Betalingsopsætning (Stripe / Dodo)
- PIN-baseret child auth
- Avanceret analytics (PostHog etc.)
- Swedish / Norwegian lokalisering (infrastruktur klar, copy ikke leveret)
- Realtime parent dashboard (refresher ved sideindlæsning)
- XP / streak gamification

Alt ovenstående kan tilføjes som change request à 800 kr/t ekskl. moms.
