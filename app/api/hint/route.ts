import { type NextRequest } from "next/server"

type Turn = { role: "user" | "assistant"; content: string }
type Body = { sessionId: string; taskText: string; turns: Turn[] }

// Mock Socratic hint. Streams text chunks so the UI can render a typewriter
// effect. Real version will call Azure OpenAI gpt-4o-mini with the system
// prompt from lib/prompts.ts. The important invariant — never reveal the
// answer — is hand-enforced in the mock replies below.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as Body
  const turnIndex = body.turns.filter(t => t.role === "assistant").length
  const reply = pickReply(body.taskText, turnIndex)

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

function pickReply(taskText: string, turnIndex: number): string {
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
  // Emit 3–5 char chunks so the stream visibly "types".
  const out: string[] = []
  for (let i = 0; i < text.length; i += 4) out.push(text.slice(i, i + 4))
  return out
}
