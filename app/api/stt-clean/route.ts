import { NextResponse, type NextRequest } from "next/server"
import { getAIMode } from "@/lib/ai-mode"
import { getAzure, getDeployment } from "@/lib/azure"

// Cleans up a kid's STT transcript using task context. Azure REST short-form
// recognition is good but not great on:
//   - Number words ("tolv" misheard as "to" / "tre"; "fyrre" → "førre")
//   - English vocabulary on engelsk tasks (rendered as Danish phonemes)
//   - Subject-specific terminology (matematik: "brøk", "decimal", "regnehul")
//   - Names and proper nouns mentioned in the homework photo
//
// We can't pass phrase hints to the REST endpoint (that requires the SDK or
// Custom Speech) so we run a tiny LLM cleanup pass instead. Given the raw
// transcript + Azure's NBest alternatives + task context + recent turns,
// pick (or synthesize) the most plausible interpretation.
//
// Returns the cleaned text plus a `changed` flag and the reason — useful
// for dev-log diagnostics ("STT corrected '12' → 'tolv'").

type Alternative = { text: string; confidence?: number }

type Body = {
  rawTranscript: string
  alternatives?: Alternative[]
  taskText?: string
  subject?: string
  grade?: number | null
  recentTurns?: { role: "user" | "assistant"; content: string }[]
}

type Response = {
  cleaned: string
  changed: boolean
  reason?: string
  source: "passthrough" | "ai" | "mock"
  usage?: {
    promptTokens: number
    completionTokens: number
    model: string
  } | null
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Body
  const raw = (body.rawTranscript ?? "").trim()
  if (!raw) {
    return NextResponse.json(
      { cleaned: "", changed: false, source: "passthrough" } satisfies Response
    )
  }

  // Ultra-short utterances ("ja", "nej", "okay") are almost always correct
  // and don't need cleanup. Skip the round-trip — saves latency on every
  // turn that's just an acknowledgement.
  if (raw.length < 5) {
    return NextResponse.json(
      { cleaned: raw, changed: false, source: "passthrough" } satisfies Response
    )
  }

  const aiMode = await getAIMode()
  if (aiMode === "test") {
    return NextResponse.json(
      { cleaned: raw, changed: false, source: "mock" } satisfies Response
    )
  }

  const altList = (body.alternatives ?? [])
    .slice(0, 4)
    .map(a => `  - "${a.text}"${a.confidence != null ? ` (conf ${a.confidence.toFixed(2)})` : ""}`)
    .join("\n")
  const recent = (body.recentTurns ?? [])
    .slice(-4)
    .map(t => `  ${t.role === "user" ? "BARN" : "DANI"}: ${t.content.slice(0, 200)}`)
    .join("\n")

  const prompt = `You are cleaning up a Danish speech-to-text transcript of a child (age 8–14) doing homework. The mic transcript may have mishears — common ones: number words confused, English vocabulary rendered as Danish phonemes, subject terminology garbled, proper names misheard.

Your job: return the kid's most plausible intended utterance given the homework context. Preserve their meaning and word choices. Don't expand abbreviations. Don't add words. Don't translate. Don't paraphrase. Don't fix grammar — kids speak imperfectly and that's fine. Only correct clear acoustic mistranscriptions.

CRITICAL — DO NOT HALLUCINATE TO FIT THE TASK:
- Kids go off-topic constantly. "Hvad skal vi nu", "jeg er træt", "kan vi
  spille noget", "det er kedeligt", "hvor er mor", "har vi lange ferier" —
  these are PERFECTLY VALID utterances. Pass them through UNCHANGED. Do
  NOT rewrite them into something that fits the homework task just because
  the words are different from the task.
- The task context is ONLY for disambiguating mishears that have multiple
  acoustic-plausible interpretations. It is NOT a license to bend a clear
  off-topic sentence into a task-shaped one.
- If the raw transcript is grammatical Danish (or grammatical English in
  engelsk tasks) and could plausibly be what a kid actually said, return
  it UNCHANGED even if it has nothing to do with the task. The tutor
  downstream will handle off-topic.
- Only "change" the transcript when the raw is acoustically AMBIGUOUS or
  CLEARLY GARBLED and a near-homophone alternative fits better. Examples:
    raw "to" + task is about "tolv" → maybe change to "tolv". Justified.
    raw "fyrre" + task says "førre" → keep raw, that's grammatical.
    raw "hvad skal vi nu" + task about prices → KEEP RAW. Off-topic but
      grammatical; the kid genuinely asked what to do next. NEVER rewrite
      this into "hvad er prisen på X". That's hallucination.
- The cleaned text MUST share most words with the raw. If you find
  yourself replacing more than 1-2 words at most, you are hallucinating.
  Stop and return the raw with changed=false.

Subject: ${body.subject ?? "(ukendt)"}
Grade: ${body.grade ?? "(ukendt)"}
${body.taskText ? `Task: ${body.taskText.slice(0, 600)}` : ""}
${recent ? `Recent conversation:\n${recent}` : ""}

Top STT result: "${raw}"
${altList ? `STT alternatives:\n${altList}` : ""}

Return JSON ONLY: { "cleaned": "<text>", "changed": <bool>, "reason": "<short, only if changed>" }
- "cleaned": the corrected utterance (or the original if no change needed)
- "changed": true only when "cleaned" differs meaningfully from the top STT result
- "reason": one short phrase explaining the correction, e.g. "tal-mishør" or "engelsk-ord", omit when changed=false`

  try {
    const client = getAzure()
    const deployment = getDeployment()
    const extras = {
      reasoning_effort: "minimal",
      max_completion_tokens: 200,
    } as unknown as Record<string, never>
    const completion = await client.chat.completions.create({
      model: deployment,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      ...extras,
    })
    const out = completion.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(out) as {
      cleaned?: string
      changed?: boolean
      reason?: string
    }
    const cleaned = (parsed.cleaned ?? "").trim()
    if (!cleaned) {
      // Model returned nothing useful — fall back to raw rather than silence.
      return NextResponse.json(
        { cleaned: raw, changed: false, source: "ai" } satisfies Response
      )
    }
    // Hallucination guard: when the kid says something off-topic
    // ("hvad skal vi nu") and the cleanup model rewrites it into a
    // task-shaped phrase ("hvad er prisen på stagen") it's strictly
    // worse than the raw transcript — we just hand the tutor a wrong
    // input. Compare word sets between raw and cleaned; if they share
    // < 50% of words, treat it as hallucination and pass raw through.
    // Single-word swaps stay allowed (intersection ratio still high).
    const rawWords = wordSet(raw)
    const cleanWords = wordSet(cleaned)
    if (rawWords.size > 1 && cleanWords.size > 0) {
      const shared = [...rawWords].filter(w => cleanWords.has(w)).length
      const ratio = shared / Math.max(rawWords.size, cleanWords.size)
      if (ratio < 0.5) {
        console.warn("[stt-clean] discarded hallucinated rewrite", {
          raw,
          cleaned,
          ratio: ratio.toFixed(2),
        })
        return NextResponse.json({
          cleaned: raw,
          changed: false,
          reason: "hallucination_guard",
          source: "ai",
          usage: completion.usage
            ? {
                promptTokens: completion.usage.prompt_tokens ?? 0,
                completionTokens: completion.usage.completion_tokens ?? 0,
                model: deployment,
              }
            : null,
        } satisfies Response)
      }
    }
    return NextResponse.json({
      cleaned,
      changed: !!parsed.changed && cleaned !== raw,
      reason: parsed.reason,
      source: "ai",
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens ?? 0,
            completionTokens: completion.usage.completion_tokens ?? 0,
            model: deployment,
          }
        : null,
    } satisfies Response)
  } catch (err) {
    console.error("[stt-clean] azure failed:", (err as Error).message)
    // Cleanup is best-effort — never block the conversation flow on this.
    return NextResponse.json(
      { cleaned: raw, changed: false, source: "passthrough" } satisfies Response
    )
  }
}

// Lowercase + strip punctuation, return the unique word set. Used to
// compare raw vs cleaned transcripts — when the cleanup model
// hallucinates a task-shaped rewrite, the word sets share almost
// nothing and we can drop the rewrite.
function wordSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[.,!?;:"()[\]]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 0),
  )
}
