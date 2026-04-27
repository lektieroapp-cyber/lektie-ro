import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { z } from "zod"
import { getAIMode } from "@/lib/ai-mode"
import { fetchStorageImageAsDataUrl } from "@/lib/image-fetch"
import { extractTasksFromImage, type VisionTask } from "@/lib/vision"

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
    const imageData = await fetchStorageImageAsDataUrl(imagePath)
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
