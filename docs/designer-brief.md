# LektieRo — Designer brief

**What you're designing:** visual learning components inside a Danish AI
homework-helper chat for kids aged 6–15. The AI sits beside the kid, asks
guiding questions, and shows visual aids. **It never reveals the final
answer.** Your job is to design the *visual aids*.

Everything below is self-contained — you don't need to open other files to
start mocking. When you're done, hand back Figma frames per the deliverables
spec at the bottom.

---

## 0. Product principles (read first)

1. **Never show the answer.** The visual *hints* at structure (how to split a
   number, which stavelse goes where, when a verb is past tense) — it never
   displays the solved result. Think scaffolding, not answer-reveal.
2. **Warm + calm, not gamified.** No XP, no stars, no achievement unlocks.
   The companion (a cute animal mascot) does the emotional work.
3. **Danish first.** All copy in Danish. Sentence case, no em dashes —
   periods, commas, and "og".
4. **Three age bands.** A component may look slightly different for grade 1
   vs grade 5 vs grade 8 — see §5 age modulation.
5. **One visual per AI turn.** The chat bubble contains *at most* one of
   your components. Not two side-by-side. Not stacked.

---

## 1. Brand system (already locked — use these exact tokens)

### Palette

```
CANVAS         #FBF5EE    page background, warm cream (never pure white)
CARD           #FFFFFF    elevated surfaces
INK            #1F1B33    body text
INK-2          #6B6680    secondary text
INK-3          #A8A2B8    tertiary / disabled

CORAL          #E8846A    primary accent, CTAs, active state
CORAL SOFT     #FDEAE2    coral tint background

SKY            #B8D4E8    matematik subject tint
SKY SOFT       #E6F0F7

MINT           #A8D8C0    dansk subject tint
MINT SOFT      #E4F2EB

BUTTER         #F4D77A    engelsk subject tint + hints
BUTTER SOFT    #FBF1CF

PLUM           #B89FCF    tertiary / extra
PLUM SOFT      #EFE6F5
```

**Subject color contract:** matematik = sky, dansk = mint, engelsk = butter.
Coral is reserved for user actions and active/focus state across all subjects.

### Typography

- **Display / headlines:** Fraunces (variable serif). Weight 600 for headings,
  500 italic for emphasis (like the coral italic "familien." on the hero).
- **Body / UI:** Nunito (sans). Weights 500/600/700.
- **Numeric in manipulatives:** Fraunces 700 looks best at 24–32px.

### Shapes + shadows

```
RADIUS    cards 24px  ·  chips/pills 999px  ·  inputs 12px
SHADOW
  card     0 1px 0 rgba(31,27,51,.04), 0 12px 32px -12px rgba(31,27,51,.12)
  card-lg  0 20px 48px -12px rgba(31,27,51,.22)
```

### Motion language

- Subtle + gentle. Kid-friendly, not arcade-game.
- Bobbing loop on companions (~2.8s ease-in-out, 4px vertical).
- Pop-in (fade + scale from 0.85, 0.35s ease-out) when a new element appears.
- Sparkles (2.4s pulse) on celebrations only — never during learning.

---

## 2. What's already designed and shipped — do NOT redo

| Surface | Status | Notes |
|---|---|---|
| **Companion mascots** (12 animal SVGs) | ✅ Done | Lion (Dani), Fox (Frida), Owl (Uno), Panda (Miko), Octopus (Bubba), Robot (Nova), Unicorn (Luna), Dragon (Rex), Rabbit (Pip), Alien (Zap), Cat (Kaja), Polar bear (Bjørn) |
| **7-screen kid flow** | ✅ Done | home → scanning → subject picker → task picker → mode selector → guide chat → celebration |
| **Mode selector** (3 modes) | ✅ Done | "Jeg vil prøve selv" (mint) · "Hvad skal jeg gøre?" (sky) · "Jeg sidder fast" (coral) |
| **Avatar picker modal** | ✅ Done | 12-companion grid, 3/4-col responsive |
| **Netflix profile selector** | ✅ Done | Each kid shows their chosen companion |
| **Marketing landing** | ✅ Done | Hero + phone mockup + promise band + pricing |

These are in code and live. Focus your energy on what follows.

---

## 3. What you need to design — the work

30 visual components. We've grouped them into **3 tiers by priority.** Start
with Tier 1, hand it back, then we'll commission Tier 2.

Each component below has:
- **Purpose** — what it teaches
- **Grade range** — who sees it
- **States to mock** — at minimum, deliver these three Figma frames per
  component: **Idle** (first render), **Interacting** (kid engaging), **Solved**
  (or "done"-state feedback)
- **Props / variants** — what changes based on the task
- **Example use** — a real chat turn the component appears in
- **Motion hints** — subtle animations we want

---

## TIER 1 — Launch must-haves (4 components)

These cover ~80% of grade 1–3 tasks and let us ship the first iteration.

---

### T1.1 `TenFrame` — Ti-rammen

**Purpose:** Visualize 0–20 using a 5×2 grid of dots. Teaches place-value +
carrying over 10.

**Grade range:** 0–2

**Props:**
- `a: number` — count of "first addend" dots (fill coral)
- `b: number` — count of "second addend" dots (fill butter)

**States to mock:**
1. **Idle** — empty 5×2 grid, soft `INK/12%` borders
2. **Interacting (a=4, b=7)** — first 4 cells filled coral, next 6 butter,
   remaining overflow row shows 1 extra butter square below (demonstrating
   "the carry")
3. **Solved** — full ten-frame + overflow, faint coral pulse on the row
   that carried

**Example chat turn:**
> Dani: Kig på ti-rammen. Ser du hvad der sker når 4 + 7 går over 10?
> `[TenFrame a=4 b=7]`
> Dani: Hvor mange ekstra bliver der?

**Motion:** cells pop in sequentially (40ms stagger) on first render. Overflow
row fades in 300ms after the main grid.

---

### T1.2 `NumberSplit` — Taldeling

**Purpose:** Decompose a 2-digit number into tens + ones with a simple branch
diagram.

**Grade range:** 1–3

**Props:**
- `whole: number` (e.g. 24)
- `tens: number` (e.g. 20)
- `ones: number` (e.g. 4)
- `revealed: boolean` — whether the split is shown or hidden behind a
  "Vis opdelingen" button

**States to mock:**
1. **Idle (revealed=false)** — the whole number in big Fraunces, "Vis
   opdelingen" dashed-coral button below
2. **Interacting (revealed=true)** — branch SVG drops down splitting into
   two pills: sky tint holding "20", mint tint holding "4"
3. **Comparison layout** — two NumberSplits side by side with a "+" between
   (for 24 + 17 decomposition)

**Example chat turn:**
> Dani: Hvis vi deler tallene op i tier og enere, bliver det nemmere.
> `[NumberSplit whole=24 tens=20 ones=4]`
> Dani: Hvad er tierne i 17?

**Motion:** branch lines draw on with 400ms stroke animation; pills pop in
after with 50ms stagger.

---

### T1.3 `SyllableChips` — Stavelseschips

**Purpose:** Break a Danish word into syllables the kid can tap through.
Teaches decoding and rhythm.

**Grade range:** 0–2

**Props:**
- `word: string` (e.g. "kaniner")
- `break: string[]` (e.g. `["ka", "ni", "ner"]`)

**States to mock:**
1. **Idle** — three rounded-rectangle chips in a row, cycling colors
   coral-soft / butter-soft / sky-soft, serif text centered. Kid hasn't
   tapped yet.
2. **Interacting** — kid has tapped the second chip → chip pops 1.05× scale
   + solid coral border for 200ms then settles; small speaker icon appears
   briefly (future TTS affordance — mock it as a hint)
3. **Solved** — all three chips show a subtle mint check badge bottom-right;
   companion bubble below says "Præcis! Nu kan du læse det højt."

**Example chat turn:**
> Dani: Ordet er **kaniner**. Kan du klappe det ud i stavelser?
> `[SyllableChips word="kaniner" break=["ka","ni","ner"]]`

**Motion:** chips pop in sequentially (60ms stagger). On tap: quick 1.05×
scale + return. No sound — we'll wire audio in phase 3.

---

### T1.4 `TryItInput` — Prøv-det-felt

**Purpose:** Inline answer input inside the AI's bubble. The kid types, taps
"Tjek", gets instant visual feedback without leaving the flow.

**Grade range:** All grades (the most-used component)

**Props:**
- `placeholder?: string` (e.g. "Skriv dit bud")
- `inputMode?: "numeric" | "text"` (default text)
- `expected?: string | string[]` — for client-side quick-check; server
  always validates too

**States to mock (this one has more):**
1. **Idle** — rounded input + dark "Tjek" button right-aligned; input uses
   Fraunces 600 at 18px, left-aligned placeholder in INK-3
2. **Focused** — coral border, soft coral glow (6px spread, 10% opacity)
3. **Interacting (typing)** — text in INK, button darkens to full INK
4. **Checking** — 3-dot loading inside the button for 400ms
5. **Correct** — border + bg flash mint, mint checkmark icon appears left
   of input, a sparkle pops above-right
6. **Close** — border + bg flash coral-soft, small "🤔 Tæt på!" hint slides
   in below (don't use the emoji — design a subtle thinking-face glyph)
7. **Wrong** — brief (200ms) horizontal shake, no color change, button
   becomes "Prøv igen"

**Example chat turn:**
> Dani: Hvad bliver 20 + 10?
> `[TryItInput inputMode="numeric" expected="30"]`

**Motion:** state transitions 180ms ease-out. Shake is 4-frame horizontal
wiggle over 200ms.

---

## TIER 2 — Grades 3–6 expansion (6 components)

Tackle these after Tier 1 ships and we see it working.

### T2.1 `NumberLine` — Tallinje

**Purpose:** Animated hop across a linear sequence. Shows additive jumps.

**Grade range:** 1–5

**Props:** `from`, `to`, `step`, `label`, `highlight?` (a specific value to
pulse)

**States:** idle (static tick marks + labeled endpoints) · interacting
(dashed arc hops from `from` to `to` with animated `+step` label) · solved
(pulse on `to`)

**Example:**
> `[NumberLine from=20 to=30 step=10 label="+10"]`

**Motion:** arc stroke animates (dash-array 400ms), `+step` text fades in at 50% of arc draw.

---

### T2.2 `FractionBar` — Brøkbjælke

**Purpose:** Horizontal bar divided into equal parts with some filled.

**Grade range:** 3–6

**Props:** `parts`, `filled`, `compareTo?` (second bar to stack above for
visual comparison)

**States:** idle (empty bar outline) · interacting (parts fill left-to-right
with 80ms stagger, coral) · solved (both bars visible if `compareTo` set,
faint mint checkmark between)

**Example:**
> `[FractionBar parts=4 filled=3]`
> Dani: Ser du? Tre ud af fire dele. Hvad hedder den brøk?

---

### T2.3 `WordClassSort` — Ordklasser

**Purpose:** Drag-and-drop: sort words into navneord / udsagnsord /
tillægsord buckets.

**Grade range:** 3–6

**Props:** `words: {text, correctClass}[]`, `buckets: ("n"|"v"|"a")[]`

**States:** idle (words in a pile at top, three labeled buckets below) ·
interacting (word being dragged — 1.08× scale, soft shadow) · solved (all
placed, correct ones glow mint, misplaced ones soft-bounce back to pile)

**Example:**
> `[WordClassSort words=[{text:"hund",class:"n"},{text:"løber",class:"v"},...]]`

**Motion:** bounce-back is the key pattern here — 350ms spring easing back to
the pile when wrongly dropped.

---

### T2.4 `SentenceBuilder` — Sætningsbygger

**Purpose:** Drag jumbled words into grammatical order.

**Grade range:** 2–5 (Dansk) / 4–7 (Engelsk — reuses layout)

**Props:** `words: string[]` (jumbled), `correct: string[]` (the solved
order, for validation)

**States:** idle (words in a scrambled row with soft dashed drop-zone below)
· interacting (word being dragged, drop-zone highlights when hover) ·
solved (sentence reads left-to-right in the drop-zone, serif 18px, mint
underline briefly flashes)

---

### T2.5 `VerbTimeline` — Verbtidslinje

**Purpose:** Place a verb on a past / now / future timeline.

**Grade range:** 3–6 (Engelsk primarily)

**Props:** `verb` (infinitive), `past`, `present`, `future`, `correct: "past"|"present"|"future"`

**States:** idle (three pills on a horizontal timeline axis, all neutral) ·
interacting (kid taps a pill → it lifts, coral active state) · solved (the
correct pill stays coral, others fade to 40% opacity)

**Example:**
> "Yesterday I \_\_\_ to the park." `[VerbTimeline verb="go" past="went" present="go" future="will go" correct="past"]`

---

### T2.6 `HintStack` — Hintstak

**Purpose:** A vertical stack of butter-tinted pills, each hidden until
tapped. Lets the kid reveal one hint at a time at their pace.

**Grade range:** All

**Props:** `hints: string[]` (progressively smaller/more direct)

**States:** idle (first pill visible, rest shown as dimmed "Endnu et hint"
buttons) · interacting (tap reveals next pill with 300ms pop-in) · all
revealed (small "Skal vi prøve sammen?" button at the bottom suggesting
escalation)

---

## TIER 3 — Fills out grades 5–9 (rest of the catalog)

Pre-specced, lower priority. Mock these only after Tier 1 + 2 ship.

| # | Component | Grade | Purpose |
|---|---|---|---|
| T3.1 | `BalanceScale` — Vægtskål | 5–7 | Equation as see-saw; both sides visually weighted |
| T3.2 | `CoordinateGrid` — Koordinatsystem | 4–7 | Plot a point, read coordinates |
| T3.3 | `FractionPie` — Brøkcirkel | 3–5 | "Slice of cake" alternative to FractionBar |
| T3.4 | `ShapeOutline` — Formkontur | 1–3 | Classify polygons |
| T3.5 | `Clock` — Analog ur | 2–3 | Read hel/halv/kvart past |
| T3.6 | `MeasurementStrip` — Målestok | 2–4 | cm/m/mm conversion |
| T3.7 | `Base10Blocks` — Titalsklodser | 1–3 | Tens-rods + ones-cubes for place value |
| T3.8 | `CommaCandidate` — Kommakandidat | 4–7 | Tap where a comma might go |
| T3.9 | `ContextClueHighlight` — Kontekstspor | 3–6 | Glow neighbor words around an unknown one |
| T3.10 | `StoryMap` — Fortællingskort | 3–7 | Timeline of who-did-what-when |
| T3.11 | `DoubleConsonantCheck` — Dobbeltkonsonant | 2–4 | `løb` vs `løbbe` — rule tooltip |
| T3.12 | `SilentLetterHighlight` — Stum bogstav | 1–4 | Circle the silent `d` in `bord`, `h` in `hvem` |
| T3.13 | `SentenceRebuild` — Engelsk sætning | 4–7 | Same layout as SentenceBuilder, English |
| T3.14 | `FalseFriendAlert` — Falske venner | 5–9 | Card warning about DA≠EN lookalikes (eventuelt ≠ eventually) |
| T3.15 | `ContractionReveal` — Sammentrækning | 3–6 | `do not → don't` split/merge animation |
| T3.16 | `SideBySideTranslation` — To kolonner | 3–7 | DA/EN columns with synced chunk highlights |
| T3.17 | `BreakTimer` — Pausetimer | All | "Tag en pause" — 2-min countdown with sleeping companion |
| T3.18 | `CelebrationPulse` — Fejringspuls | All | Soft coral glow on correct-step feedback (smaller than the celebration screen) |

---

## 4. The containing chat surface (context for your mocks)

Your components live inside a Danish chat bubble. Here's the shape they
appear in:

```
┌─────────────────────────────────────────┐
│  [Companion avatar — 44px]              │
│    └─► [Speech bubble, sky-soft bg]     │
│         ┌───────────────────────────┐   │
│         │  "Godt set — nu prøver vi │   │
│         │   med enerne."             │   │
│         │                            │   │
│         │  [YOUR COMPONENT GOES HERE]│   │
│         │                            │   │
│         │  "Hvad bliver 4 + 7?"      │   │
│         └───────────────────────────┘   │
└─────────────────────────────────────────┘
```

Bubble max-width is ~85% of the chat column. The chat column itself caps at
~480px on mobile, ~560px on desktop (centered).

**Design your components to fit inside a ~400px-wide container at
minimum.** On desktop, they may breathe wider but must not overflow the
bubble.

---

## 5. Age-band modulation

One component, three slight variations based on the kid's grade. You don't
need to design three separate Figma variants for every component — but
please note, per component, whether the design is **age-adaptive** (needs
three variants) or **grade-agnostic** (one version works).

| | 6–9 (grade 0–3) | 10–12 (grade 4–6) | 13–15 (grade 7+) |
|---|---|---|---|
| Component size | Large (fills 400px) | Medium (~320px) | Compact (~240px) |
| Typography | Fraunces 22–28px | Fraunces 18–22px | Fraunces 16–18px |
| Decoration | Warmer, more rounded, softer colors | Cleaner, less tint | Minimal, mostly ink + one accent |
| Animation | More playful (pop/bob) | Subtle | Functional only |

For Tier 1 components, **please deliver the grade 0–3 version by default** —
that's our launch target audience.

---

## 6. Deliverables

**Per component:**
1. **Figma page** titled `{ComponentName} — Danish name`
2. **Three mock frames minimum** at component-native size:
   - `01 Idle`
   - `02 Interacting`
   - `03 Solved` (or whatever final/success state applies)
3. **Interaction notes** — a text block on the page or in frame description:
   - Tap targets (what triggers state change)
   - Animation timing (duration + easing)
   - Accessibility (alt text, aria hints if known)
4. **Color tokens used** — reference them by name from §1, not hex
5. **A 400×240px preview frame** with the component centered on the canvas
   cream, for easy engineering preview

**Per tier:**
- A single Figma file containing all components for that tier
- A short Loom/Figma-comment explaining the logic of any tricky animation
- Version marker: `vYYYY-MM-DD` on the file cover so we track revisions

**Accessibility baseline:**
- Tap targets ≥ 44×44px
- Color contrast: ≥ 4.5:1 for text on tinted backgrounds
- Any state change with color MUST also change shape/icon (colorblind-safe)

---

## 7. Priorities + timeline (proposed)

| Tier | Component count | Suggested turnaround | Why this order |
|---|---|---|---|
| **Tier 1** | 4 | 1 week | Covers launch (grades 1–3 math + dansk). Unblocks engineering. |
| **Tier 2** | 6 | 2 weeks | Opens grades 3–6. Adds dansk grammar + engelsk. |
| **Tier 3** | 18 | 4–6 weeks | Full curriculum coverage. Can start while Tier 1+2 are in code. |

After Tier 1 delivery → engineering codes it → we ship to real test users
→ we iterate your Tier 2 designs based on what we learned from Tier 1.

---

## 8. Questions? Contact

Engineering lead: **Daniel** (@daniel in Slack / danielsmidstrup1@gmail.com)
Pedagogy advisor: **Louise** (copy on the "de 10 H'er" framework + anything
about how the hints should feel age-appropriate)

For Figma access, handoff format, or scope questions → Daniel first.

---

*This doc is the single source of truth for design work. If it conflicts
with older docs like `interactive-content-plan.md`, this wins.*
