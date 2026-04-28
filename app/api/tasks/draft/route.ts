import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/auth/session"
import { getAIMode } from "@/lib/ai-mode"
import { fetchStorageImageAsDataUrl } from "@/lib/image-fetch"
import {
  extractTasksFromImage,
  verifyExpectedAnswers,
  type VisionTask,
} from "@/lib/vision"

// Same shape as /api/solve but never creates a session — extracted tasks
// are returned to the parent review queue, then the client posts approved
// ones to /api/tasks individually.
type DraftResult = {
  subject: string | null
  subjectConfidence?: "high" | "medium" | "low"
  /** AI-suggested kid-facing bundle name. Editable client-side. */
  groupTitle?: string | null
  tasks: VisionTask[]
  reason?: "not_homework" | "unreadable" | "no_tasks" | null
  detectionNotes?: string | null
  mocked?: boolean
  usage?: {
    promptTokens: number
    completionTokens: number
    model: string
  } | null
  /** Server-measured wall time (ms) from request start to response. Useful
   *  when debugging slow extractions. Always present. */
  elapsedMs?: number
  /** Storage path of the photo this draft used — echoed back so the
   *  client can pin it to a re-run button without storing it itself. */
  imagePath?: string
}

const schema = z.object({
  imagePath: z.string().min(1).optional(),
  imageName: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  const imagePath = parsed.success ? parsed.data.imagePath : undefined

  const mode = await getAIMode()
  const start = Date.now()

  if (mode === "test" || !imagePath) {
    const mock = mockDraft()
    return NextResponse.json({ ...mock, elapsedMs: Date.now() - start, imagePath })
  }

  try {
    const imageData = await fetchStorageImageAsDataUrl(imagePath)
    const extracted = await extractTasksFromImage(imageData)

    // Second-pass verification of per-step expected answers. The first
    // pass juggles a lot of structural concerns and answer-checking
    // gets noisy; a focused fresh-eyes verification consistently catches
    // 1-2 OCR slips per page in our testing (digits flipped, columns
    // swapped). Skipped when no task has expectedAnswers (creative-only
    // pages) or when env opts out via AI_VERIFY_ANSWERS=off.
    let verifiedTasks = extracted.tasks
    const verifyOff = (process.env.AI_VERIFY_ANSWERS ?? "").toLowerCase() === "off"
    if (
      !verifyOff &&
      extracted.tasks.some(
        t => t.expectedAnswers && t.expectedAnswers.some(a => a.trim().length > 0),
      )
    ) {
      const corrections = await verifyExpectedAnswers(imageData, extracted.tasks)
      if (corrections.size > 0) {
        verifiedTasks = extracted.tasks.map(t => {
          const fixed = corrections.get(t.id)
          if (!fixed) return t
          return { ...t, expectedAnswers: fixed }
        })
      }
    }

    return NextResponse.json({
      subject: extracted.subject,
      subjectConfidence: extracted.subjectConfidence,
      groupTitle: extracted.groupTitle,
      tasks: verifiedTasks,
      reason: extracted.reason,
      detectionNotes: extracted.detectionNotes,
      usage: extracted.usage ?? null,
      elapsedMs: Date.now() - start,
      imagePath,
    } satisfies DraftResult)
  } catch (err) {
    const message = (err as Error).message
    console.error("[tasks/draft]", message)
    return NextResponse.json(
      { error: "vision_failed", message, elapsedMs: Date.now() - start, imagePath },
      { status: 502 },
    )
  }
}

function mockDraft(): DraftResult {
  const pool = [
    {
      subject: "matematik",
      tasks: [
        { id: "t1", title: "Plus", text: "Regn ud: 24 + 17", type: "addition" },
        { id: "t2", title: "Minus", text: "Regn ud: 36 − 19", type: "subtraction" },
      ],
    },
    {
      subject: "dansk",
      tasks: [
        { id: "t1", title: "Læs og resumer", text: "Hvad handler teksten om? Skriv med dine egne ord.", type: "reading" },
        { id: "t2", title: "Find tillægsord", text: "Find tre tillægsord i teksten.", type: "grammar" },
      ],
    },
    {
      subject: "engelsk",
      tasks: [
        { id: "t1", title: "Oversæt", text: "Translate: 'Hunden løber i parken'.", type: "translation" },
        { id: "t2", title: "Sætning med 'yesterday'", text: "Write a sentence using the word 'yesterday'.", type: "composition" },
      ],
    },
  ]
  const pick = pool[Math.floor(Math.random() * pool.length)]
  return {
    subject: pick.subject,
    tasks: pick.tasks,
    mocked: true,
  }
}
