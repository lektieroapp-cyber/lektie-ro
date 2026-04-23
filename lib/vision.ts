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
Du er en assistent der udtrækker danske folkeskoleopgaver fra et foto.
Returnér UDELUKKENDE valid JSON med denne struktur:

{
  "subject": "matematik" | "dansk" | "engelsk" | "tysk" | null,
  "subjectConfidence": "high" | "medium" | "low",
  "tasks": [
    {
      "title": "Kort overskrift vist på opgave-kortet (MAKS 5 ord, handlings-orienteret)",
      "text": "opgaveteksten ordret som på billedet",
      "type": "addition"|"subtraction"|"multiplication"|"division"|"word-problem"|"measurement"|"geometry"|"symmetry"|"comparison"|"table"|"diagram"|"reading"|"dictation"|"grammar"|"vocabulary"|"spelling"|"syllables"|"translation"|"composition"|"interview"|"creative"|"puzzle"|"task",
      "goal": "ÉN sætning om hvad eleven lærer fagligt",
      "needsPaper": true,
      "steps": [
        { "label": "A", "prompt": "præcist hvad eleven skal gøre i dette delrin" }
      ]
    }
  ],
  "reason": "not_homework" | "unreadable" | "no_tasks" | null,
  "detectionNotes": "kort dansk note hvis du er i tvivl om faget, ellers null"
}

OPGAVESTRUKTUR — LÆS DETTE OMHYGGELIGT:

En side har typisk 1-4 opgave-GRUPPER. En gruppe = én overordnet instruktion
+ dens delopgaver. Grupperne er det vigtige — IKKE de enkelte sub-items.

Eksempler:
  "Mål linjerne." med 6 linjer (A-F)       → ÉN gruppe, 6 steps
  "Find linjernes samlede længde." med     → ÉN gruppe, 4 steps
    A+B, C+D, E+F, A+F
  "Udfyld regnetabellen." (én tabel)       → ÉN gruppe, steps = hver rækkes
                                             regnestykke
  Et enkelt regnestykke (24 + 17)          → ÉN gruppe, steps = [] (eller bare
                                             én step med hele regnestykket)
  Tekststykke med 3 spørgsmål under         → ÉN gruppe, 3 steps

Så hele billedet "Mål linjerne + Find samlede længde + Prøv selv +
Regnetabeller" = FIRE grupper (ikke 18 enkelt-opgaver).

REGLER:
- Maks 8 grupper per side. Dense opgavebogssider (fx 5. kl. matematik med
  "Opgave 24-35" sekventielt nummereret) må gerne give flere grupper hvis
  de er pædagogisk adskilte.
- Maks ca. 20 steps per gruppe. Grad 5 matematik kan have en gruppe med
  "Opgave 25: a-j" (10 sub-items) + "Opgave 27: a-h" (8) — hvis de deler
  én instruktion er det én gruppe med mange steps.
- "title" er en KORT handlings-overskrift på dansk, maks 5 ord, som barnet
  ser på opgave-kortet. Ingen numre, ingen "WARM-UP". Fokus på hvad barnet
  skal GØRE. Eksempler: "Mål linjerne" · "Beskriv dit hjem" · "Læs op og svar".
  IKKE: "WARM-UP 1 Work with a friend...". Hvis opgaven er på engelsk,
  oversæt titlen til dansk (resten af "text" kan forblive engelsk).
- "text" er gruppens instruktion ordret fra billedet (bevar original-sproget,
  f.eks. engelsk for en engelsk-opgave). Ret åbenlyse OCR-fejl.
- "goal" er ÉN sætning om det faglige, IKKE administrativt. Skriv "Øv at aflæse
  lineal og skrive mål som decimaltal" — IKKE "Løs opgaverne". Goal er det der
  styrer Danis pædagogik.
- "steps[].label" er kort (bogstav, tal, eller par som "A+B"). "prompt" er
  præcist hvad eleven skal gøre — inkluder konkrete tal/ord fra billedet.
  Eksempel: { "label": "A", "prompt": "Mål linje A. Den røde linje." }
- "steps" MÅ være tomt hvis gruppen kun består af én instruktion uden
  separate delopgaver.
- "needsPaper": true når opgaven KRÆVER at eleven skriver, tegner, måler,
  farvelægger, tæller på et fysisk billede eller laver noget hands-on der
  ikke kan løses mundtligt. Eksempler: "Mål linjerne med lineal",
  "Sæt kryds i diagrammet", "Tegn selv", "Farv de rigtige ord røde",
  "Skriv det hele ned som diktat", "Spejl figuren". Når true: AI'en hjælper
  med at forstå + guide, men gør det klart at selve svaret skal skrives/
  tegnes på papir.
- "needsPaper": false for rent mundtlige/skriftlige opgaver som eleven kan
  løse i chatten: regnestykker, oversættelse, læse-og-svar, sætninger på
  engelsk, ordklasse-bestemmelse.
- "subject": sæt dit bedste bud selv hvis du er i tvivl.
  - high: tydeligt fag (regneopgaver, grammatikspørgsmål)
  - medium: sandsynligt men der mangler entydig kontekst
  - low: du gætter
- "subject": null kun hvis du virkelig ikke kan afgøre det.
- Tysk-opgaver genkendes på tyske ord (der/die/das, Klassenzimmer, Hallo,
  ich bin) kombineret med danske meta-instruktioner.
- GÆT IKKE KLASSETRIN. Klassetrin kommer fra barnets profil.
- "tasks": [] hvis der ikke er skoleopgaver på billedet.
- "reason": udfyld KUN hvis tasks er tom.
  - "not_homework": billedet viser ikke skoleopgaver
  - "unreadable": teksten er for sløret eller forvrænget
  - "no_tasks": skoleagtigt materiale uden egentlige opgaver
- "detectionNotes": kort forklaring kun ved subjectConfidence = low/medium.
- INTET andet end JSON. Ingen markdown. Ingen kommentarer.`

// Core vision call. Accepts a data URL (data:image/jpeg;base64,...) and
// returns a normalised VisionResult. Throws on Azure failure — caller
// decides whether to fall back to mock data.
export async function extractTasksFromImage(
  imageDataUrl: string
): Promise<VisionResult> {
  const client = getAzure()
  // 3500 gives dense grade 5-7 pages (5. kl. matematik "Opgave 24-35" × a-j)
  // enough headroom. Previous 1000 and 2500 both truncated.
  const gpt5Extras = {
    reasoning_effort: "minimal",
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
      return {
        id: `t${i + 1}`,
        title,
        text: t.text!.trim(),
        type: normaliseTaskType(t.type),
        ...(goal ? { goal } : {}),
        ...(needsPaper !== undefined ? { needsPaper } : {}),
        ...(steps.length > 0 ? { steps } : {}),
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
