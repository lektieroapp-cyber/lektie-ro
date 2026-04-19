import { type NextRequest } from "next/server"
import { getAIMode } from "@/lib/ai-mode"
import { getAzure, getDeployment } from "@/lib/azure"
import { buildChildSystemPrompt } from "@/lib/prompts"
import { createAdminClient } from "@/lib/supabase/admin"

type Turn = { role: "user" | "assistant"; content: string }
type Body = {
  sessionId: string
  taskText: string
  turns: Turn[]
  mode?: string
  childId?: string
  subject?: string
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Body
  const mode = (body.mode === "explain" ? "explain" : "hint") as "explain" | "hint"
  const subject = body.subject ?? "matematik"

  let child = null as null | {
    name: string
    grade: number
    interests: string | null
    specialNeeds: string | null
  }
  if (body.childId) {
    const admin = createAdminClient()
    const { data } = await admin
      .from("children")
      .select("name, grade, interests, special_needs")
      .eq("id", body.childId)
      .single()
    if (data) {
      child = {
        name: data.name,
        grade: data.grade,
        interests: data.interests ?? null,
        specialNeeds: data.special_needs ?? null,
      }
    }
  }

  const systemPrompt = buildChildSystemPrompt({
    mode,
    subject,
    // Grade comes strictly from the child profile — no photo-based fallback.
    // If the kid hasn't set a grade, the prompt adapts to unknown level.
    grade: child?.grade ?? null,
    taskText: body.taskText,
    child,
  })

  // First turn: we seed a user message with the task so the assistant has
  // something concrete to anchor on. Subsequent turns are the kid's replies.
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Opgaven er: ${body.taskText}` },
    ...body.turns.map(t => ({ role: t.role, content: t.content })),
  ]

  const aiMode = await getAIMode()
  // Test mode → canned stream so the flow is demoable without credits.
  if (aiMode === "test") {
    return streamFallback(mode, subject)
  }

  try {
    const client = getAzure()
    // reasoning_effort=minimal is CRITICAL for gpt-5-mini — default "medium"
    // burns 30-60s on internal thinking before the first token, and these
    // Socratic turns don't need deep reasoning. "minimal" keeps it snappy.
    // The SDK's ChatCompletionCreateParams doesn't yet include GPT-5 fields,
    // so we spread them in via a looser record (keeps the stream overload).
    const gpt5Extras = {
      reasoning_effort: "minimal",
      max_completion_tokens: 400,
    } as unknown as Record<string, never>
    const azureStream = await client.chat.completions.create({
      model: getDeployment(),
      messages,
      stream: true,
      ...gpt5Extras,
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of azureStream) {
            const token = chunk.choices[0]?.delta?.content
            if (token) controller.enqueue(encoder.encode(token))
          }
          controller.close()
        } catch (err) {
          console.error("[hint] stream error:", (err as Error).message)
          controller.enqueue(encoder.encode("\n\nHov, noget gik galt. Prøv igen."))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (err) {
    console.error("[hint] azure call failed:", (err as Error).message)
    return streamFallback(mode, subject)
  }
}

// ─── Fallback (no Azure configured or call failed) ──────────────────────────

function streamFallback(mode: "explain" | "hint", subject: string): Response {
  const text = mode === "explain"
    ? FALLBACK_EXPLAIN[subject] ?? FALLBACK_EXPLAIN.matematik
    : FALLBACK_HINT[subject] ?? FALLBACK_HINT.matematik

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < text.length; i += 4) {
        controller.enqueue(encoder.encode(text.slice(i, i + 4)))
        await new Promise(r => setTimeout(r, 25))
      }
      controller.close()
    },
  })
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Mocked": "1",
    },
  })
}

const FALLBACK_EXPLAIN: Record<string, string> = {
  matematik: "Den her kan du sagtens klare!\n\nKig først på tallene — hvad beder opgaven dig om at gøre?",
  dansk: "Læs opgaven langsomt igennem.\n\nHvad er det vigtigste ord i sætningen?",
  engelsk: "Kig på de danske ord. Hvilke ord ligner de engelske?",
}

const FALLBACK_HINT: Record<string, string> = {
  matematik: "Okay! Prøv at starte med det letteste. Hvad ser du først i opgaven?",
  dansk: "Læs den højt for dig selv. Hvor er der en naturlig pause?",
  engelsk: "Sig sætningen højt. Hvad kommer først på engelsk?",
}
