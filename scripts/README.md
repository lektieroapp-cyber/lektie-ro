# Dev scripts

Standalone Node scripts for testing + debugging the LektieRo pipeline outside
the Next.js runtime. Run via `tsx`.

---

## `test-extraction.ts`

Batch-runs the Azure vision extractor against every image in `task-samples/`.
Lets us see how the extractor performs across grade × subject combinations
without running a live session per image.

### Usage

```bash
# All samples
npm run test:extraction

# Only folders containing "3" (3. klasse subjects)
npm run test:extraction -- --filter 3

# One specific folder
npm run test:extraction -- --only "5. Årgang matematik"

# Cap total images (smoke test)
npm run test:extraction -- --limit 5

# Re-run everything (skip cache)
npm run test:extraction -- --no-skip
```

### Output

Everything lands under `task-samples/.results/` (git-ignored):

```
task-samples/.results/
├── 1. Årg matematik/
│   ├── IMG_9596.json        ← raw extraction + elapsedMs per image
│   ├── IMG_9597.json
│   └── ...
├── 5. Årgang engelsk/
│   └── ...
├── REPORT.md                ← human-readable summary (open in any editor)
└── summary.json             ← machine-readable stats
```

### REPORT.md format

```markdown
## Health
- Failed: 2
- 0 groups extracted: 1
- null subject: 0
- needsPaper tasks: 34
- Avg vision latency: 3840ms

## Per-folder summary
| Folder | N | Subjects returned | Avg groups | Avg steps | needsPaper | Types seen |
|---|---|---|---|---|---|---|
| 5. Årgang matematik | 4 | matematik | 5.0 | 23.5 | 0 | addition, division, word-problem |

## Per-image detail
### 5. Årgang matematik
- IMG_9637.jpeg — subject=`matematik` (high) · 5 groups / 23 steps · needsPaper=0 · types=[addition,division,word-problem] · 3521ms
  - Afrund til nærmeste 100
  - Gør tallet 17 større
  - ...
```

### Caching

By default, the script skips images where a result JSON already exists.
Run with `--no-skip` to force re-extraction (useful after you've tweaked
the prompt and want to see the new behaviour).

### Requirements

- `.env.local` with `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, and
  `AZURE_OPENAI_DEPLOYMENT` set
- Images sitting in `task-samples/<folder>/<file>.jpeg|jpg|png|webp|heic`

### Typical workflow

1. Drop zip files into `task-samples/`, unzip them
2. Run `npm run test:extraction`
3. Review `REPORT.md` — look for folders where subjects come back wrong,
   group counts are way off, or types don't match expectations
4. Open individual `<image>.json` to see the full extraction for weird cases
5. Tweak the prompt in `lib/vision.ts` (`VISION_SYSTEM_PROMPT`)
6. Re-run with `--no-skip` to see if the tweak helped
7. Commit the prompt change, leave the results uncommitted

---

## `simulate-session.ts`

Takes the cached extraction JSONs produced by `test:extraction` and runs
three-role LLM simulations on each: **Dani** (the real production hint
prompt), a synthetic **pupil** with grade- and subject-appropriate
behaviour, and a pedagogy **grader** that scores the resulting transcript.

This is the learning-loop layer. Instead of hand-testing the hint flow
against every grade × subject × task-type combo, the simulator turns an
hour-long manual session into a JSON graded by an LLM that sees the whole
transcript. The aggregate report surfaces where the prompt needs work
(e.g., grade-2 dansk scores low on `ageAppropriate`; grade-5 engelsk
scores low on `language`).

### Usage

```bash
# All cached extractions
npm run test:sessions

# Only grade-3 folders
npm run test:sessions -- --filter 3

# One specific folder
npm run test:sessions -- --only "5. Årgang matematik"

# Longer conversations (default is 5)
npm run test:sessions -- --turns 7

# Stop after n sessions (smoke test)
npm run test:sessions -- --limit 3

# Re-run even when cached session JSON exists
npm run test:sessions -- --no-skip
```

### Output

```
task-samples/.results/
├── 5. Årgang matematik/
│   ├── IMG_9637.json               ← extraction (from test:extraction)
│   └── IMG_9637.session.json       ← NEW: turns + grade
├── SESSIONS.md                     ← aggregate report
```

### `SESSIONS.md` format

- Aggregate scores across all sessions (5 dimensions, 1-5 scale)
- Per grade × subject matrix — spot the weak cells
- Weakest sessions drilldown with praise + issues
- Full transcripts of every session you can scroll and read

The 5 scoring dimensions:

1. **socratic** — Dani never gave facit directly
2. **acknowledgment** — Dani reacted to what the kid actually said
3. **onGoal** — Kept focus on the pedagogical goal, didn't repeat "Målet:"
4. **language** — Danish for meta, target language for content
5. **ageAppropriate** — Sentence length, vocab fit the grade

### Learning-loop workflow

1. Run `test:extraction` to cache extractions (if not already)
2. Run `test:sessions -- --limit 10` for a first look
3. Open `SESSIONS.md` → scan per-grade×subject table for low scores
4. Drill into weakest sessions — what did the grader flag?
5. Decide: is it a global prompt issue, or grade/subject-specific?
6. Edit `lib/prompts.ts` — either the shared block or add a
   grade/subject guard
7. Re-run with `--no-skip` to see if the tweak lifted the score
8. Commit the prompt change, leave `.results/` uncommitted

### Caveats

- Every session is 5 turns × 2 chat calls + 1 grading call = ~11 Azure
  calls. 17 images × 11 ≈ 187 calls at gpt-5-mini. Budget accordingly.
- The pupil LLM is a sim, not a real child. It won't reproduce edge-case
  kid behaviour (tears, off-topic chatter, rolling eyes at "nåede du at
  tænke?"). Treat scores as directional, not absolute.
- The grader is also an LLM, so calibration drifts. Re-run the same
  session twice and scores can differ by ±0.5.

### Requirements

Same as `test:extraction` — `.env.local` with Azure creds, plus the
extraction results must exist first.
