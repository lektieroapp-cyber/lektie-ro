import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "crypto"
import sharp from "sharp"
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
  /** Real Azure usage for the dev cost panel. */
  usage?: {
    promptTokens: number
    completionTokens: number
    model: string
  } | null
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
      usage: extracted.usage ?? null,
    } satisfies SolveResult)
  } catch (err) {
    const message = (err as Error).message
    console.error("[solve] vision failed:", message)
    // Surface a real error in live mode — the previous behaviour of
    // returning a random mock task on failure looked like the kid had
    // pasted nonsense (e.g. "her er fake matematik" when the paste actually
    // failed). Mocks are reserved for AI_MODE=test.
    return NextResponse.json(
      { error: "vision_failed", message },
      { status: 502 },
    )
  }
}

// ─── Supabase Storage fetch ─────────────────────────────────────────────────

// Pasted screenshots / phone photos arrive as anything from a 500 KB JPEG
// to a 9 MB 4K PNG to an iPhone HEIC. Azure GPT-5/4o vision accepts JPEG /
// PNG / WebP / GIF only — HEIC is rejected — and silently fails on
// oversized payloads. Normalizing the bytes through sharp before building
// the data URL collapses every input to a single compact JPEG that the
// vision model is guaranteed to ingest:
//   - HEIC/HEIF → JPEG (libheif via sharp)
//   - longest side capped at 2048 px (homework text is still crisply
//     readable; Azure's image-token cost drops dramatically vs. 4K)
//   - quality 85 keeps the data URL small enough not to bloat the
//     serverless function payload
//   - .rotate() honors EXIF so iPhone-portrait photos arrive upright
async function fetchImageAsDataUrl(path: string): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).download(path)
  if (error || !data) {
    throw new Error(`storage_download_failed: ${error?.message ?? "no data"}`)
  }
  const inputBuffer = Buffer.from(await data.arrayBuffer())
  let normalized: Buffer
  try {
    normalized = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: 2048,
        height: 2048,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer()
  } catch (err) {
    // sharp failed (truly malformed file, unsupported codec, etc.). Re-throw
    // with a clearer message so the catch in POST surfaces a useful log line
    // instead of "Input buffer contains unsupported image format".
    throw new Error(
      `image_normalize_failed: ${(err as Error).message} (size=${inputBuffer.length})`
    )
  }
  return `data:image/jpeg;base64,${normalized.toString("base64")}`
}

// ─── Test-mode mock ─────────────────────────────────────────────────────────
// Used ONLY when AI_MODE=test (or env unset and Azure not configured).
// Live-mode failures return a 502 so the client can show a real error
// instead of fake homework.

function mockSolve(): SolveResult {
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
    mocked: true,
  }
}
