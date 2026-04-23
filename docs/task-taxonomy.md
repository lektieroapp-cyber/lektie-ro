# Task taxonomy — what LektieRo encounters across grades 1–7

Notes from reviewing ~75 homework-page photos across grades 1–7, covering
matematik, dansk, engelsk, and tysk. Builds a mental model of what the
vision extractor (`/api/solve`) and hint-flow prompts (`lib/prompts.ts`)
need to handle — and flags the patterns that aren't obvious from the
pedagogy docs alone.

Source material lives locally in `task-samples/` (git-ignored — GDPR).

---

## Per-grade × per-subject snapshot

### 1. klasse — matematik
Strong visual / hands-on bias. Examples:
- **Pindediagrammer** — bar/pin diagrams with x-marks per cell. Kid has
  to count rows/columns, mark cells.
- **Spejling** — mirror-symmetry on dot grids. Kid draws the mirrored
  shape.
- **Hvor mange i alt / flest / færrest** — reading numbers off their own
  drawn chart.

Key trait: **you cannot "solve" these in chat**. AI must explain and
direct the kid to paper.

### 2. klasse — matematik
- **Pladsværdi med mønter** (1000/100/10/1-icons): "hvor meget i alt?"
- **Shop-scenarier** ("Genbrugsbutik") with priced items — multi-step
  mental math.
- **Addition in grids**: 186 + 115 = …

Mix of hands-on (drawing amounts with coin icons) + chat-solvable math.

### 3. klasse — matematik
- **Udfyld regnetabeller** — multiplication/division tables to fill.
- **Multi-table pages** — 4–5 small tables, each a mini exercise.
- **Spider diagrams**: "Skriv divisionsstykker som giver 6" — 10 blank
  ovals around a centre.
- **Tjek-selv rows** — predefined check-your-answer sections.

### 3. klasse — dansk
- **Modsætninger** — match opposites, 12 numbered blanks.
- **Stavelser** — split words into 1-, 2-, 3-stavelsesord.
- **Fill-in-the-blank sentences** — verb/adjective slots.

### 3. klasse — engelsk
- **Billed-vokabular** — pictures + English labels (bus, bike, boat…).
- **"I like / I don't like" sentence writing** — free composition.
- Handwritten kid answers already on the page in some scans.

### 4. klasse — dansk
- **Navneord** — tables for ental/flertal × ubestemt/bestemt forms.
- **Bøjningsform** fill-in — 12 numbered sentences.

### 4. klasse — matematik
- **Læs-og-forstå tekststykker** (word problems): "Sigurds busser".
- Multi-part: **Opgave 1 a/b/c, Opgave 2 a/b/c, Opgave 3 a/b/c**.
- Shared-context → sub-questions build on the same story/data.
- **Tabeller med data** (ugedage, passagerer).

### 4. klasse — engelsk
- **Free writing** — "My To-Do List", letters ("Dear…").
- **Interview-style** — "Walk around in class and interview two friends".
  Writes notes in a table with Name + 4 question-columns.
- Can't be solved in chat; AI guides structure.

### 5. klasse — dansk
- **Tegnsætning** — dialog + comic strip. Apply rules + write down.

### 5. klasse — matematik
- **Dense numbered opgaver** — "Opgave 24, 25, 26…35".
- Each has **a–j** sub-items. A page can easily have 40+ individual
  problems grouped into 10+ "opgaver".
- Topics: afrunding, store tal, negative tal, divisionsstykker, "skriv
  en regnehistorie".

### 5. klasse — engelsk
- **Recipes + verb-tagging**: read a recipe, find eight verbs, write
  regular in red and irregular in blue.
- Color-coded visual tagging — hands-on.

### 5. klasse — tysk
- **Ordslange** (snake puzzle): find concatenated German words.
- **Ordrammer** (letter-grid word search).
- **Find sætningerne i ordordenen**: visual-puzzle style.

### 6. klasse — dansk
- **Stavetræning** — read a multi-paragraph text, then dictate it.
- **Find egennavne** — pick proper nouns out of the text.
- **Find dobbeltkonsonant** words.
- **Synonymer** — synonym-matching table.

### 6. klasse — matematik
- **Potenser** (10², 10³…10⁹): "Indsæt >, < eller =".
- **Store tal**: billiards etc.
- **Strategi / spillebrætter** — dice-roll games.

### 6. klasse — engelsk
- **Who Am I? / What About You?** — identity statements, guess the
  classmate.
- Personal, free-form.

### 7. klasse — matematik
- **Statistik**: hyppighed, frekvens, median, kvartiler.
- **Histogrammer + cirkeldiagrammer** — drawing charts from data tables.
- Visual + analytical hybrid.

### 7. klasse — tysk
- **Das Klassenzimmer** — vocabulary with der/die/das article drill.
- **Diktat** — lærer læser, elev skriver.
- **Oversættelse** (German → Danish) — positional phrases (auf, in, an,
  unter, neben).

---

## Patterns that drive design

### A. Hands-on vs chat-solvable tasks
A huge fraction of folkeskole homework REQUIRES paper — drawing, measuring,
colouring, writing a full letter, doing dictation. Chat can help the kid
understand, but the kid produces the answer physically.

**Implementation**: vision extractor returns `needsPaper: boolean` per
task. Hint prompt flips to coach-mode when true: explain how, don't drill
"what's the answer?".

### B. Multi-part word problems with shared context
Grade 4+ math has "Opgave 1: [story]" followed by "a), b), c)" all based
on that story. These MUST be extracted as one group with labelled steps
— not three independent tasks.

### C. Dense numbered pages
Grade 5+ matematik books pack 10–15+ "opgaver" per page, each with its
own sub-items. Our old cap of 6 groups × 12 steps was too low.

**Implementation**: caps raised to 8 groups × 20 steps.

### D. Reading-based tasks
Grade 6 dansk, grade 5 engelsk: task presupposes kid reads a multi-
paragraph text first. Hint must NOT dive into questions until the kid has
actually read.

### E. Creative / free tasks
Grade 4 engelsk letters, grade 6 dansk synonyms with free choice, grade 3
engelsk "I like/don't like" sentences. **No right answer.** Hint helps with
structure, praises specificity, doesn't check against a key.

### F. Language puzzles (grade 5+ tysk specifically)
Snake puzzles, letter grids, sentence unpacking. Rule-explanation
+ one worked example + kid tries.

### G. Mixed-language tasks
- English: English content + Danish meta-instructions + sometimes
  Danish vocabulary sections.
- German: German content + Danish meta-instructions.
- Both need Danish-native guide with target-language understanding.

### H. Color/spatial references on the page
"Den lyseblå cirkel", "den røde pil", "ord fra side 21". The vision
extractor needs to surface these cues in step prompts so Dani can
reference them later without seeing the original image again.

### I. Tysk as a full subject
Starts in grade 5 per Fælles Mål. Minimal curriculum (grades 5–7) now in
`lib/curriculum/tysk.ts` — extend with real teacher input.

---

## Code changes shipped from this review

1. **`Subject` type** adds `"tysk"` (`lib/curriculum/types.ts`).
2. **`lib/curriculum/tysk.ts`** — minimal grade 5–7 curriculum.
3. **Subject aliases** accept `german`, `deutsch`, `tysk`.
4. **Vision prompt** allows `subject: "tysk"` and expanded task-type enum
   (multiplication, division, symmetry, reading, dictation, vocabulary,
   spelling, syllables, puzzle, creative, interview, table, diagram…).
5. **`needsPaper: boolean`** per task — flows through extractor → Task →
   hint prompt → a new `buildTaskPatternBlock` that switches modes.
6. **Task-pattern block** in the hint prompt dispatches scaffolding based
   on `type`: word-problem, reading/dictation, creative, vocabulary,
   puzzle. See `buildTaskPatternBlock()` in `lib/prompts.ts`.
7. **Caps raised**: 6→8 groups per page, 12→20 steps per group.
8. **TaskPicker** shows a `✏ PAPIR` chip on hands-on tasks so kids see
   up-front that this one needs paper.

---

## Open gaps (not fixed yet)

- **Colour cue preservation** — vision prompt doesn't yet explicitly ask
  for "mention any colour references in step prompts". Worth a pass.
- **Multi-page references** — "se side 14" — currently caught by
  `[needphoto]` but could be smoother.
- **7. klasse matematik statistics** — histograms + cirkeldiagrammer
  reasoning is more than we can currently scaffold well. Curriculum
  `matematik` grade 7 may need expansion.
- **Real tysk teacher input** — the curriculum here is a first-pass
  sketch. Teacher interview needed to validate.
- **Creative task anti-patterns** — right now `creative` type triggers
  generic "help with structure" guidance; specific letter / interview
  / self-description templates would help more.
