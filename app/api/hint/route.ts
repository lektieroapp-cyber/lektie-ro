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
  subject?: string
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Body
  const mode = (body.mode === "explain" ? "explain" : "hint") as "explain" | "hint"
  const turnIndex = body.turns.filter(t => t.role === "assistant").length
  const subject = body.subject ?? "matematik"

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

  // Build system prompt.ready for Azure, used for mock structure too.
  const _systemPrompt = buildChildSystemPrompt({
    mode,
    subject,
    grade: child?.grade ?? 4,
    taskText: body.taskText,
    child,
  })

  // TODO: replace mock with Azure OpenAI streaming call using _systemPrompt

  const reply = mode === "explain"
    ? pickExplainReply(subject, body.taskText, turnIndex)
    : pickHintReply(subject, body.taskText, turnIndex)

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

// ─── Subject-specific mock replies ──────────────────────────────────────────

function pickExplainReply(subject: string, taskText: string, i: number): string {
  const s = short(taskText)
  const bank = EXPLAIN_REPLIES[subject] ?? EXPLAIN_REPLIES.matematik
  return bank[Math.min(i, bank.length - 1)].replace("{task}", s)
}

function pickHintReply(subject: string, taskText: string, i: number): string {
  const s = short(taskText)
  const bank = HINT_REPLIES[subject] ?? HINT_REPLIES.matematik
  return bank[Math.min(i, bank.length - 1)].replace("{task}", s)
}

const EXPLAIN_REPLIES: Record<string, string[]> = {
  matematik: [
    "Den her kan du sagtens klare!\n\n**1.** Find tallene\n**2.** Vælg regningsart\n**3.** Regn ud\n\nHvad er det første skridt?",
    "Godt! Hvad sker der når du lægger dem sammen?",
    "Prøv at sige svaret med dine egne ord.",
  ],
  dansk: [
    "Læs sætningen langsomt igennem.\n\nHvad er det **vigtigste ord**?",
    "Godt set! Hvad fortæller det ord dig om teksten?",
    "Prøv at forklare det som til en ven.",
  ],
  engelsk: [
    "Kig på de danske ord. Hvilke **ligner** de engelske?",
    "Tænk over rækkefølgen:\n\n**Hvem** → **gør hvad** → **hvornår**",
    "Sig sætningen højt. Lyder den rigtigt?",
  ],
}

const HINT_REPLIES: Record<string, string[]> = {
  matematik: [
    "Okay! Hvad er **24 + 17**?\n\nPrøv at starte med tierne: **20 + 10** = ?",
    "Fint! Og hvad er **4 + 7**?",
    "Godt! Læg nu de to tal sammen. Hvad får du?",
    "Stærkt! Giver svaret mening?",
    "Du er tæt på. Hvad tror du det endelige svar er?",
    "Kan du huske en lignende opgave?",
    "Tag en slurk vand. Du er næsten i mål! 💧",
    "Skriv dit svar. Du har knækket den!",
  ],
  dansk: [
    "Læs sætningen højt for dig selv.\n\nHvor er der en **naturlig pause**?",
    "Godt! Det er dér kommaet skal sidde.",
    "Fint! Hvad er **hovedsætningen**?",
    "Prøv at skrive sætningen med kommaet.",
    "Læs den højt igen. Lyder det rigtigt?",
    "Tjek stavningen en sidste gang.",
    "Rejs dig og stræk dig! 🧘",
    "Skriv dit svar. Du har styr på det!",
  ],
  engelsk: [
    "**Hunden** = the dog\n**løber** = runs\n**i parken** = in the park\n\nKan du sætte det sammen?",
    "Godt! Hvad kommer først på engelsk?",
    "Er det **nutid** eller **datid**?",
    "Sig sætningen højt. Lyder den naturlig?",
    "Har du husket **stort bogstav** og **punktum**?",
    "Kender du ordet fra en sang eller film?",
    "Hent et glas vand. Du klarer det! 💧",
    "Skriv dit svar. Du klarede det!",
  ],
}

function short(s: string): string {
  return s.length > 60 ? s.slice(0, 57) + "…" : s
}

function chunkify(text: string): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i += 4) out.push(text.slice(i, i + 4))
  return out
}
