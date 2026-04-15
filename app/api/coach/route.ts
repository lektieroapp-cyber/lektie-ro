import { type NextRequest } from "next/server"
import { getSessionUser } from "@/lib/auth/session"
import { buildCoachSystemPrompt } from "@/lib/prompts"

type Body = {
  question: string
  childName?: string
  grade?: number
  subject?: string
}

// Parent coaching endpoint. Streams a helpful, adult-pitched response to
// questions like "How do I explain fractions to my 4th grader tonight?"
// Uses buildCoachSystemPrompt which injects curriculum context.
// Real version: Azure OpenAI gpt-4o-mini. Mock: structured canned responses.
export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return new Response("unauthenticated", { status: 401 })
  }

  const body = (await request.json()) as Body
  const systemPrompt = buildCoachSystemPrompt({
    question: body.question,
    childName: body.childName,
    grade: body.grade,
    subject: body.subject,
  })

  // TODO: replace with Azure OpenAI call using systemPrompt + body.question
  const reply = pickCoachReply(body.question, body.subject, body.grade)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunkify(reply)) {
        controller.enqueue(encoder.encode(chunk))
        await new Promise(r => setTimeout(r, 30))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Mocked": "1",
      "X-System-Prompt-Length": String(systemPrompt.length),
    },
  })
}

function pickCoachReply(question: string, subject?: string, grade?: number): string {
  const gradeStr = grade ? `${grade}. klasse` : "det klassetrin"
  const subjectStr = subject ?? "det fag"

  const replies = [
    `Godt spørgsmål! Det bedste du kan gøre derhjemme er at stille spørgsmål frem for at give svaret. Spørg: "Hvad tror du der sker her?" eller "Hvad ved du allerede om ${subjectStr}?". Det aktiverer barnets egne tanker og giver dig et billede af, hvad de faktisk forstår — og hvad der mangler. Prøv at sætte 5 minutter af til bare at spørge, ikke forklare.`,

    `På ${gradeStr} er det vigtigste ikke at have styr på alt — det er at have mod til at prøve. Hjælp dit barn ved at dele opgaven op i meget små skridt: "Hvad er det FØRSTE vi skal gøre her?" Mange børn sidder fast fordi hele opgaven virker overvældende. Et lille første skridt bryder blokeringen.`,

    `Et godt trick er at bede dit barn forklare opgaven til dig, som om du ikke ved noget. Når de skal sætte ord på det, opdager de selv hvad de forstår og hvad de er usikre på. Det lyder mærkeligt, men det virker meget bedre end at du forklarer — fordi de så er aktive, ikke passive.`,
  ]

  const idx = Math.abs(question.length) % replies.length
  return replies[idx]
}

function chunkify(text: string): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i += 4) out.push(text.slice(i, i + 4))
  return out
}
