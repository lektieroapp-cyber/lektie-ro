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
      "context": "optional free-form notes the tutor needs during the session but the child shouldn't see in the task card"
    }
  ],
  "reason": "not_homework" | "unreadable" | "no_tasks" | null,
  "detectionNotes": "short Danish note when subject is uncertain, else null"
}

TASK STRUCTURE — PRINCIPLE:
A page typically has 1–4 task GROUPS. A group = one overarching instruction
plus its sub-items. Groups are the unit; individual sub-items are steps.
Cap at 8 groups per page and ~20 steps per group.

STEPS vs CONTEXT — pick deliberately:
- STEPS are discrete sub-problems with definite answers (math a/b/c,
  grammar fill-ins, dictation rows). Emit them when the child works
  through them ONE AT A TIME and each has a specific correct response.
  Labels are the task's own labels (a, b, c; A, B, 1, 2).
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
- Output NOTHING except JSON. No markdown, no comments.`

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
  const gpt5Extras = {
    reasoning_effort: "low",
    max_completion_tokens: 3500,
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
    }[]
    reason?: string
    detectionNotes?: string | null
  }

  const tasks: VisionTask[] = (parsed.tasks ?? [])
    .filter(t => typeof t.text === "string" && t.text.trim().length > 0)
    .slice(0, 8)
    .map((t, i) => {
      const rawSteps = Array.isArray(t.steps) ? t.steps : []
      const steps = rawSteps
        .filter(
          s =>
            typeof s.label === "string" &&
            s.label.trim().length > 0 &&
            typeof s.prompt === "string" &&
            s.prompt.trim().length > 0
        )
        .slice(0, 20)
        .map(s => ({
          label: s.label!.trim().slice(0, 24),
          prompt: s.prompt!.trim().slice(0, 200),
        }))
      const goal =
        typeof t.goal === "string" && t.goal.trim().length > 0
          ? t.goal.trim().slice(0, 180)
          : undefined
      const title =
        typeof t.title === "string" && t.title.trim().length > 0
          ? t.title.trim().slice(0, 50)
          : deriveShortTitle(t.text!)
      const needsPaper =
        typeof t.needsPaper === "boolean" ? t.needsPaper : undefined
      const context =
        typeof t.context === "string" && t.context.trim().length > 0
          ? t.context.trim().slice(0, 600)
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
      }
    })

  const subject = normaliseSubject(parsed.subject ?? null)
  const subjectConfidence = normaliseConfidence(parsed.subjectConfidence)
  const reason = normaliseReason(parsed.reason)
  const detectionNotes =
    typeof parsed.detectionNotes === "string" &&
    parsed.detectionNotes.trim().length > 0
      ? parsed.detectionNotes.trim().slice(0, 160)
      : null

  return {
    subject,
    subjectConfidence,
    tasks,
    reason: tasks.length === 0 ? (reason ?? "no_tasks") : null,
    detectionNotes,
    usage,
  }
}
