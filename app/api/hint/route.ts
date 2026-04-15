import { type NextRequest } from "next/server"
import { buildChildSystemPrompt } from "@/lib/prompts"
import { createAdminClient } from "@/lib/supabase/admin"

type Turn = { role: "user" | "assistant"; content: string }
type Body = {
  sessionId: string
  taskText: string
  turns: Turn[]
  mode?: string
  childId?: string
}

// Streams a Socratic hint or task explanation back to the client.
// Real version: fetch child profile, build system prompt via lib/prompts.ts,
// call Azure OpenAI gpt-4o-mini, stream the response.
// Mock version: uses prompts.ts for structure but returns canned replies.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as Body
  const mode = (body.mode === "explain" ? "explain" : "hint") as "explain" | "hint"
  const turnIndex = body.turns.filter(t => t.role === "assistant").length

  // Fetch child profile if childId provided (used for prompt building).
  let child = null
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

  // Build the system prompt using curriculum + child context.
  // This is ready for Azure — just pass it as the system message.
  const _systemPrompt = buildChildSystemPrompt({
    mode,
    subject: "matematik", // TODO: pass from client via body.subject
    grade: child?.grade ?? 4,
    taskText: body.taskText,
    child,
  })

  // TODO: replace mock with:
  // const azure = getAzure(process.env.AZURE_OPENAI_MINI_DEPLOYMENT!)
  // const stream = await azure.chat.completions.create({
  //   model: process.env.AZURE_OPENAI_MINI_DEPLOYMENT!,
  //   messages: [
  //     { role: "system", content: _systemPrompt },
  //     ...body.turns.map(t => ({ role: t.role, content: t.content })),
  //     { role: "user", content: body.taskText },
  //   ],
  //   stream: true,
  // })

  const reply = mode === "explain"
    ? pickExplainReply(body.taskText, turnIndex)
    : pickHintReply(body.taskText, turnIndex)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunkify(reply)) {
        controller.enqueue(encoder.encode(chunk))
        await new Promise(r => setTimeout(r, 35))
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

function pickExplainReply(taskText: string, turnIndex: number): string {
  const replies = [
    `Opgaven "${short(taskText)}" handler om at finde ud af noget ved hjælp af det, du allerede ved. Du skal ikke bare gætte — der er en bestemt fremgangsmåde. Prøv at læse den igen: hvad er det præcist de beder dig beregne eller beskrive?`,
    "Godt spørgsmål! Det er faktisk et emne der dukker op mange steder. Tænk på det som en slags opskrift med faste skridt. Hvad tror du det første skridt er?",
    "Præcis — du er på rette vej. Prøv at sætte ord på det med dine egne ord, så ved du at du har forstået det.",
  ]
  return replies[Math.min(turnIndex, replies.length - 1)]
}

function pickHintReply(taskText: string, turnIndex: number): string {
  const replies = [
    `Hvad tror du er det første du skal kigge efter i opgaven "${short(taskText)}"?`,
    "Hvis du skulle forklare det til en ven, hvordan ville du dele problemet op i mindre skridt?",
    "Prøv at skrive det første skridt ned. Hvad ser du så?",
    "Kan du huske en lignende opgave fra timen? Hvordan løste I den dengang?",
    "Du er tæt på. Hvad tror du det næste skridt er?",
    "Super, du har snart knækket koden. Tjek: passer det du har gjort indtil videre?",
    "Hvad er den fremgangsmåde der giver mest mening for dig lige nu?",
    "Sidste skridt. Du er der næsten. Hvad mangler for at du er helt færdig?",
  ]
  return replies[Math.min(turnIndex, replies.length - 1)]
}

function short(s: string): string {
  return s.length > 60 ? s.slice(0, 57) + "…" : s
}

function chunkify(text: string): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i += 4) out.push(text.slice(i, i + 4))
  return out
}
