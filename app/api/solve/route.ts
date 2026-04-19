import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { z } from "zod"
import { getAIMode } from "@/lib/ai-mode"
import { getAzure, getDeployment } from "@/lib/azure"
import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "homework-photos"

const schema = z.object({
  imagePath: z.string().min(1).optional(),
  imageName: z.string().optional(),
})

type Task = { id: string; text: string; type: string }
type Confidence = "high" | "medium" | "low"
type Reason = "not_homework" | "unreadable" | "no_tasks" | null
type SolveResult = {
  sessionId: string
  subject: string | null
  subjectConfidence?: Confidence
  tasks: Task[]
  reason?: Reason
  detectionNotes?: string | null
  mocked?: boolean
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  const imagePath = parsed.success ? parsed.data.imagePath : undefined

  const mode = await getAIMode()

  // Test mode OR no image: canned response so the flow always works.
  if (mode === "test" || !imagePath) {
    return NextResponse.json(mockSolve())
  }

  try {
    const imageData = await fetchImageAsDataUrl(imagePath)
    const extracted = await callVision(imageData)
    return NextResponse.json({
      sessionId: randomUUID(),
      subject: extracted.subject,
      subjectConfidence: extracted.subjectConfidence,
      tasks: extracted.tasks,
      reason: extracted.reason,
      detectionNotes: extracted.detectionNotes,
    } satisfies SolveResult)
  } catch (err) {
    console.error("[solve] vision failed:", (err as Error).message)
    // Graceful fallback — kid still gets a flow even if Azure hiccups.
    return NextResponse.json(mockSolve(true))
  }
}

// ─── Azure vision call ──────────────────────────────────────────────────────

async function callVision(imageDataUrl: string): Promise<{
  subject: string | null
  subjectConfidence: Confidence
  tasks: Task[]
  reason: Reason
  detectionNotes: string | null
}> {
  const client = getAzure()
  // Vision extraction needs some reasoning (to pick subject + grade) but
  // "minimal" still gives enough. Caps latency below 8s in most cases.
  const gpt5Extras = {
    reasoning_effort: "minimal",
    max_completion_tokens: 1000,
  } as unknown as Record<string, never>
  const completion = await client.chat.completions.create({
    model: getDeployment(),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: VISION_SYSTEM_PROMPT,
      },
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
  const parsed = JSON.parse(raw) as {
    subject?: string | null
    subjectConfidence?: string
    tasks?: { text?: string; type?: string }[]
    reason?: string
    detectionNotes?: string | null
  }

  const tasks: Task[] = (parsed.tasks ?? [])
    .filter(t => typeof t.text === "string" && t.text.trim().length > 0)
    .slice(0, 8)
    .map((t, i) => ({
      id: `t${i + 1}`,
      text: t.text!.trim(),
      type: (t.type ?? "task").toString().slice(0, 30),
    }))

  const subject = normaliseSubject(parsed.subject ?? null)
  const subjectConfidence = normaliseConfidence(parsed.subjectConfidence)
  const reason = normaliseReason(parsed.reason)
  const detectionNotes =
    typeof parsed.detectionNotes === "string" && parsed.detectionNotes.trim().length > 0
      ? parsed.detectionNotes.trim().slice(0, 160)
      : null

  return {
    subject,
    subjectConfidence,
    tasks,
    // If AI didn't give a reason but also found no tasks, default to no_tasks.
    reason: tasks.length === 0 ? (reason ?? "no_tasks") : null,
    detectionNotes,
  }
}

const VISION_SYSTEM_PROMPT = `\
Du er en assistent der udtrækker danske folkeskoleopgaver fra et foto.
Returnér UDELUKKENDE valid JSON med denne struktur:

{
  "subject": "matematik" | "dansk" | "engelsk" | null,
  "subjectConfidence": "high" | "medium" | "low",
  "tasks": [
    { "text": "opgaveteksten ordret som på billedet", "type": "addition"|"subtraction"|"word-problem"|"reading"|"grammar"|"translation"|"composition"|"task" }
  ],
  "reason": "not_homework" | "unreadable" | "no_tasks" | null,
  "detectionNotes": "kort dansk note hvis du er i tvivl om faget, ellers null"
}

REGLER:
- Find hver opgave på siden. Medtag alle synlige opgaver (maks 8).
- "text" skal være opgaveteksten ordret fra billedet på dansk. Ret åbenlyse OCR-fejl.
- "subject": sæt dit bedste bud selv hvis du er i tvivl; brug subjectConfidence til at udtrykke tvivlen.
  - high: tydeligt fag (f.eks. regneopgaver, eller dansk tekst med grammatikspørgsmål)
  - medium: sandsynligt men der mangler entydig kontekst
  - low: du gætter — måske rigtigt, måske forkert
- "subject": null kun hvis du virkelig ikke kan afgøre det.
- GÆT IKKE KLASSETRIN. Klassetrinnet kommer fra barnets profil, ikke fra billedet.
- "tasks": [] hvis der ikke er skoleopgaver på billedet.
- "reason": udfyld KUN hvis tasks er tom.
  - "not_homework": billedet viser ikke skoleopgaver
  - "unreadable": teksten er for sløret, mørk eller forvrænget til at læse
  - "no_tasks": det er skoleagtigt materiale, men ingen egentlige opgaver (f.eks. overskrift uden spørgsmål)
- "detectionNotes": kort dansk forklaring kun ved subjectConfidence = low eller medium, så vi kan spørge eleven. F.eks. "Der er både tal og tekst — kan være matematik eller dansk med tekststykker".
- INTET andet end JSON. Ingen markdown. Ingen kommentarer.`

// ─── Supabase Storage fetch ─────────────────────────────────────────────────

async function fetchImageAsDataUrl(path: string): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).download(path)
  if (error || !data) {
    throw new Error(`storage_download_failed: ${error?.message ?? "no data"}`)
  }
  const buffer = Buffer.from(await data.arrayBuffer())
  const mime = data.type || guessMime(path)
  return `data:${mime};base64,${buffer.toString("base64")}`
}

function guessMime(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  return (
    { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" }[ext] ||
    "image/jpeg"
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SUBJECT_ALIASES: Record<string, string> = {
  math: "matematik",
  matematik: "matematik",
  danish: "dansk",
  dansk: "dansk",
  english: "engelsk",
  engelsk: "engelsk",
}

function normaliseSubject(s: string | null): string | null {
  if (!s) return null
  return SUBJECT_ALIASES[s.toLowerCase()] ?? null
}

function normaliseConfidence(c: string | undefined): Confidence {
  if (c === "high" || c === "medium" || c === "low") return c
  return "medium"
}

function normaliseReason(r: string | undefined): Reason {
  if (r === "not_homework" || r === "unreadable" || r === "no_tasks") return r
  return null
}


// ─── Fallback mock ──────────────────────────────────────────────────────────

function mockSolve(soft = false): SolveResult {
  const pool = [
    {
      subject: "matematik",
      tasks: [
        { id: "t1", text: "Regn ud: 24 + 17", type: "addition" },
        { id: "t2", text: "Regn ud: 36 − 19", type: "subtraction" },
        { id: "t3", text: "Hvor mange æbler er der i alt, hvis Lærke har 5 og Jonas har 8?", type: "word-problem" },
      ],
    },
    {
      subject: "dansk",
      tasks: [
        { id: "t1", text: "Hvad handler teksten om? Skriv med dine egne ord.", type: "reading" },
        { id: "t2", text: "Find tre tillægsord i teksten.", type: "grammar" },
        { id: "t3", text: "Sæt komma i sætningen: 'Da vi kom hjem var hunden glad'.", type: "grammar" },
      ],
    },
    {
      subject: "engelsk",
      tasks: [
        { id: "t1", text: "Translate: 'Hunden løber i parken'.", type: "translation" },
        { id: "t2", text: "Write a sentence using the word 'yesterday'.", type: "composition" },
        { id: "t3", text: "Fill in: 'She ___ (go) to school every day.'", type: "grammar" },
      ],
    },
  ]
  const pick = pool[Math.floor(Math.random() * pool.length)]
  return {
    sessionId: randomUUID(),
    subject: pick.subject,
    tasks: pick.tasks,
    mocked: !soft ? true : undefined,
  }
}
