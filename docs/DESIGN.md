# LektieRo — Design guide

The source of truth for the kid flow visuals. Distilled from the Claude Design
prototype; the code in `components/session/` and `components/mascot/` is where
this guide lives in practice — keep that code in sync with this doc.

Marketing / admin / parent surfaces use the Warm Studio palette (coral + cream)
from `app/globals.css` and are out of scope for this guide.

---

## 1. Principles

1. **Never give the answer.** Every string, every state, every fallback is
   Socratic. A code path that can leak the final answer is a bug.
2. **Dani is a companion, not a logo.** He appears on every kid surface with a
   mood that matches the moment (curious → thinking → cheer).
3. **Warm, not loud.** Cream background, never pure white. Coral is the one
   accent; everything else is soft subject tints.
4. **Text serves a purpose.** Short sentences. No academic words. If it would
   confuse a 9-year-old, rewrite it.

---

## 2. Tokens (see `components/session/design-tokens.ts`)

```ts
bg:         #F5F1EA   // warm cream — canvas
bg2:        #EFE8DC   // soft shade
card:       #FFFFFF
ink:        #1F1B33   // near-black display text
ink2:       #6B6680   // secondary text
ink3:       #A8A2B8   // tertiary / disabled

coral:      #E8846A   // primary CTA, scan line, progress pip
coralSoft:  #FDEAE2   // coral tint background

// Subject palette — used for badges, tints, glyphs
sky:        #B8D4E8 / skySoft   #E6F0F7    → matematik
mint:       #A8D8C0 / mintSoft  #E4F2EB    → dansk
butter:     #F4D77A / butterSoft #FBF1CF   → engelsk
plum:       #B89FCF / plumSoft  #EFE6F5    → footer hint / extra

shadowCard:   0 1px 0 rgba(31,27,51,.04), 0 12px 32px -12px rgba(31,27,51,.12)
shadowCardLg: 0 20px 48px -12px rgba(31,27,51,.22)

radius:   card 24px · chip 999px · button 999px
```

## 3. Typography

| Role | Family | Use |
|---|---|---|
| Display | **Fraunces** (serif) | All headlines, greetings, task text |
| UI | **Nunito** (sans) | Body copy on child surfaces |
| Fallback | Inter | Marketing + admin (untouched by this guide) |

Fonts are registered in `app/layout.tsx` as CSS variables `--font-fraunces`,
`--font-nunito`, `--font-inter`. Child components reference them via `K.serif`
and `K.sans` from `design-tokens.ts`.

---

## 4. Dani mascot (see `components/mascot/Dani.tsx`)

Hand-drawn SVG lion. Not Disney-slick — warm and slightly scruffy.

- **Moods:** `happy` · `excited` · `curious` · `thinking` · `cheer` · `wonder` · `sleepy`
- **Animations:** `bobbing` (breathing), `thinking` (floating thought bubble)
- **Companion sparkles:** `<Sparkles count={N}/>` — used on celebration screen

**When to use which mood**

| Screen | Mood | Size |
|---|---|---|
| Home | `cheer` + waving paw | 108px |
| Scanning | `thinking` + thought bubble | 72px |
| Subject picker | `curious` | 64px |
| Task picker | `happy` | 56px |
| Mode selector | `curious` | 56px |
| Hint message bubble | `happy` (streaming: `thinking`) | 44px |
| Celebration | `cheer` + bobbing + sparkles | 140px |

---

## 5. The 7-screen kid flow

One file owns each screen. Flow lives in `components/session/SessionFlow.tsx`.

| # | Stage | File | Visual summary |
|---|---|---|---|
| 1 | `idle` | `ScanPanel.tsx` | Dani waves, dashed camera card, plum footer pill |
| 2 | `uploading` / `thinking` | `ThinkingPanel.tsx` | Paper sheet rotated -3°, coral scan line, Dani thinking, 3-phase copy |
| 3 | `subject` | `SubjectPicker.tsx` | 2×2 grid, color-tinted glyph pockets |
| 4 | `pick` | `TaskPicker.tsx` | Numbered rows with subject-tinted badges, slide-in stagger |
| 5 | `mode` | `ModeSelector.tsx` | Task banner + **three** mode cards (mint/sky/coral) |
| 6 | `hint` | `HintChat.tsx` | Task pill with step pips, Dani speech bubbles, input + hint/done buttons |
| 7 | `done` | `HintChat.tsx` → `CelebrationPanel` | Confetti, Dani cheer, reward pills (XP/streak/sticker) |

---

## 6. Three help modes (prototype-approved)

Do NOT collapse back to two. Kids are in more than two states.

1. **💡 Jeg vil prøve selv** (mint) — confident, just wants light nudges
2. **🧭 Hvad skal jeg gøre?** (sky) — needs task orientation
3. **🪤 Jeg sidder fast** (coral) — give up state, needs gentle escalation

Backend has only two modes (`explain` / `hint`) — option 1 and 3 both map to
`hint`; option 2 maps to `explain`. The UI-level distinction matters more than
the backend distinction.

---

## 7. Animations (see `app/globals.css`)

| Keyframe | Use |
|---|---|
| `scan` | Coral line sweeping over the paper sheet |
| `pop` | Cards appearing (fade + scale) |
| `slideIn` | Task rows appearing from the left |
| `daniBob` | Dani's gentle breathing loop |
| `daniThink` | Floating thought bubble above Dani's head |
| `wave` | Paw waving on home screen |
| `sparkle` | Sparkle particles on celebration |
| `fall` | Confetti falling |
| `grow` | Base-10 block growing (reserved for future math tools) |
| `loading-dot` | 3-dot typing indicator |

---

## 8. What NOT to build

- Interactive math manipulatives (TenFrame / NumberLine / StackTool) — the
  backend streams a Socratic chat, not a structured JSON ladder. Porting these
  tools requires re-architecting the AI contract. Defer until that sprint.
- Streak / XP top-bar chips — no data model behind them yet.
- Recent-tasks carousel on home — same reason.
- Any screen that can display the final answer directly.

---

## 9. Tying into shared contracts

- AI backend — Azure OpenAI Sweden Central, `gpt-5-mini` only
  (`lib/azure.ts`). See `CLAUDE.md` for the full lock.
- Socratic system prompts — `lib/prompts.ts` (`buildChildSystemPrompt`).
- Curriculum context — `lib/curriculum/` injected into every child LLM call.
- Session persistence — `/api/session` POST/PATCH writes to `sessions` +
  `turns` tables (needs migration 006 applied).

---

*Update this file when the design changes. Screenshots live in the code review,
not in the repo.*
