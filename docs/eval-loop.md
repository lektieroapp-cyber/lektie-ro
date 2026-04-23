# The evaluation loop — how we improve Dani

A repeatable process for tuning the hint prompt using real homework images
and synthetic-pupil simulations. Run it whenever you change something in
`lib/prompts.ts`, `lib/vision.ts`, or the curriculum, and whenever new
task photos land in `task-samples/`.

The loop has two layers:

1. **Extraction** — does the vision model see the page correctly?
2. **Simulation** — given a correctly extracted task, does Dani behave like a
   good tutor across grade × subject combinations?

Both layers output graded reports you can scan for patterns. That's what
turns "I think the prompt is better" into a measurable signal.

---

## The three scripts

| Script | What it does | When to run |
|---|---|---|
| `npm run test:extraction` | Runs Azure vision against every image in `task-samples/`, writes per-image JSON + aggregate `REPORT.md` | After prompt edits in `lib/vision.ts`, or after dropping new image samples |
| `npm run test:sessions` | Runs a simulated 5-turn conversation (Dani + synthetic kid + grader) for every cached extraction, writes per-image `.session.json` + aggregate `SESSIONS.md` | After prompt edits in `lib/prompts.ts` or curriculum changes |
| `npm run test:sessions -- --no-skip` | Same, but forces re-run (ignores cache) | After you tweak the prompt and want to see if scores moved |

`test:sessions` depends on cached extractions existing. Run `test:extraction`
once when new images arrive; `test:sessions` is the one you iterate on.

### Full flag reference

Both scripts share the same flag surface:

```
--filter <str>       Only process folders whose name contains <str>
--only <folder>      Process exactly one folder
--limit <n>          Stop after n images/sessions total
--no-skip            Re-run even when cached JSON exists
--turns <n>          (sessions only) Number of Dani↔kid rounds (default 5)
--per-folder <n>     (extraction only) Sample n images per folder
```

Typical flow:

```bash
# First run after dropping new zips
npm run test:extraction -- --per-folder 1
npm run test:sessions -- --limit 3             # smoke test
npm run test:sessions                          # full sweep

# Iteration after prompt edit
npm run test:sessions -- --no-skip
```

---

## The five grading dimensions

Every simulated session is scored 1-5 on:

| Dim | What the grader checks |
|---|---|
| **socratic** | Dani never gave facit directly — always guided with a question or hint |
| **acknowledgment** | Dani reacted to what the kid ACTUALLY wrote, not generic "godt!" |
| **onGoal** | Kept focus on the pedagogical goal; didn't repeat "Målet:" every turn |
| **language** | Danish for meta; target language for engelsk/tysk content |
| **ageAppropriate** | Sentence length, vocabulary, and complexity fit the grade |

A 5.00 overall does NOT mean "nothing to fix." The grader also produces 3
praise + 3 issue bullets per session, and **the issues are where the signal
lives** even when scores ceiling. Read `SESSIONS.md` → Weakest-sessions
section first, then scan the Transcripts section for patterns.

---

## Reading `SESSIONS.md`

The aggregate file has four sections:

1. **Aggregate scores** — average across all sessions. Useful for tracking
   whether a prompt change moved the global needle.
2. **Per grade × subject** — matrix of N sessions per cell + their average
   scores. **This is the most actionable view** — a dip in grade-5-engelsk-
   language tells you L2 handling needs work for older kids specifically.
3. **Weakest sessions** — top 10 lowest-scored transcripts with full
   praise/issue/summary. Start here.
4. **Transcripts** — full conversation for every session. Scroll and read.

---

## From issues → prompt edits

The grader's issues are phrased as "Dani could have ...". Your job is
to decide: is this a **universal** fix (goes in the base prompt), a
**grade-specific** fix (add a grade guard), or a **subject-specific** fix
(add a subject guard)?

**Universal** — issue appears across ≥3 grades AND ≥2 subjects. Edit the
base rules in `buildChildSystemPrompt`.

**Grade-specific** — issue appears only in 1-2. klasse, or only in 5-7.
klasse. Use the existing `buildGradeLanguageBand(grade)` or add a new
helper that injects a grade-scoped rule.

**Subject-specific** — issue appears only in engelsk, or only in dansk
creative tasks. Use `buildSubjectLanguageBlock(subject)` or
`buildTaskPatternBlock(taskType)`.

**Task-type-specific** — issue is tied to the task pattern (interview,
dictation, writing, word-problem). Edit `buildTaskPatternBlock`.

Avoid jumping to grade/subject-specific prompts without evidence. A rule
that lives in the shared prompt affects every session and compounds; a
rule scoped to one cell only helps that cell.

---

## What we learned from the 2026-04-24 baseline run

First pass of the simulator against 12 sessions across grades 1-5 and
subjects matematik/dansk/engelsk/tysk. All sessions scored 4.8-5.0
overall, but the issues lists surfaced concrete themes:

### Universal themes (appear in most sessions)

1. **Step-label scaffolding repeats every turn.** Dani says "Vi er ved
   **A**" or "A: ..." on almost every reply within a step, not just when
   switching steps. Grader flagged this as robotic/formal in 5+ sessions
   across grades 1-5 and all subjects.
   - **Proposed fix** (universal, in base prompt): "Nævn kun trin-etiketten
     (A/B/C) ved STARTEN af et nyt trin. Under samme trin skal du IKKE
     gentage etiketten — fortsæt bare samtalen naturligt."

2. **No metacognitive prompts.** Dani acknowledges → moves to next step.
   Rarely asks "hvordan tænkte du?" or "kan du forklare hvorfor?". The
   curriculum KB has De 10 H'er but the prompt doesn't trigger them.
   - **Proposed fix** (universal): "Hver 2.-3. tur: bed eleven forklare
     HVORDAN de tænkte, ikke bare HVAD de svarede."

3. **Rare positive reinforcement beyond 'rigtigt'.** Louise's ros-ris-ros
   is not surfacing — Dani confirms correctness but doesn't celebrate
   progress. Especially flagged for grade-1 where motivation matters most.
   - **Proposed fix** (grade-specific, grades 1-3): explicit rule to name
     what the kid did well, not just confirm the answer.

### Subject-specific themes

4. **Engelsk — silent translation.** Dani puts English vocab in parens as
   Danish translation ("bike (cykel)") instead of letting the kid try.
   Grader: "det kunne være bedre at lade eleven oversætte selv."
   - **Proposed fix** (`buildSubjectLanguageBlock("engelsk")`): "Oversæt
     IKKE nye ord i parentes. Lad eleven forsøge selv, eller stil
     forståelses-spørgsmål først."

5. **Engelsk — verb-form confusion not addressed.** Grade-5 engelsk kid
   said "running — eller altså to run" and Dani didn't clarify -ing vs
   infinitive immediately. Language signal got lost.
   - **Proposed fix**: explicit rule to stop and disambiguate verb-forms
     the moment they come up, not later.

6. **Dansk writing tasks — Socratic ladder too strict.** In 5. kl. dansk
   replikker, kid tried 2-3 times with the same structural mistake. Dani
   kept saying "ikke helt" without showing a structural scaffold. Grader:
   "kunne have vist et korrekt færdigt eksempel efter et par hints."
   - **Proposed fix** (task-pattern for `writing` / `grammar`): after 2
     failed attempts on STRUCTURE (not content), show a short model
     demonstrating the FORM, then invite the kid to write their own.

7. **Tysk — rejects near-correct without brief grammar hint.** Dani told
   the kid "der" was wrong but didn't explain WHY preposition-governed
   articles change. Kid had no path to the correct form.
   - **Proposed fix** (`buildSubjectLanguageBlock("tysk")`): after
     rejecting a near-correct German form, give ONE short grammar cue
     before the next question.

### Real bug

8. **`[progress done="A" current="B"]` markup leaked** into a grade-2 math
   transcript. That string is supposed to be stripped before the text
   reaches the kid (it feeds `StepChecklist.tsx`). Investigate:
   - Simulator transcript: is the grader seeing raw unstripped output?
   - Client: is the strip-regex in `HintChat.tsx` robust enough?
   - If the sim bypasses stripping, either add the same regex in
     `simulate-session.ts` or wrap the call in the production path.

---

## The cost picture

Every simulated session fires roughly:

- 1 seed call (Dani opens)
- `(turns - 1) × 2` chat calls (kid + Dani alternating)
- 1 grading call

At default `--turns 5`, that's 9 calls. Plus 1 grader = 10 calls per
session. At gpt-5-mini Sweden Central Data Zone Standard pricing:

- 19 images × 10 calls ≈ 190 calls per full sweep
- Each Dani/kid turn: ~250 output tokens, ~500 input. Grader: ~700 out, ~2k in.
- Rough envelope: $0.50-$1.50 per full sweep. Verify in Azure portal.

Don't run `--no-skip` on the full set lightly. For iteration, use
`--filter` or `--only` to scope to the grade/subject you're tuning.

---

## Caveats to keep in mind

- **The pupil is simulated**, not a real child. It won't reproduce
  emotional edge cases, off-topic drift, or the specific mistakes your
  own kids make. Treat scores as directional.
- **The grader is also an LLM** — calibration drifts ±0.5 between runs.
  Compare trends across ≥3 sessions per cell, not single scores.
- **Cached extraction JSONs freeze task structure.** If you change the
  extractor prompt, re-run `test:extraction --no-skip` before
  `test:sessions --no-skip` or the sim will evaluate against stale
  tasks.
- **Only grade-1 math gets 3 samples**; most cells have 1. Run
  `test:extraction --per-folder 3` before making confident claims about
  any specific grade × subject cell.

---

## One-screen workflow

```bash
# 1. New images arrived — extract
npm run test:extraction -- --per-folder 1

# 2. First simulation pass
npm run test:sessions

# 3. Open the two reports side by side
code task-samples/.results/REPORT.md
code task-samples/.results/SESSIONS.md

# 4. Scan Per grade × subject matrix — find the dip
# 5. Read the Weakest sessions section — what patterns appear?
# 6. Decide: universal / grade / subject / task-type fix
# 7. Edit lib/prompts.ts (or vision.ts or curriculum/*)
# 8. Re-run, scoped:
npm run test:sessions -- --filter "5. Årgang engelsk" --no-skip

# 9. Did the score for that cell move? Did others drop? Commit or revert.
```
