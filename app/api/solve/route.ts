import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { z } from "zod"
import { getAIMode } from "@/lib/ai-mode"
import { createAdminClient } from "@/lib/supabase/admin"
import { extractTasksFromImage, type VisionTask } from "@/lib/vision"

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "homework-photos"

const schema = z.object({
  imagePath: z.string().min(1).optional(),
  imageName: z.string().optional(),
})

type Task = VisionTask
type SolveResult = {
  sessionId: string
  subject: string | null
  subjectConfidence?: "high" | "medium" | "low"
  tasks: Task[]
  reason?: "not_homework" | "unreadable" | "no_tasks" | null
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
    const extracted = await extractTasksFromImage(imageData)
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
