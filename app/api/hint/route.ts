import { type NextRequest } from "next/server"

type Turn = { role: "user" | "assistant"; content: string }
type Body = { sessionId: string; taskText: string; turns: Turn[]; mode?: string }

// Mock hint/explain responses. Streams text chunks for a typewriter effect.
// Real version will call Azure OpenAI gpt-4o-mini with the system prompt from
// lib/prompts.ts. The important invariant — never reveal the answer — is
// hand-enforced in the mock replies below.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as Body
  const turnIndex = body.turns.filter(t => t.role === "assistant").length
  const isExplain = body.mode === "explain"
  const reply = isExplain
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

// "Explain" mode: orient the child to what the task is about, what kind of
// answer is expected, and what concept it tests — without giving the answer.
function pickExplainReply(taskText: string, turnIndex: number): string {
  const replies = [
    `Opgaven "${short(taskText)}" handler om at finde ud af noget ved hjælp af det, du allerede ved. Du skal ikke bare gætte — du skal bruge en bestemt fremgangsmåde. Prøv at læse den igen og tænk: hvad er det, de beder dig beregne eller beskrive?`,
    "Godt spørgsmål! Det er faktisk et emne, der dukker op mange steder. Tænk på det som en slags opskrift — der er et bestemt rækkefølge af skridt, man følger. Hvad tror du det første skridt er?",
    "Præcis — du er på rette vej. Det handler om at finde sammenhængen. Prøv at sætte ord på det med dine egne ord, så ved du, at du har forstået det.",
  ]
  return replies[Math.min(turnIndex, replies.length - 1)]
}

// "Hint" mode: Socratic ladder — guide toward the answer with questions.
function pickHintReply(taskText: string, turnIndex: number): string {
  const replies = [
    `God start! Inden vi regner videre, hvad tænker du, er det første du skal kigge efter i opgaven "${short(taskText)}"?`,
    "Hvis du skulle forklare det til en ven, hvordan ville du så dele problemet op i mindre skridt?",
    "Prøv at skrive det første skridt ned. Hvad ser du så?",
    "Kan du huske en lignende opgave fra timen? Hvordan løste I den dengang?",
    "Du er tæt på. Hvad tror du det næste skridt skulle være?",
    "Super, du har snart knækket koden. Prøv at læse opgaven igen og tjek: passer det du har gjort indtil videre?",
    "Husk: der er ikke én rigtig vej. Hvad er den, der giver mest mening for dig lige nu?",
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
