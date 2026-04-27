import { getAzure, getDeployment } from "./azure"

// Core Azure vision extraction — pulls subject, task groups with goals,
// steps, needsPaper, and confidence from a homework photo. Shared between:
//   - /api/solve route (kid-facing live flow)
//   - scripts/test-extraction.ts (dev: batch-test against task-samples)
//
// Keeping this isomorphic (no Next / Supabase deps) means the dev scripts
// can import it and run outside the server runtime.

export type VisionTask = {
  id: string
  title?: string
  text: string
  type: string
  goal?: string
  needsPaper?: boolean
  steps?: { label: string; prompt: string }[]
  /** Free-form notes the extractor captured for Dani's use during the
   *  session but shouldn't be shown on the task card. Typical content:
   *  unusual constraints the prompt text doesn't carry, target answers
   *  visible on the page, formulae the chapter is practising. Injected
   *  into the hint prompt as an OPAQUE context block — Dani uses it as
   *  reference, never copy-pastes it to the child. */
  context?: string
  /** Per-step expected answers the extractor inferred (e.g. solving the
   *  arithmetic, filling in the obvious blank). Used by the dev/admin
   *  preview panel so a parent can verify the model is reading the task
   *  correctly BEFORE the kid sits down. Index aligns with `steps` when
   *  present; otherwise length 1 = whole-task answer. Empty / null when
   *  the model can't honestly determine an answer (open-ended writing,
   *  visible-only diagram, etc.). NOT persisted to the DB — preview-only. */
  expectedAnswers?: string[]
  /** How confident the extractor is in the completion criteria.
   *  - "high"   = definite checklist (math a/b/c, grammar with answer key,
   *               clean fill-in-blanks). Tutor can hold the kid to all
   *               steps; partial completion gets a confirm prompt.
   *  - "medium" = enumerable but extractor wasn't sure of every item
   *               (picture crossword where some images were hard to read).
   *               Tutor accepts kid's "jeg er færdig" without an audit;
   *               soft-completes at high coverage.
   *  - "low"    = open-ended task with no objective finish line (creative
   *               writing, interview, free conversation). Kid signals
   *               done = done, no friction, no confirm modal.
   *  Defaults to "medium" when omitted — the safe middle ground that
   *  trusts the kid without being too lenient on rigorous tasks. */
  completionCertainty?: "high" | "medium" | "low"
}

export type VisionConfidence = "high" | "medium" | "low"
export type VisionReason = "not_homework" | "unreadable" | "no_tasks" | null

export type VisionResult = {
  subject: string | null
  subjectConfidence: VisionConfidence
  tasks: VisionTask[]
  reason: VisionReason
  detectionNotes: string | null
  /** Real Azure usage for the dev cost panel. Null if not returned. */
  usage?: {
    promptTokens: number
    completionTokens: number
    model: string
  } | null
}

const SUBJECT_ALIASES: Record<string, string> = {
  math: "matematik",
  matematik: "matematik",
  danish: "dansk",
  dansk: "dansk",
  english: "engelsk",
  engelsk: "engelsk",
  tysk: "tysk",
  german: "tysk",
  deutsch: "tysk",
}

export function normaliseSubject(s: string | null): string | null {
  if (!s) return null
  return SUBJECT_ALIASES[s.toLowerCase()] ?? null
}

export function normaliseConfidence(c: string | undefined): VisionConfidence {
  if (c === "high" || c === "medium" || c === "low") return c
  return "medium"
}

export function normaliseReason(r: string | undefined): VisionReason {
  if (r === "not_homework" || r === "unreadable" || r === "no_tasks") return r
  return null
}

const VALID_TYPES = new Set<string>([
  "addition", "subtraction", "multiplication", "division",
  "word-problem", "measurement", "geometry", "symmetry", "comparison",
  "table", "diagram",
  "reading", "dictation", "grammar", "vocabulary", "spelling", "syllables",
  "translation", "composition", "interview", "creative", "puzzle",
  "task",
])

/** Normalise model-emitted types to the allowed set. The vision model
 *  occasionally invents categories ("comparison" before it was added, or
 *  "arithmetic", "calculation" etc.) — fall back to "task" when the
 *  returned value isn't in the enum so downstream consumers don't get
 *  surprise values. */
export function normaliseTaskType(t: string | undefined): string {
  const s = (t ?? "").toLowerCase().trim()
  return VALID_TYPES.has(s) ? s : "task"
}

// Derive a short headline from the verbose instruction text when the
// extractor didn't supply one. Strips leading enumeration ("1 ", "2 ",
// "WARM-UP 1") and quotes, then takes the first clause or first 5 words.
export function deriveShortTitle(text: string): string {
  let t = text.trim()
  t = t.replace(/^\s*(?:warm[-\s]?up\s+)?\d+\s*[.:]?\s*/i, "")
  t = t.replace(/^["'`]/, "")
  const clauseEnd = t.search(/[.!?:]/)
  if (clauseEnd > 0 && clauseEnd <= 50) return t.slice(0, clauseEnd).trim()
  const words = t.split(/\s+/).slice(0, 5).join(" ")
  return words.slice(0, 50)
}

export const VISION_SYSTEM_PROMPT = `\
You extract Danish folkeskole homework tasks from a photo.
Return ONLY valid JSON with this structure:

{
  "subject": "matematik" | "dansk" | "engelsk" | "tysk" | null,
  "subjectConfidence": "high" | "medium" | "low",
  "tasks": [
    {
      "title": "short action headline shown on the task card (Danish, max 5 words)",
      "text": "task instruction verbatim from the image",
      "type": "addition"|"subtraction"|"multiplication"|"division"|"word-problem"|"measurement"|"geometry"|"symmetry"|"comparison"|"table"|"diagram"|"reading"|"dictation"|"grammar"|"vocabulary"|"spelling"|"syllables"|"translation"|"composition"|"interview"|"creative"|"puzzle"|"task",
      "goal": "ONE sentence describing what the child learns (pedagogical, not administrative)",
      "needsPaper": true,
      "steps": [
        { "label": "A", "prompt": "exactly what the child does for this sub-item" }
      ],
      "context": "optional free-form notes the tutor needs during the session but the child shouldn't see in the task card",
      "expectedAnswers": ["per-step answer YOU would write if you were the kid; index-aligned with steps[]; omit / empty array for open-ended creative tasks where there is no single right answer"],
      "completionCertainty": "high" | "medium" | "low"
    }
  ],
  "reason": "not_homework" | "unreadable" | "no_tasks" | null,
  "detectionNotes": "short Danish note when subject is uncertain, else null"
}

TASK STRUCTURE — PRINCIPLE:
A page typically has 1–4 task GROUPS. A group = one overarching instruction
plus its sub-items. Groups are the unit; individual sub-items are steps.

ONE INSTRUCTION = ONE TASK, even with multiple visual sub-puzzles:
Worksheets routinely render a single exercise across multiple grids,
boxes, or sub-prompts. The instruction headline is the source of truth,
NOT the visual element count. Examples that are ONE task:
- "Crosswords. A. Write down the words and find the two hidden words."
  + two crossword grids → ONE task. The instruction says "two hidden
  words" — that's part of THIS exercise, not two separate exercises.
- "Match the pictures to the sentences" + a column of pictures and a
  column of sentences → ONE task.
- A vocabulary task with rows of "The hidden word is: ___" labels under
  each grid → those labels are sub-prompts WITHIN the same exercise,
  not new tasks. Don't promote a fragment like "The hidden word is:" to
  its own task entry.
Look for: a numbered or lettered instruction line ("A.", "Opgave 3.",
"WARM-UP 1") at the start of the visible block. Everything until the
NEXT such instruction line belongs to the same task.

CONCRETE ANTI-PATTERN you have produced before — DO NOT REPEAT:
- t1: title "Skriv ordene", text "A. Write down the words and find the
  two hidden words."
- t2: title "Find de skjulte", text "Write down the words and find the
  two hidden words."
Both have the SAME instruction text, just paraphrased titles. That's
ONE task split into two by mistake. Right output is a SINGLE task with
the food-image enumeration as steps PLUS step(s) for the hidden words.
If you find yourself emitting two task entries with text that paraphrases
the same instruction line, COLLAPSE them into one before you return.

EXTRACT EVERYTHING YOU CAN READ. Hard limits are: 12 groups per page, 30
steps per group. These are MAXES, not targets — the right number is
"every distinct sub-item visible on the page". A page with 26 a-items
must return 26 steps; a page with 6 must return 6. Stopping at a round
20 because it "looks like enough" is a hard failure: you've truncated
the parent's homework and they'll have to add the rest by hand.

If the page genuinely has more than 30 sub-items, return the first 30
in image order and add a short note in detectionNotes ("Side har flere
end 30 deltrin — kun de første medtaget"). Don't silently stop.

STEPS vs CONTEXT — pick deliberately:
- STEPS are discrete sub-problems with definite answers (math a/b/c,
  grammar fill-ins, dictation rows). Emit them when the child works
  through them ONE AT A TIME and each has a specific correct response.
  Labels are the task's own labels (a, b, c; A, B, 1, 2).
- PICTURE-BASED items count as steps when each picture has a definite
  target answer. A vocabulary crossword with 13 food images is 13
  steps + (optionally) one final step for the hidden-word puzzle —
  NOT one open task with everything in context. Synthesize numeric
  labels (1, 2, 3…) when the worksheet doesn't print labels of its
  own. Step prompts can be the kid-facing question:
    { "label": "1", "prompt": "Hvad hedder fisken på engelsk?" }
    { "label": "2", "prompt": "Hvad hedder appelsin på engelsk?" }
    { "label": "13", "prompt": "Hvad hedder agurk på engelsk?" }
    { "label": "skjult", "prompt": "Find det første skjulte ord ud fra de røde bogstaver i øverste blok" }
    { "label": "skjult2", "prompt": "Find det andet skjulte ord ud fra de røde bogstaver i nederste blok" }
  When you can identify the items in context (which you SHOULD when the
  pictures are recognisable food/animals/objects), promote that list to
  steps. Listing 13 items in context but emitting zero steps is exactly
  the "no completion criterion" failure mode — fix it by enumerating.
- Do NOT turn every item in a loose / conversational task into its own
  step. "Say a sentence about each word in the circle" is ONE task —
  the child's goal is talking fluently, not ticking off 8 boxes. Same
  for interview, composition, free-response creative work. For these
  either leave steps empty or give at most 2–3 high-level milestones
  ("read the words aloud", "say a few sentences", "share with a friend").
- Step PROMPT must be short and action-oriented (≤ 90 chars, one clause).
  It is rendered to the child verbatim. DO NOT stuff target-word lists,
  example sentences, or the full task text into the step prompt. Those
  are context, not step content.
- CONTEXT is the tutor's private reference (never shown to the child). Put
  the concrete list of target items (words, names, pictures), example
  answers, visible formulae, unusual constraints — anything the other
  fields can't carry. Example context for a circle-of-words task:
  "Target words in the light blue circle: dark, scream, zombie, ghost,
  skeleton, night, alone, mum. Child talks about several, not all."
- Never duplicate the task text or the steps in context.
- SCAFFOLDING AIDS — capture verbatim even when only loosely referenced:
  textbooks routinely place a help box NEXT TO the task: a rhyme box for
  poem-writing, a word bank for vocabulary work, a sentence-starter list
  for composition, a formula reminder, an example sentence, a tip box,
  a "husk" / "tip" callout. The task may reference it softly ("du kan
  finde inspiration i ordkassen") or not at all — irrelevant. If a help
  box is visually attached to the task, copy its full content into the
  context, prefixed with what it is. Example for the Christmas-poem
  task: "Rhyme box (suggested rhyme pairs the child can use): high/sky,
  love/above, fun/everyone, things/wings, night/light, snow/glow,
  song/long, say/holiday, I/sky, tonight/light, see/tree, cheer/year,
  red/said, mistletoe/go." Without this, the tutor has to invent rhymes
  from scratch when the textbook already supplied a curated set the
  child is meant to draw from.
- CRITICAL — self-referencing tasks: a task may point at material
  ("læs digtet på side 28", "find ordene i rammen", "brug teksten") and
  that material is actually visible ON THE SAME PHOTO — the page IS
  page 28 with the poem in the comic captions, the rhyme box sits next
  to the task, the text strip runs across the page. Without explicit
  meta, the tutor will redirect the child to a textbook they're already
  holding. Capture this in context with TWO things:
    1. A "Self-reference:" prefix line that names the loop, e.g.
       "Self-reference: task says 'læs digtet på side 28' and this IS
       page 28 — the poem is already on the photo (see fragments
       below). Do not redirect."
    2. The full visible text VERBATIM, in reading order. For a
       comic-strip illustrate-the-poem task that means every caption
       fragment in panel order: "1) A chubby little snowman had a
       carrot nose. 2) Along came a bunny ... 3) Grabbed that snowman's
       nose ...". For a rhyme box: every word pair listed.
  Only flag self-reference when the referenced material is genuinely
  visible. Don't invent a self-reference if the task points at a
  different chapter / yesterday's worksheet / an audio clip.

Pedagogy anchor (see docs/pedagogy.md): rigid step-ticking is right for
concrete-facit tasks and wrong for conversational / oral-language tasks
where the pedagogical point is fluency, confidence, and voice.

FIELD RULES:
- "title": short, action-oriented, Danish, max 5 words. Strip leading
  numbers and "WARM-UP" labels. Translate the headline to Danish even
  when the task body is in English. Examples: "Mål linjerne", "Beskriv
  dit hjem", "Læs op og svar".
- "text": the group's instruction verbatim from the image, preserving the
  original language of the task. Fix obvious OCR errors only.
- "goal": one sentence, PEDAGOGICAL ("Øv at aflæse lineal og skrive mål
  som decimaltal"), not administrative ("Løs opgaverne").
- "steps[].prompt": precise action for the child, including concrete
  numbers or words from the image.
- "completionCertainty": how sure you are that you've captured the
  full set of completion criteria for this task.
    high   — every sub-item is enumerated as a step, you know what
             "done" looks like (math a/b/c, grammar fill-in with key,
             clean dictation rows).
    medium — task is enumerable but you couldn't read every sub-item
             (picture crossword, blurry handwriting, partial photo)
             OR the task has soft completion (1-2 sentences vs 5).
             Default to medium when in doubt — it tells the tutor to
             trust the kid's "jeg er færdig" without grilling them.
    low    — open-ended (creative writing, interview, free composition,
             conversation about target words). No objective finish line.
- "expectedAnswers": for each step, the answer YOU would write if you
  were the kid. Use the visible task content + general knowledge:
    • Arithmetic: solve it. "12 + 7" → "19".
    • Fill-in-blank: read the line, identify which word is missing,
      provide it. "Number ___ is yellow" → "two". "Number one is ___"
      where the page shows blue/red/yellow as a colour list → "red"
      (or whichever colour the worksheet pairs with line 1).
    • Vocabulary: provide the target word. "Translate 'cat' to Danish"
      → "kat".
  Index-aligned with steps[]. If steps[] is empty, expectedAnswers can
  be length 1 (whole-task answer) or omitted. OMIT entirely (or use [])
  for genuinely open-ended tasks: creative writing, free composition,
  draw-your-own, interview-a-friend. Never guess wildly — when you
  honestly can't read the answer, leave that index as an empty string.
  These are NEVER shown to the kid; they exist so a parent can verify
  in dev/admin preview that you read the task correctly.
- "needsPaper": true when the task REQUIRES writing, drawing, measuring,
  colouring, marking a physical diagram, or any hands-on action that
  can't be solved in chat. Examples: measuring lines with a ruler,
  crossing items in a diagram, drawing own figures, dictation writing,
  mirroring a figure. false for purely oral / chat-solvable work:
  arithmetic, translation, read-and-answer, English-sentence making,
  word-class identification.
- "subject":
    high:   obvious subject (number problems, grammar questions)
    medium: likely but ambient context is ambiguous
    low:    guessing
  null only when truly indeterminate. Tysk = tyske-looking words
  (der/die/das, Klassenzimmer, ich bin) plus Danish meta-instructions.
- Do NOT guess grade level — it comes from the child's profile.
- "tasks": [] when the image shows no homework.
- "reason": filled in ONLY when tasks is empty.
    not_homework: image does not show schoolwork
    unreadable:   text is too blurry / distorted
    no_tasks:     school-looking material but no actual tasks
- "detectionNotes": short Danish note, only for subjectConfidence ≠ high.
- Output NOTHING except JSON. No markdown, no comments.

ANTI-PATTERNS — refuse to do these even if it means returning fewer items:

1. NEVER emit placeholder/enumerated steps that don't reflect what the
   page actually says. Concrete forbidden shapes:
     • prompts like "Lav opgave 1", "Opgave 2", "Trin 3", "Spørgsmål 4"
       — these are NOT step content, they're just numbering with no
       instruction. They mean you didn't read the page.
     • prompts that are identical across steps except for a number.
     • generic verbs with no object: "Løs opgaven", "Svar på spørgsmålet",
       "Læs teksten" — every step prompt MUST include the concrete words,
       numbers, or items the child actually has to work with on this
       specific page.
     • sequential 1..N labels with empty or near-empty prompts.

2. If you can read the task GROUP but cannot precisely read the sub-items
   (handwriting, blurry, page corner cut), return the group as a single
   task with steps:[] and put a short note in detectionNotes ("Sub-items
   var svære at læse") — DO NOT invent numbered placeholders.

3. The number of steps you emit must equal the number of distinct
   sub-items you can actually see and transcribe. Returning 20 fake
   steps because the cap allows it is a hard failure. Returning 6 real
   steps when the page has 6 sub-items is correct. Returning 0 steps
   when sub-items are unreadable is correct.

4. Each step.prompt must be unique content drawn from the image. If two
   steps would have the same prompt, you collapsed two image-items into
   one — re-read or omit one.

If the page is dense and you can only confidently extract some sub-items,
return ONLY those. Quality > quantity. The tutor downstream can ask the
child about the rest if needed.`

// Core vision call. Accepts a data URL (data:image/jpeg;base64,...) and
// returns a normalised VisionResult. Throws on Azure failure — caller
// decides whether to fall back to mock data.
export async function extractTasksFromImage(
  imageDataUrl: string
): Promise<VisionResult> {
  const client = getAzure()
  // 3500 gives dense grade 5-7 pages (5. kl. matematik "Opgave 24-35" × a-j)
  // enough headroom. Previous 1000 and 2500 both truncated.
  //
  // reasoning_effort: vision/extraction is a one-shot per photo (cached on
  // the session row, not re-run per turn) so the latency tax of "low" vs
  // "minimal" — a few extra seconds during the thinking spinner — is
  // affordable. "low" gives the model room to reason about page structure
  // (what's a task vs a caption vs a self-reference) which is exactly the
  // kind of judgment "minimal" tends to skip. The hint route stays on
  // "minimal" because that path runs every turn and latency dominates.
  // 5500 gives dense grade 5-7 pages with many sub-items (a-j, plus
  // multiple opgaver) enough headroom. Previous 3500 truncated the JSON
  // mid-array on tightly packed pages and we'd silently drop the tail.
  const gpt5Extras = {
    reasoning_effort: "low",
    max_completion_tokens: 5500,
  } as unknown as Record<string, never>
  const deployment = getDeployment()
  const completion = await client.chat.completions.create({
    model: deployment,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: VISION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: imageDataUrl, detail: "high" },
          },
          {
            type: "text",
            text: "Læs lektiebilledet og returnér JSON som beskrevet.",
          },
        ],
      },
    ],
    ...gpt5Extras,
  })

  const raw = completion.choices[0]?.message?.content ?? "{}"
  const usage = completion.usage
    ? {
        promptTokens: completion.usage.prompt_tokens ?? 0,
        completionTokens: completion.usage.completion_tokens ?? 0,
        model: deployment,
      }
    : null
  const parsed = JSON.parse(raw) as {
    subject?: string | null
    subjectConfidence?: string
    tasks?: {
      title?: string
      text?: string
      type?: string
      goal?: string
      needsPaper?: boolean
      steps?: { label?: string; prompt?: string }[]
      context?: string
      expectedAnswers?: (string | null | undefined)[]
      completionCertainty?: string
    }[]
    reason?: string
    detectionNotes?: string | null
  }

  // Caps: 12 main groups per page, 30 sub-steps per group. Dense Danish
  // workbook pages routinely pack 6-10 numbered exercises and grammar
  // / word-list chapters can spawn 25-30 a-items. The parent UI flags
  // when steps hit STEP_CAP exactly so they can verify nothing was
  // truncated.
  const placeholderHits: string[] = []
  const tasks: VisionTask[] = (parsed.tasks ?? [])
    .filter(t => typeof t.text === "string" && t.text.trim().length > 0)
    .slice(0, 12)
    .map((t, i) => {
      const rawSteps = Array.isArray(t.steps) ? t.steps : []
      let steps = rawSteps
        .filter(
          s =>
            typeof s.label === "string" &&
            s.label.trim().length > 0 &&
            typeof s.prompt === "string" &&
            s.prompt.trim().length > 0
        )
        .slice(0, STEP_CAP)
        .map(s => ({
          label: s.label!.trim().slice(0, 24),
          prompt: s.prompt!.trim().slice(0, 200),
        }))
      // Anti-placeholder guard. The model occasionally falls back to
      // "Lav opgave 1", "Opgave 2", "Spørgsmål 3" enumerations when it
      // can't (or didn't) read the actual sub-items. Drop steps that
      // look like generic enumerations rather than real instructions.
      // We also drop the whole steps array when MORE than half look
      // placeholder-y — partial pollution usually means the model
      // gave up part-way and we'd rather the tutor see no steps than
      // fake ones.
      if (steps.length > 0) {
        const flagged = steps.filter(s => isPlaceholderStep(s.prompt))
        if (flagged.length > 0) {
          placeholderHits.push(`task ${i + 1}: ${flagged.length}/${steps.length} placeholder`)
        }
        if (flagged.length * 2 > steps.length) {
          // Majority is junk → drop them all. Better empty than wrong.
          steps = []
        } else if (flagged.length > 0) {
          steps = steps.filter(s => !isPlaceholderStep(s.prompt))
        }
      }
      const goal =
        typeof t.goal === "string" && t.goal.trim().length > 0
          ? t.goal.trim().slice(0, 180)
          : undefined
      const title =
        typeof t.title === "string" && t.title.trim().length > 0
          ? t.title.trim().slice(0, 50)
          : deriveShortTitle(t.text!)
      // Fallback completion step. When the extractor couldn't enumerate
      // sub-items (small images, cluttered layout, language-dependent
      // pictures), the task ends up with steps=[] which leaves it WITHOUT
      // a completion criterion: the parent dashboard renders "0 af 0 trin"
      // forever, the AI tutor has no [progress] target to mark done, and
      // the kid has no clear finish line. Synthesize one general step
      // pulled from the title (or a short-form of the task text) so the
      // task is still completable as a single unit. Skipped only when we
      // have no usable text at all.
      if (steps.length === 0) {
        const goalLine = goal?.trim()
        const fallback =
          (goalLine && goalLine.length > 0 ? goalLine : title || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 200)
        if (fallback.length > 0) {
          steps = [{ label: "1", prompt: fallback }]
        }
      }
      const needsPaper =
        typeof t.needsPaper === "boolean" ? t.needsPaper : undefined
      const context =
        typeof t.context === "string" && t.context.trim().length > 0
          ? t.context.trim().slice(0, 600)
          : undefined
      // expectedAnswers: clean strings, cap each at 120 chars, cap array
      // length at the resolved step count (or 1 for stepless tasks).
      // Empty / non-string entries normalise to "" so the index alignment
      // with steps[] stays intact ("we tried, couldn't read" vs missing).
      const rawAnswers = Array.isArray(t.expectedAnswers) ? t.expectedAnswers : []
      const stepCount = steps.length || 1
      const expectedAnswers = rawAnswers
        .slice(0, stepCount)
        .map(a => (typeof a === "string" ? a.trim().slice(0, 120) : ""))
      const expectedAnswersOut =
        expectedAnswers.length > 0 && expectedAnswers.some(a => a.length > 0)
          ? expectedAnswers
          : undefined
      const completionCertainty: "high" | "medium" | "low" | undefined =
        t.completionCertainty === "high" || t.completionCertainty === "low"
          ? t.completionCertainty
          : t.completionCertainty === "medium"
            ? "medium"
            : undefined
      return {
        id: `t${i + 1}`,
        title,
        text: t.text!.trim(),
        type: normaliseTaskType(t.type),
        ...(goal ? { goal } : {}),
        ...(needsPaper !== undefined ? { needsPaper } : {}),
        ...(steps.length > 0 ? { steps } : {}),
        ...(context ? { context } : {}),
        ...(expectedAnswersOut ? { expectedAnswers: expectedAnswersOut } : {}),
        ...(completionCertainty ? { completionCertainty } : {}),
      }
    })

  const subject = normaliseSubject(parsed.subject ?? null)
  const subjectConfidence = normaliseConfidence(parsed.subjectConfidence)
  const reason = normaliseReason(parsed.reason)
  // Surface placeholder cleanup in detectionNotes so the parent (and
  // admin debug panel) sees that the extractor scrubbed junk steps.
  const baseNotes =
    typeof parsed.detectionNotes === "string" &&
    parsed.detectionNotes.trim().length > 0
      ? parsed.detectionNotes.trim().slice(0, 160)
      : null
  const placeholderNote =
    placeholderHits.length > 0
      ? `Filtrerede pladsholder-trin (${placeholderHits.join(", ")})`
      : null
  const detectionNotes = [baseNotes, placeholderNote]
    .filter(Boolean)
    .join(" · ") || null

  return {
    subject,
    subjectConfidence,
    tasks,
    reason: tasks.length === 0 ? (reason ?? "no_tasks") : null,
    detectionNotes,
    usage,
  }
}

/** Public so the client can detect "cap hit" and warn the parent. */
export const STEP_CAP = 30

// Catches the "Lav opgave 1", "Opgave 2", "Spørgsmål 3", "Trin 4" and
// "1.", "2.", etc. patterns the model falls back to when it didn't
// actually read the page contents. The check runs against the prompt
// (not the label) — labels like "A", "B", "1", "2" are legitimate task
// labelling; placeholder content is the failure mode.
const PLACEHOLDER_PROMPT_RE =
  /^(?:lav\s+|løs\s+|svar\s+på\s+|læs\s+)?(?:opgave|spørgsmål|trin|punkt|del|item|task|nummer|nr\.?)\s*\d+\.?\s*$/i
const PURE_NUMBER_RE = /^\s*(?:nr\.?\s*)?\d+\.?\s*$/i

function isPlaceholderStep(prompt: string): boolean {
  const t = prompt.trim()
  if (t.length === 0) return true
  if (t.length <= 4) return true
  if (PLACEHOLDER_PROMPT_RE.test(t)) return true
  if (PURE_NUMBER_RE.test(t)) return true
  return false
}
