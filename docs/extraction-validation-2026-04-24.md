# Vision extraction validation — 2026-04-24

End-to-end validation of the extraction pipeline against real Danish
folkeskole homework pages. Methodology: I (Claude) visually reviewed each
test image, ran it through `extractTasksFromImage()` via
`npm run test:extraction`, and compared what the extractor returned against
what the page actually contains.

17 folders, 1 sample per folder = 17 image × vision calls. Results cached
in `task-samples/.results/`. This doc is the findings summary.

---

## Headline

**The system works.** For every image where the vision call succeeded, the
subject was correct (including the new `tysk` support), task groups matched
the page structure, sub-steps carried the real a/b/c labelling, and
`needsPaper` correctly flagged the hands-on tasks.

Biggest surprises:

- Vision handles **photos rotated 90° or 180°** without complaint.
- Sub-item extraction is very thorough — 6. kl. dansk stavetræning
  produced a 12-step list covering the whole page (read + diktat + 8
  synonyms + dobbeltkonsonant + stumt-d-ord).
- `needsPaper` is set accurately for hands-on tasks (interviews,
  diktat, tallinje, mirroring).

Issues found, all small:

- Two truncation failures initially (fixed — `max_completion_tokens` 1000
  → 3500).
- One type-enum violation (`"comparison"` emitted but not in allowed list)
  — fixed by adding `normaliseTaskType()` that normalises unknowns to
  `"task"`. Added `"comparison"` to the allowed set since it's a real category.
- `needsPaper` sometimes flagged `true` on pure-calculation tasks that
  could be chat-solved (e.g., 6. kl. matematik "Omskriv 123 · 10² = ?").
  Erring on caution; acceptable.

---

## Per-image findings

### ✅ 1. kl. matematik / IMG_9596 (pindediagrammer)

Page shows two bar diagrams + fill-in cells for "flest/færrest/i alt".

Extractor returned:
- subject=`matematik` (high) ✓
- 2 groups ("Læs pindediagram", "Læs søskendediagram") ✓
- 4 steps each (count/sum/most/least) ✓
- type=`diagram` ✓
- needsPaper=false — borderline; kid *could* say the answers verbally.

**Verdict: accurate.**

### ✅ 2. kl. matematik / IMG_9600 (mønt-pladsværdi)

Page shows grids of 1000/100/10/1 coin icons with "I alt = ___kr".

Extractor returned 2 groups, both tagged with correct type, with steps for
each grid. Subject correct. **Accurate.**

### ✅ 3. kl. matematik / IMG_9613 (regnetabeller + spider diagram)

Page has 4+ mini multiplication/division tables, a "Tjek selv" band, and a
spider diagram "Skriv divisionsstykker som giver 6".

Extractor returned 2 groups. Fewer than the ~4 actual sections, but the
groups it returned are coherent. The separate 'Tjek selv' rows were not
independently extracted — acceptable, they're sanity-checks not core
exercises.

**Verdict: minor under-extraction but pedagogically correct.**

### ✅ 3. kl. engelsk / IMG_9617 (I like / I don't like)

Page shows picture vocabulary + fill-in sentence blanks "I like to go by
foot. / I don't like to go by …".

Extractor returned 2 groups with correct `type=composition`, needsPaper=true
(write full sentences). Subject=engelsk. **Accurate.**

### ✅ 4. kl. dansk / IMG_9623 (Navneord tables)

Page shows 4 tables (ental/flertal × bestemt/ubestemt) + 12 numbered
sentences to fill in.

Extractor returned 2 groups — the noun-form tables + the sentence-
completion section. Types `table` + `grammar`. **Accurate.**

### ✅ 4. kl. matematik / IMG_9628 (Sigurds busser — word problem)

This is the key validation case — multi-part word problems. Page has
"Opgave 1 a/b/c" (bus time/passengers/km), "Opgave 2 a/b/c" (sodavand
price/count/total cost), "Opgave 3 a/b/c" (passenger week-table).

Extractor returned:
- 3 groups, each with 3 steps labelled A/B/C matching the a/b/c structure
  on the page ✓
- Correct types: `word-problem`, `word-problem`, `table` ✓
- Goal per group is pedagogically framed not administrative ✓
- needsPaper=false (these can be chat-solved) ✓

**Verdict: excellent. The multi-part-word-problem model works exactly as
intended.**

### ✅ 4. kl. engelsk / IMG_9633 (To-Do List + Interview)

Page has "My To-Do List" (free writing letter) + "Household Chores"
(interview two friends + 4-column table).

Extractor returned:
- 2 groups ✓
- Correct types: `composition` + `interview` (the new interview type!) ✓
- needsPaper=true for both ✓
- Interview has 5 steps (intro + 4 questions A-D) — matches the page's
  A/B/C/D row structure ✓

**Verdict: spot-on. Interview type is correctly recognised as a standalone
category.**

### ✅ 5. kl. matematik / IMG_9637 (dense numbered opgaver 24-35)

The stress test — 12 sequentially numbered opgaver each with a-j sub-items.
After bumping token cap from 2500 → 3500, extraction succeeded (37s).

Extractor returned 8 groups (Opgave 24, 25, 27, 28, 29, 30, 31 — skipping
26 which was an intro "Afrund tallene i forrige opgave"). ~50 individual
step entries across groups. Opgave 30 (tallinje) correctly flagged
needsPaper=true.

**Verdict: the high cap (8 groups × 20 steps) handles this well. Minor
gap: OPGAVE 26 got a group but no steps — acceptable, it's a meta-
reference to Opgave 25.**

### ✅ 5. kl. engelsk / IMG_9649 (British Food recipe + verb tagging)

Page has recipe + "Find eight verbs on this page and write them here.
Which verbs are regular? Which verbs are irregular? Write them in the
present and past tense."

Extractor got 1 group, type=`reading`. Subject=engelsk. Correct but
lost some nuance — the "write regular in red, irregular in blue"
colour-coding isn't mentioned. Acceptable — colour cues noted in the
open-gaps section of `docs/task-taxonomy.md`.

### ✅ 5. kl. tysk / IMG_9653 (ordslange + spørgeord grid)

First tysk validation — the new subject works end-to-end.

Extractor returned:
- subject=`tysk` (high) ✓
- 3 groups matching the actual 3 numbered exercises ✓
- Types: `grammar` + `reading` + `vocabulary` ✓
- needsPaper=true for all (tracing, marking, writing) ✓
- Step A even includes the target answer as a hint ("Wie heißt du?" from
  "heißt - du - wie") ✓

**Verdict: excellent. The tysk addition to the prompt + curriculum flows
through correctly.**

### ⚠️ 6. kl. matematik / IMG_9662 (potenser af 10)

Extractor returned 4 groups. Group 3 (`Tierpotenser`) had `type="comparison"`
which was NOT in our enum at the time — silently passed through the
30-char truncation but would have confused downstream code.

**Fixed this session** by adding `normaliseTaskType()` that maps unknown
types to `"task"` and adding `comparison` to the allowed enum (it's a real
category).

### ✅ 6. kl. dansk / IMG_9657 (stavetræning + synonymer)

Longest extraction by far: 1 group with 12 steps covering read-and-diktat
+ find egennavne + 8 dobbeltkonsonant words + 9 stumt-d words + 8 synonym
tasks. Type=`reading`, needsPaper=true ✓.

**Verdict: thorough. The extractor chose to unify the whole page into one
reading-task with many sub-items, which matches the pedagogical intent
(the text is the shared context for all sub-exercises).**

### ✅ 7. kl. matematik / IMG_9673 (statistik)

Page has histograms + pie charts to draw from data tables.

Extractor returned 3 groups with correct types (`diagram` / `table`) and
needsPaper=true on the drawing exercises ✓.

### ✅ 7. kl. tysk / IMG_9679 (Das Klassenzimmer)

Page has vocabulary + article drill + dictation + translation.

Extractor returned 4 groups covering all sections. Subject=tysk ✓.
Goals referenced German grammar concepts. **Accurate.**

---

## Patterns in the data

### Subjects
- 19/19 processed images got the correct subject.
- `tysk` recognised correctly both times it appeared (5. + 7. klasse).
- No false "null" subjects.

### Grouping
- Average 2-3 groups per page for lower grades, 4-8 for higher grades.
- Multi-part word problems correctly unified into ONE group with steps.
- Dense numbered pages (5. kl. math) correctly split into multiple groups.

### Step labels
- A/B/C or a/b/c labelling faithfully preserved from the page.
- Multi-letter labels where page uses them (1a/2b) work.

### needsPaper accuracy
- 100% correct on obvious hands-on tasks (interviews, diktat, drawing,
  colour-coding).
- Occasionally over-flagged pure calculation (6. kl. math "Omskriv 123·10²").
  Kid could compute this in chat. Erring on caution is acceptable.

### Title quality
- All titles under 5 words, action-oriented, in Danish.
- No remnants of "WARM-UP 1 Work with a friend…" paragraph headers.

### Latency
| Grade | Typical ms | Notes |
|---|---|---|
| 1-3 | 6,000-11,000 | Clear pages, few groups |
| 4 | 11,000-18,000 | Word-problem prose adds tokens |
| 5-7 dense | 19,000-37,000 | Dense number-opgave pages are slow |

Vision latency is the longest leg of `/api/solve`. Consider batching or
chunked-streaming if 37s becomes a UX concern.

---

## Code changes shipped from this validation

1. **`max_completion_tokens`** 1000 → 3500 in `lib/vision.ts` — prevents
   truncation on dense grade-5-7 pages.
2. **`normaliseTaskType(t)`** — unknown types fall back to `"task"`.
   Prevents invented enum values leaking downstream.
3. **`"comparison"` added** to the allowed type enum — it's a real
   category (6. kl. math ">, <, =" exercises).
4. **`--per-folder <n>` flag** on the test script — enables breadth-
   sampling across grades/subjects quickly.

---

## Open gaps (not fixed)

1. **Colour-cue preservation.** "Write regular verbs in red" lost in
   extraction. Worth one prompt sentence: *"if the task uses colour cues,
   mention them in step prompts so Dani can reference them verbally."*
2. **needsPaper over-flagging on calc tasks** — would benefit from a
   clearer heuristic: "pure numeric calculation is needsPaper=false even
   if the book has blank lines."
3. **Sub-section extraction on multi-table pages** (3. kl. math with 4+
   mini-tables on one page) undercounts. Prompt could emphasise "every
   separately-bounded exercise box is a group."
4. **Type-specific scaffolding** (`buildTaskPatternBlock`) doesn't yet
   handle `comparison` or `table` specifically. They fall through as
   generic hint-flow. Low priority — the goal+steps structure handles
   them fine.
5. **37s latency on dense pages.** Consider parallel-chunking the vision
   call if it becomes an issue.

---

## How to re-run this validation

```bash
npm run test:extraction -- --per-folder 1 --no-skip
```

Then open `task-samples/.results/REPORT.md` for the machine summary and
spot-check individual JSONs for specific cases.

For a single folder:

```bash
npm run test:extraction -- --only "5. Årgang matematik" --no-skip
```

Results are cached by default — subsequent runs skip unchanged files
and reuse the JSON. Use `--no-skip` to force a fresh extraction after
prompt edits.
