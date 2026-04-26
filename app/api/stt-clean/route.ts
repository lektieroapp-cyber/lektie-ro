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
