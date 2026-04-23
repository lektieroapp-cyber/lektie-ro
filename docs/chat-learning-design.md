# Chat-learning design — making every turn a learning moment

This is the definitive design spec for the kid-facing homework chat. It
stitches together the pedagogical guidance (`pedagogy.md`),
the grade-by-grade curriculum (`lib/curriculum/`), the visual-design system
(`DESIGN.md`), and the structured-content ambition (`interactive-content-plan.md`)
into one concrete plan for **how a chat turn should look, feel, and teach**.

Read this when:
- Deciding what visual element to add to a subject
- Tuning the AI system prompt for a new grade
- Reviewing whether a chat flow is "good" (completion rate + stuck-then-solved rate)

---

## 0. North star

Every chat turn should do three things — in this order:

1. **Honour the kid's last contribution** — name what they tried, even if wrong
2. **Show the next step visually** — not just tell it
3. **Hand control back** — with one small, askable question

A turn that does all three feels like a teacher sitting beside the kid. A turn
that only does #3 is a chatbot. The difference is the whole product.

The underlying rule (from `CLAUDE.md`) applies to every turn: **never give the
final answer.** Everything below is about how to make the guided path feel as
alive as possible inside that constraint.

---

## 1. Principles

### P1. Visual first for grades 0–4, hybrid for 5–7, notation-first for 8+

Young kids (6–9) process concrete before abstract. A ten-frame with 4 coral
dots + 7 butter dots teaches place-value carrying faster than the sentence
"4 + 7 = 11, so you carry 1 ten." Mid-grade (10–12) kids can read either; use
the visual as the hook, notation as the follow-through. Older (13+) kids can
handle notation directly but still benefit from quick diagrams on hard topics.

### P2. Manipulatives over text walls

A dense paragraph explaining fractions is worse than a sliced fraction bar.
When in doubt, reach for the visual component library (§4) before writing
another paragraph.

### P3. Chunk the ask, escalate on request

The AI produces one-thing-at-a-time steps. The kid advances when they want to,
not on a timer. Hints unlock only when asked. Each hint smaller than the prior
prompt — never bigger. (Enforced by prompt; see §6.)

### P4. Name the step, name the concept

Kids learn vocabulary through repetition. If a step uses "tier og enere",
reinforce "tier = 10, enere = 1" once, then use the terms. Over 10 sessions
the kid internalises the language. This is a *product advantage* over
a chatbot that paraphrases constantly.

### P5. Always frame as overkommelig

The very first AI turn of any task says something like "Den her kan du sagtens
klare" or breaks the task into parts upfront so the kid sees the whole shape.
This is Louise's core anti-anxiety move. Non-optional.

### P6. Celebrate understanding, not correctness

"Godt, du så at 24 er 20 + 4" beats "Rigtigt!" every time. Name what clicked.
Growth-mindset language is a compounding product effect over months.

---

## 2. Anatomy of a great turn

Every assistant turn has the same skeleton. Not every turn needs every slot —
but the slots are the grammar.

```
┌─────────────────────────────────────────────┐
│  [acknowledge]                              │  ← 0-1 short sentences
│   "Godt set — du kiggede på tierne først."  │
│                                             │
│  [visual block]                             │  ← optional, subject-specific
│   ten-frame │ number-line │ syllable-chips  │
│   verb-timeline │ fraction-bar │ ...        │
│                                             │
│  [setup]                                    │  ← one or two sentences
│   "Nu mangler vi enerne: 4 + 7."            │
│                                             │
│  [ask]                                      │  ← ONE question, askable
│   "Hvad sker der når 4 + 7 går over 10?"    │
└─────────────────────────────────────────────┘
```

### Slot rules

| Slot | Required? | Length limit | Fail mode |
|---|---|---|---|
| acknowledge | after turn 1 | 1-2 sentences | Don't fake-praise. If kid was wrong: "Tæt på — du havde tierne rigtigt, men …" |
| visual block | subject/task-dependent | one block per turn, never two | Falling back to text is fine if the visual would be contrived |
| setup | yes | 1-3 sentences | Can be skipped on simple turns |
| ask | yes | one question | Never two questions. Never a yes/no if it closes the loop. |

### Turn-count budget

- **Explain mode:** 1 AI turn, then kid picks "Prøv nu selv" or "Jeg har brug for hjælp"
- **Hint mode:** hard cap 8 AI turns per task. Warn at 6. Most tasks resolve in 3–5.
- **Average target (launch):** 4.2 turns per task for grade 3 math. Measure.

---

## 3. Visual component library

These are the reusable manipulatives. Each has a stable contract (input props,
output events) so the AI's structured output can reference them cleanly. See
§6 for the output format.

### 3a. Math

| Component | When to use | Grade range | Props |
|---|---|---|---|
| **NumberSplit** | Decompose a 2-digit number into tens + ones | 1–3 | `whole, tens, ones, revealed` |
| **NumberLine** | Show hops along a linear sequence | 1–5 | `from, to, step, label, highlight?` |
| **TenFrame** | Visualize 0–20 with carrying | 0–2 | `a, b` (fills first a coral, next b butter) |
| **Base10Blocks** | Stack tens-rods + ones-cubes | 1–3 | `tens, ones` |
| **FractionBar** | Horizontal bar sliced into parts | 3–6 | `parts, filled, compareTo?` |
| **FractionPie** | Alternative for "a slice of cake" framings | 3–5 | same as bar |
| **BalanceScale** | Equations as a see-saw | 5–7 | `left[], right[]` |
| **CoordinateGrid** | Plot a point, read coordinates | 4–7 | `xMin,xMax,yMin,yMax, points[]` |
| **ShapeOutline** | Classify polygons, count sides | 1–3 | `shape, label?` |
| **Clock** | Read hel/halv/kvart past | 2–3 | `hour, minute, showHands` |
| **MeasurementStrip** | cm/m conversion | 2–4 | `unit, value, markEvery` |

### 3b. Dansk

| Component | When to use | Grade range |
|---|---|---|
| **SyllableChips** | Tap to break a word into syllables (`ka-nin`) | 0–2 |
| **SilentLetterHighlight** | Circle the silent `d` in `bord`, `h` in `hvem` | 1–4 |
| **SentenceBuilder** | Drag jumbled words into grammatical order | 2–5 |
| **WordClassSort** | Drag words into navneord / udsagnsord / tillægsord buckets | 3–6 |
| **CommaCandidate** | Click where a comma might go, then confirm | 4–7 |
| **ContextClueHighlight** | Highlight neighbor words around an unknown word | 3–6 |
| **StoryMap** | Timeline of who-did-what-when for reading comprehension | 3–7 |
| **DoubleConsonantCheck** | Shows `løb` vs `løbbe` with rule explanation on tap | 2–4 |

### 3c. Engelsk

| Component | When to use | Grade range |
|---|---|---|
| **VerbTimeline** | Drag verb to past / now / future | 3–6 |
| **PictureWordMatch** | Drag image to English word | 3–5 |
| **SentenceRebuild** | Jumbled English sentence → grammatical order | 4–7 |
| **FalseFriendAlert** | Card that flags DA≠EN lookalikes (eventuelt ≠ eventually) | 5–9 |
| **ContractionReveal** | `do not → don't` split/merge animation | 3–6 |
| **SideBySideTranslation** | DA on left, EN on right, highlight matching chunks | 3–7 |
| **PronunciationBar** | Waveform + mic (ElevenLabs/Azure Speech, phase 3) | 3–7 |

### 3d. Universal

| Component | Use |
|---|---|
| **StepPips** | Top-of-screen progress (we already have this) |
| **HintStack** | Collapsed butter pills the kid can reveal one at a time |
| **BreakTimer** | "Tag en pause" — 2-min countdown, Dani sleeping mood |
| **TryItInput** | Inline numeric / short-text answer with Tjek button |
| **CelebrationPulse** | Soft coral glow + bobbing companion when kid completes a step |

---

## 3e. Build status — what's ready vs. what a designer needs to mock

Legend: **✅ Ready** (coded + usable) · **🧠 Specced** (contract above, no
pixels yet) · **🎨 Needs design** (designer should mock before we build).

### Flow surface components (already live in `components/session/`)

| Component | Status | File |
|---|---|---|
| Companion (12 animal SVGs + moods + bobbing + thinking bubble) | ✅ Ready | `components/mascot/Companion.tsx` |
| Home greeting card (ScanPanel — dashed camera card + footer pill) | ✅ Ready | `ScanPanel.tsx` |
| Scanning state (paper + scan line + 3-phase copy) | ✅ Ready | `ThinkingPanel.tsx` |
| Subject picker (3-col color-tinted grid) | ✅ Ready | `SubjectPicker.tsx` |
| Task picker (numbered rows, subject-tinted badges) | ✅ Ready | `TaskPicker.tsx` |
| Mode selector (three-mode cards with inline SVG icons) | ✅ Ready | `ModeSelector.tsx` |
| Socratic chat (Dani bubble + kid bubble + pip indicator + hint button) | ✅ Ready | `HintChat.tsx` |
| Celebration screen (confetti + sparkles + companion) | ✅ Ready | `HintChat.tsx → CelebrationPanel` |
| Step pips progress dots | ✅ Ready | inline in `HintChat.tsx` |
| Avatar picker modal (12 companions) | ✅ Ready | `components/children/AvatarPicker.tsx` |
| Sidebar / account menu avatar | ✅ Ready | `components/app/AccountMenu.tsx` |

### Math visual blocks (all 🧠 Specced — none coded yet)

| Block | Status | Needs designer? |
|---|---|---|
| `NumberSplit` — decomposes 24 into 20+4 with a branch diagram | 🎨 **Needs design** | Yes — simple SVG branch, but size/typography rhythm matters |
| `NumberLine` — animated arc hop | 🎨 **Needs design** | Yes — hop arc style, tick density, color when active |
| `TenFrame` — 5×2 grid with carry overflow | 🎨 **Needs design** | Yes — dot style, fill animation, overflow row layout |
| `Base10Blocks` — vertical tens-rods + ones-cubes | 🎨 **Needs design** | Yes — block proportions, grow animation spec |
| `FractionBar` — horizontal bar with slices | 🎨 **Needs design** | Yes — slice widths, compare-to variant |
| `FractionPie` — slice of a circle | 🎨 **Needs design** | Yes — pie wedge style |
| `BalanceScale` — see-saw equation | 🎨 **Needs design** | Yes — scale tilt + balance animation is subtle |
| `CoordinateGrid` — plot a point | 🎨 **Needs design** | Yes — axes, ticks, point callout |
| `ShapeOutline` — classify polygon | 🎨 **Needs design** | Low priority, simple SVG |
| `Clock` — analog face | 🎨 **Needs design** | Yes — hand proportions, hour/minute clarity |
| `MeasurementStrip` — cm/m ruler | 🎨 **Needs design** | Yes — tick rhythm, unit switch |

### Dansk visual blocks (all 🧠 Specced)

| Block | Status | Needs designer? |
|---|---|---|
| `SyllableChips` — tap to split `ka-nin-er` | 🎨 **Needs design** | Yes — chip colors (cycling coral/butter/sky), tap-through feedback |
| `SilentLetterHighlight` — circle the silent `d` | 🎨 **Needs design** | Yes — highlight treatment (ring? underline? color?) |
| `SentenceBuilder` — drag jumbled words | 🎨 **Needs design** | Yes — drop zones, drag shadow, validation state |
| `WordClassSort` — drag words into 3 buckets | 🎨 **Needs design** | Yes — bucket visual, cross-bucket snap |
| `CommaCandidate` — tap position in sentence | 🎨 **Needs design** | Yes — inline caret marker, confirm state |
| `ContextClueHighlight` — glow neighboring words | 🎨 **Needs design** | Yes — glow vs underline decision |
| `StoryMap` — timeline who/what/when | 🎨 **Needs design** | Yes — node layout, timeline axis |
| `DoubleConsonantCheck` — `løb` vs `løbbe` | 🎨 **Needs design** | Low priority |

### Engelsk visual blocks (all 🧠 Specced)

| Block | Status | Needs designer? |
|---|---|---|
| `VerbTimeline` — past / now / future pill row | 🎨 **Needs design** | Yes — timeline axis, pill active state |
| `PictureWordMatch` — drag image to word | 🎨 **Needs design** | Yes — image + word zone layout |
| `SentenceRebuild` — jumbled EN sentence | 🎨 **Needs design** | Shares layout with Dansk `SentenceBuilder` — can reuse |
| `FalseFriendAlert` — DA≠EN warning card | 🎨 **Needs design** | Yes — warning-style coral card with comparison |
| `ContractionReveal` — `do not → don't` | 🎨 **Needs design** | Animation-heavy, nice-to-have |
| `SideBySideTranslation` — DA/EN with chunk highlights | 🎨 **Needs design** | Yes — column alignment, highlight sync |
| `PronunciationBar` — waveform + mic | 🧠 Specced | Phase 3+ (needs Azure Speech first) |

### Universal blocks

| Block | Status | File / notes |
|---|---|---|
| `StepPips` progress dots | ✅ Ready | inline in HintChat header |
| `HintStack` — collapsed butter pills to reveal one at a time | 🎨 **Needs design** | Yes — today hints flow as new bubbles; this is a different pattern |
| `BreakTimer` — 2-min countdown + sleepy companion | 🎨 **Needs design** | Yes — circular timer ring style |
| `TryItInput` — inline numeric/short-text answer | 🎨 **Needs design** | Yes — inline bubble input with Tjek + 3-state feedback (right/close/wrong) |
| `CelebrationPulse` — soft glow on correct step | 🎨 **Needs design** | Yes — short animation, not confetti-big |

### Summary for the designer

Give them **this list** and ask for mocks in priority order:

1. **Tier-1 (launch must-haves — 4 blocks):**
   `TenFrame`, `NumberSplit`, `SyllableChips`, `TryItInput`
   These cover the highest-volume task types (addition carry, decomposition,
   reading, and inline answer-check). Enough for grade 1–3 math + grade 1–2
   dansk.

2. **Tier-2 (broadens to grades 3–6 — 6 blocks):**
   `NumberLine`, `FractionBar`, `WordClassSort`, `SentenceBuilder`,
   `VerbTimeline`, `HintStack`

3. **Tier-3 (fills out grades 5–9 — rest of the list):**
   `BalanceScale`, `CoordinateGrid`, `CommaCandidate`, `StoryMap`,
   `SideBySideTranslation`, `FalseFriendAlert`, `BreakTimer`, etc.

Every block needs: (a) Figma mock at 3 states (idle / interacting / solved),
(b) any animation spec (duration, easing, what triggers it), (c) specific
color tokens from `DESIGN.md` (K.coral / K.sky / K.mint / K.butter / K.plum).

---

## 4. Grade ladders — what to expect

These are **load-bearing for prompt tuning**. The AI uses them to pick
manipulatives and match vocabulary. Source: Fælles Mål + `lib/curriculum/`.

### 4a. Matematik

| Grade | Typical tasks | Visuals to reach for |
|---|---|---|
| **0** (Bh.kl.) | Count to 20, match numerals to quantities | TenFrame, ShapeOutline |
| **1** | +/− within 10, halv/dobbelt, basic shapes | TenFrame, NumberLine, ShapeOutline |
| **2** | +/− within 20, mul as repeated add, ½/¼, cm/m, clock (hel/halv) | Base10Blocks, FractionPie, Clock, MeasurementStrip |
| **3** | +/− within 100, 2×/5×/10× tables, basic division, simple word problems, mm/cm/m, symmetry | NumberSplit, NumberLine, Base10Blocks, FractionBar |
| **4** | +/− 3-digit, full mul tables, long-division start, brøker + decimaler, perimeter/area | FractionBar, CoordinateGrid (intro), BalanceScale (intro) |
| **5** | Mixed numbers, %, negative numbers, simple equations, volume | BalanceScale, FractionBar, CoordinateGrid |
| **6** | Brøker/decimaler/% interchangeable, algebra basics, geometry (vinkler) | BalanceScale, CoordinateGrid, protractor (future) |
| **7** | Linear equations, ratios, probability intro | BalanceScale, StoryMap-style word-problem breakdown |

### 4b. Dansk

| Grade | Typical tasks | Visuals |
|---|---|---|
| **0** | Bogstav-lyd, enkle ord | SyllableChips (intro) |
| **1** | Læse 2-3 stavelsesord, skrive egne navn, rim | SyllableChips, DoubleConsonantCheck |
| **2** | Læse tekster 100+ ord, stavning, enkel grammatik (navneord) | SyllableChips, WordClassSort (intro) |
| **3** | Forståelse af tekster, tillægsord, udsagnsord, enkel sætningsstruktur | WordClassSort, SentenceBuilder, SilentLetterHighlight |
| **4** | Hovedsætninger/ledsætninger, kommaregler (start), stavekontrol | CommaCandidate, ContextClueHighlight |
| **5** | Analyse af noveller, skriftlig fremstilling, genrekendetegn | StoryMap, WordClassSort |
| **6** | Argumenterende tekster, kilder, sprogbrug | StoryMap (expanded), CommaCandidate (advanced) |
| **7** | Tekstanalyse, retorik, kommatering fuld | CommaCandidate, StoryMap |

### 4c. Engelsk

| Grade | Typical tasks | Visuals |
|---|---|---|
| **3** | Hilsner, farver, tal 1-20, enkle sætninger | PictureWordMatch, SideBySideTranslation |
| **4** | Present tense, hverdagssprog, enkle spørgsmål | VerbTimeline (intro), SideBySideTranslation |
| **5** | Past tense, "yesterday / today / tomorrow", simple writing | VerbTimeline, SentenceRebuild |
| **6** | Flere tider, simple stories, false friends | FalseFriendAlert, VerbTimeline, ContractionReveal |
| **7** | Conditional, reported speech, longer writing | VerbTimeline (advanced), SentenceRebuild |

---

## 5. Learning tactics — what we bake into every session

From Louise's input + learning-science canon. Each tactic has a concrete
expression in the chat.

### 5a. The 10 H's framing (opening turn)

When a kid opens a task in **explain mode**, the AI reaches for the relevant
H's. Never all 10 — pick the 2-3 that matter for this task type.

**Example (grade 3 math word problem):**
> **Hvad skal du lave?** Du skal finde hvor mange æbler Lærke og Jonas har i alt.  
> **Hvor meget er der?** To tal — 5 og 8. Det er overskueligt.  
> **Hvordan griber vi det an?** Vi lægger dem sammen med en ti-ramme hvis det er nemmere.  
> Prøv nu — hvor vil du starte?

### 5b. Ros-ris-ros (every corrective turn)

```
[ros]  Du havde tierne helt rigtigt — 20 + 10 = 30.
[ris]  Men ved enerne røg tierne på glatis. 4 + 7 er mere end 10, så noget skal bæres over.
[ros]  Det er den sværeste del af opgaven, og du er på den rigtige side af den.
[ask]  Skal vi kigge på hvad 4 + 7 bliver, før vi går videre?
```

Code the AI's system prompt to follow this pattern when correcting.
Never correct in a flat "det er forkert" — that pattern is banned.

### 5c. Retrieval-based reinforcement

At the start of a new session with a returning kid, the AI *may* reference
the last 1-2 tasks: *"Sidste gang løste du en lignende en — 36+19 — kan du
huske tricket?"* This is a compounding quality win. Implement once sessions
table is live (migration 006).

### 5d. Active pauses by age

| Age | When to suggest | How |
|---|---|---|
| 6–9 | After 3 turns of struggle | "Lad os strække os — rejs dig og tæl til 10." Dani sleepy. |
| 10–12 | After 5 turns | "Tag et glas vand. Du klarer det om lidt." Dani thinking. |
| 13+ | After 7 turns | "Jeg kan se du arbejder hårdt. Hvad med en kort pause?" Short & respectful. |

Automated suggestion at the Nth turn of the same task without progress.

### 5e. Reference previous as bridge

When a new concept is introduced, link to prior knowledge:
*"Kan du huske `½`? `¼` fungerer på samme måde — bare med fire dele."*
Each grade's `approachHints` in curriculum data can seed these references.

### 5f. Frame as overkommelig — every opening turn

No task should feel infinite. Open every task with either:
- **Break it down:** "Opgaven har to dele. Vi tager den første først."
- **Shrink it:** "Det ligner meget, men vi har kun brug for de tre midterste tal."
- **Chunk it:** "Første skridt: bare find de store tal."

---

## 6. AI output format — structured blocks

Current `/api/hint` streams plain text. To enable the visual library, the
LLM outputs **inline block tags** parsed by the bubble renderer. Non-block
content is regular prose.

### Block grammar

```
[num-split whole="24" tens="20" ones="4"]
[num-line from="20" to="30" step="10" label="+10"]
[ten-frame a="4" b="7"]
[fraction-bar parts="4" filled="3"]
[syllable-chips word="kaniner" break="ka|ni|ner"]
[word-class-sort items="hund:n,løber:v,hurtig:a,..."]
[verb-timeline word="went" position="past"]
[step-list]
1. Find tallene
2. Vælg regningsart
3. Regn ud
[/step-list]
[try-it expected="41" placeholder="Skriv dit bud"]
```

### Block rules enforced in the system prompt

1. **Max one block per turn.** Two visuals = split into two turns.
2. **Blocks are optional.** Plain text is always valid.
3. **All block attributes are quoted strings.** Parser is forgiving of
   whitespace but strict on quotes.
4. **Unknown blocks render as literal text + logged.** Never crash the turn.
5. **Close multi-line blocks** (e.g. `[step-list]...[/step-list]`). Single-line
   blocks (e.g. `[ten-frame a="4" b="7"]`) are self-closing.

### Bubble renderer responsibilities

- Regex-tokenise the streamed text into `{kind: "text" | "block", ...}` chunks
- Render text runs with the existing `RichText` (bold + line-break handling)
- Render known blocks with their React components
- On unknown block: render the raw tag as dim text + `console.warn`
- Progressive rendering: a streaming mid-block incomplete tag renders as a
  placeholder skeleton until the closing bracket arrives

Reference: `components/session/HintChat.tsx → DaniMessage → RichText`.

---

## 7. Subject deep-dives — concrete chat flows

These are the gold-standard examples. The AI is tuned to reproduce this
shape, not copy these exact words.

### 7a. Matematik — 24 + 17 (grade 3, hint mode)

```
Dani: Godt spotted — opgaven beder dig om at regne 24 + 17 sammen.
      [num-split whole="24" tens="20" ones="4"]
      Hvis vi deler tallene op i tier og enere, bliver det nemmere.
      Hvad er tierne i 17?

Kid:  10

Dani: Perfekt — 17 består af 10 og 7.
      Nu har vi to tier-par (20 og 10) og to ener-par (4 og 7).
      Skal vi starte med tierne eller enerne?

Kid:  Tierne

Dani: Smart valg — tierne er lettest.
      [num-line from="20" to="30" step="10" label="+10"]
      Hvad bliver 20 + 10?

Kid:  30

Dani: Du så det med det samme. Nu enerne.
      [ten-frame a="4" b="7"]
      Kig på ti-rammen. Ser du hvad der sker når 4 + 7 går over 10?

Kid:  Det bliver 11

Dani: Præcis — 4 + 7 = 10 + 1. Du har delt det helt rigtigt.
      Nu lægger vi sammen: 30 og 11. Hvad tror du det giver?

Kid:  41

Dani: DU GJORDE DET. 24 + 17 = 41, og du regnede det selv ud. Flot.
```

6 turns. One visual per turn. Ros-ris-ros baked in. Concept naming
("tier og enere", "over 10"). Final answer comes from the kid.

### 7b. Dansk — kommaregler (grade 4, explain mode)

```
Dani: Opgaven lyder: "Sæt komma: Da vi kom hjem var hunden glad."
      Det handler om at finde det punkt, hvor sætningen deler sig.
      [sentence-builder words="Da|vi|kom|hjem|var|hunden|glad"]
      Læs den langsomt for dig selv — hvor føles der en lille pause?
```

Then in follow-up hint turns, AI reaches for `CommaCandidate` to make the
decision-point tappable.

### 7c. Engelsk — past tense (grade 5, hint mode)

```
Dani: "Yesterday I ___ to the park." Lad os finde det rigtige ord.
      [verb-timeline word="go" past="went" present="go" future="will go"]
      "Yesterday" peger bagud i tid. Hvilken form af "go" passer?

Kid:  went

Dani: Yes! "Went" er datid af "go". Samme mønster som "see → saw".
      Kan du skrive hele sætningen med "went"?

Kid:  Yesterday I went to the park.

Dani: Perfekt — stort Y, punktum i enden, og datid passer. Du har den!
```

3 turns, one visual, vocabulary reinforcement ("datid"), pattern link
(go→went as analog to see→saw).

---

## 8. Engagement without bribery

We deliberately **do not** ship XP / streaks / collectible stickers in the
first launch. Those patterns risk extrinsic motivation (kid plays for reward,
not for mastery). What we do ship:

- **Step pips** at the top of the task — kid feels forward motion within one
  problem, not across days
- **Companion mood shifts** — Dani goes from `curious` at turn 1 to `cheer`
  at completion. Free dopamine, no score.
- **Naming the understanding** — "du delte det helt rigtigt" is memorable in
  a way that "+50 XP" is not
- **Soft celebration screen** — confetti + bobbing companion + "Du klarede
  det!" — one beat of joy, then the next task. No leaderboard.

Revisit streaks/XP *after* we see actual retention data. If completion rate
is already >70% without gamification, we don't need it.

---

## 9. Age-band modulation

One AI, three personalities, keyed by `child.grade`:

| | 6–9 (grade 0–3) | 10–12 (grade 4–6) | 13–15 (grade 7+) |
|---|---|---|---|
| **Companion size** | 48-72px, always present | 36-56px, mid-screen | 32-44px, corner |
| **Copy density** | 1-2 short sentences | 2-3 sentences | 3-4 sentences, can use subclauses |
| **Visuals** | Every turn | Every 2nd turn | First turn + on-demand |
| **Reading level** | No subclauses, no academic words | Normal fourth-grade text | Can use fagtermer with inline gloss |
| **Hint pace** | 3 hints, gentle, auto-offered if stuck 2 turns | 2 hints, on request | 1 hint, collapsed by default |
| **Celebration** | Confetti + Dani jump + naming | Confetti + brief praise | Subtle checkmark + streak bump |

Implementation: one system-prompt variant per age-band, injected alongside
subject + grade + child's interests.

---

## 10. Failure modes to guard against

### 10a. Answer-leak

Biggest risk. Mitigations already in place:
- System prompt rule #1
- Post-response regex check: if assistant message contains the literal
  `expectedAnswer`, reject and regenerate
- Max 2 regenerations per turn, else fall back to a stock "Lad os prøve en
  anden vinkel" message

Add an eval suite: 200 real Danish homework tasks × 3 adversarial kid prompts
("just tell me the answer", "I don't want to think", "my mom said you should
tell me"). Measure leak rate — target = 0.

### 10b. Empty or broken block

Unknown / malformed block tag → render as dim literal text. Never crash the
bubble. Always log so we can tune the prompt.

### 10c. Wrong grade interpretation

AI treats a grade-2 task like grade-6. Mitigation: curriculum text is
injected into the prompt *including* the specific grade's typical
vocabulary. The model must not introduce terms outside that grade's
`terms` dictionary without inline explanation.

### 10d. Infinite loop

8-turn hard cap enforced client-side in `HintChat.tsx` (MAX_TURNS = 8, warn
at 6). After 8 turns the card collapses to an "Afslut" prompt.

### 10e. Tone drift

Kid types something sad ("jeg er træt", "jeg hader matematik"). AI should
acknowledge ("Det er okay — matematik kan godt være træls") before continuing.
Never ignore. Tune the system prompt to detect + acknowledge emotional state.

---

## 11. Implementation roadmap

### Phase 1 — plain text (done ✓)
- Streaming chat via Azure gpt-5-mini
- Markdown-lite rendering (bold, line breaks)
- Companion in speech bubble
- Step pips
- Celebration screen

### Phase 2 — structured blocks (next)
- [ ] Parser in `RichText`: tokenise `[block ...]` + `[block]...[/block]`
- [ ] `<Block>` component map — wire each component from §3 to its block tag
- [ ] Progressive rendering for streamed mid-block content
- [ ] System-prompt update: block grammar + rule #1-5 from §6
- [ ] Eval: 20 hand-crafted tasks with expected block outputs

Start with: **NumberSplit**, **NumberLine**, **TenFrame**, **SyllableChips**,
**VerbTimeline**, **StepList**, **TryIt**. These cover ~80% of tasks we'll see
in launch subjects × grades. Add the rest reactively.

### Phase 3 — interactive input (later)
- [ ] `[try-it]` block accepts kid answer inside the bubble, POSTs to
      `/api/step-check`, renders ✓ / 🤔 close / ❌ wrong inline
- [ ] `[drag]` blocks (SentenceBuilder, WordClassSort) record the drag
      sequence as the kid's "turn"
- [ ] Voice input via Azure Speech (mic button on `[try-it]` blocks for
      ages 6–9)

### Phase 4 — ladder cache (cost optimization)
- [ ] Hash `(task_hash, grade, mode)` and cache the generated block sequence
- [ ] On cache hit: serve cached blocks, personalize text via quick gpt-5-mini
      pass that only rewrites the speech bubbles around the blocks
- [ ] Target: 60% cache hit rate after 1k sessions

---

## 12. What a "great" session looks like (measured)

| Metric | Target | Why |
|---|---|---|
| **Completion rate** | >70% | Kid finishes what they started. Below 50% = Socratic ladder is too hard. |
| **Hint escalation ratio** | ~1.2 hints/task | Too low = AI is giving too much. Too high = steps are too big. |
| **Stuck-then-solved** | >60% of tasks reach max hints but kid solves | The core Socratic proof: we didn't give up and neither did they. |
| **Answer-leak rate** | 0 | Any > 0 is a P0 bug. |
| **Avg turns per task** | 3.5–5 | Shorter = too easy. Longer = fatiguing. |
| **Return within 7 days** | >55% at week 4 | Kid wants to come back. |
| **Parent "how's my kid doing"** | >40% visit overview weekly | Validates the dual-audience thesis. |

All measurable off `sessions` + `turns` tables (migration 006). Build the
dashboard under `/admin/metrics` once we have >500 sessions.

---

## 13. Open questions

- **Voice output** — does Dani *speak* the turn (ElevenLabs) for grades 0-2
  who can't read fluently? Candidate for A/B test post-launch.
- **Hand-writing input** — kid sketches numbers on a Skia canvas instead of
  typing? Reduces the keyboard-as-barrier problem. Big build.
- **Peer mode** — two kids on one device solving together, AI adjusts for
  collaboration? Out of scope for MVP.
- **Parent "take over"** — a button the kid can press if they want the
  parent to explain instead of Dani. Good trust signal. Measure demand.

---

*Living doc. Update when a new component ships, a new subject is added, or a
tactic proves/disproves itself in real sessions.*
