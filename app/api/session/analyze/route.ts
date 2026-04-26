import { NextResponse, type NextRequest } from "next/server"
import { getAIMode } from "@/lib/ai-mode"
import { getAzure, getDeployment } from "@/lib/azure"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth/session"
import {
  getSkillsForSubjectAndGrade,
  lookupSkill,
} from "@/lib/curriculum/taxonomy"

// Post-session analysis pass. Runs the conversation + task through a small
// LLM and extracts a structured baseline of what the kid handled
// confidently vs struggled with. Output is persisted on the session row
// so the parent dashboard can aggregate across sessions per child × subject.
//
// Designed to be:
//   - Fire-and-forget from the client (PATCH /api/session triggers it after
//     completion; failure here never blocks the kid's flow).
//   - Idempotent. analyzed_at is set on success; re-running is harmless.
//   - Cheap. Mini deployment + reasoning_effort=minimal + ~600 input tokens
//     of compact turns + ~200 output tokens of structured JSON.
//
// Concept names are intentionally curriculum-shaped ("subtraktion med
// veksling", "datid af regelmæssige verber") rather than surface task names
// so they aggregate meaningfully when the kid does similar tasks again.

type Turn = { role: "user" | "assistant"; content: string }

type SessionRow = {
  id: string
  parent_id: string
  child_id: string
  subject: string
  grade: number
  problem_text: string | null
  problem_type: string | null
  turn_count: number
  completed: boolean
  completion_kind: string | null
  steps_done: number | null
  steps_total: number | null
}

type Body = {
  sessionId: string
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const body = (await request.json()) as Body
  if (!body.sessionId) {
    return NextResponse.json({ error: "missing_sessionId" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify ownership before touching the row (the analyze endpoint runs
  // with service-role privileges, so the parent_id check is the security
  // boundary, not RLS).
  const { data: session } = await admin
    .from("sessions")
    .select(
      "id, parent_id, child_id, subject, grade, problem_text, problem_type, turn_count, completed, completion_kind, steps_done, steps_total"
    )
    .eq("id", body.sessionId)
    .eq("parent_id", user.id)
    .single<SessionRow>()

  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 })
  }

  // Skip sessions that were never meaningfully engaged with — no signal
  // to extract from a 0-turn or 1-turn aborted row.
  if (session.turn_count < 2) {
    return NextResponse.json({ skipped: "too_few_turns" })
  }

  // Pull the turns. Order matters — the LLM reads the dialogue as written.
  const { data: turnsData } = await admin
    .from("turns")
    .select("role, content")
    .eq("session_id", body.sessionId)
    .order("created_at", { ascending: true })
  const turns: Turn[] = (turnsData ?? []) as Turn[]
  if (turns.length === 0) {
    return NextResponse.json({ skipped: "no_turns" })
  }

  // Test mode: write a deterministic placeholder so the dashboard can be
  // demoed end-to-end without burning Azure credits.
  const aiMode = await getAIMode()
  if (aiMode === "test") {
    const fake = {
      summary: "Demo: barnet arbejdede med opgaven og fik styr på de fleste trin.",
      concepts_solid: ["talforståelse"],
      concepts_struggled: [],
      patterns: [],
      next_focus: null,
    }
    await admin
      .from("sessions")
      .update({
        insights: fake,
        concepts_solid: fake.concepts_solid,
        concepts_struggled: fake.concepts_struggled,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", body.sessionId)
    return NextResponse.json({ ok: true, source: "mock", insights: fake })
  }

  const transcript = turns
    .map(t => `${t.role === "user" ? "BARN" : "DANI"}: ${t.content.replace(/\s+/g, " ").slice(0, 600)}`)
    .join("\n")

  // Constrain the model to canonical skill IDs from the taxonomy. This
  // is what makes per-skill aggregation possible across many sessions —
  // free-form names ("subtraktion med veksling" vs "minus med lån") don't
  // collapse cleanly. If nothing in the conversation matches a taxonomy
  // skill the model returns an empty list — that's fine, just means the
  // session was about something we don't track yet.
  const candidateSkills = getSkillsForSubjectAndGrade(session.subject, session.grade)
  const skillMenu = candidateSkills
    .map(s => `  - ${s.id} — ${s.label} (${s.domain})`)
    .join("\n")

  const prompt = `Du analyserer en lektiesamtale mellem en dansk folkeskoleelev og AI-tutoren Dani. Identificér PRÆCIST hvilke faglige begreber barnet håndterede sikkert og hvilke det havde svært ved.

KONTEKST:
- Fag: ${session.subject}
- Klassetrin: ${session.grade}. klasse
- Opgave: ${(session.problem_text ?? "").slice(0, 400)}
- Opgavetype: ${session.problem_type ?? "(ukendt)"}
- Status: ${session.completion_kind ?? (session.completed ? "completed" : "?")}${
    session.steps_total ? ` (${session.steps_done ?? 0}/${session.steps_total} trin)` : ""
  }
- Antal turn: ${session.turn_count}

SAMTALE:
${transcript.slice(0, 6000)}

KANONISK FAGLIG TAKSONOMI for ${session.subject} — du SKAL vælge ID'er herfra:
${skillMenu || "  (ingen taxonomy for dette fag — returnér tomme arrays)"}

REGLER:
- "concepts_solid" og "concepts_struggled" indeholder UDELUKKENDE skill-id'er fra menuen ovenfor (fx "matematik.tal.sub-veksling"). Brug aldrig fri tekst.
- Inkludér KUN skills der TYDELIGT viser sig i samtalen. Hvis du ikke kan pege på en konkret tur der demonstrerer det, så skip det.
- "concepts_solid" = barnet løste eller forklarede det selv uden at skulle hjælpes igen.
- "concepts_struggled" = Dani måtte spørge om det samme to gange, barnet svarede forkert flere gange, eller barnet bad eksplicit om hjælp.
- En skill kan IKKE være både solid og struggled i samme session — pick det der dominerer.
- Ved tvivl: skip skill'en. Mindre signal er bedre end forkert signal.
- Hvis NINGEN skill fra menuen matcher hvad samtalen handlede om: returnér tomme arrays for solid og struggled. Det er OK.
- "patterns" = adfærdsmønstre på dansk, fx "spørger 'hvordan gør jeg' før første forsøg", "giver op efter ét forkert svar", "regner i hovedet uden at skrive". MAX 2.
- "next_focus" = ÉN konkret ting at træne næste gang, på dansk, MAX 12 ord. Kan være null.
- "summary" = 1-2 sætninger på dansk om hvad der skete fagligt. Ikke ros eller værdidomme — bare fagligt.

Returnér KUN gyldig JSON i præcis dette skema:
{
  "summary": "<1-2 sætninger på dansk>",
  "concepts_solid":     ["<skill_id>", ...],
  "concepts_struggled": ["<skill_id>", ...],
  "patterns":           ["<observation>", ...],
  "next_focus":         "<sætning eller null>"
}`

  try {
    const client = getAzure()
    const deployment = getDeployment()
    const extras = {
      reasoning_effort: "minimal",
      max_completion_tokens: 600,
    } as unknown as Record<string, never>
    const completion = await client.chat.completions.create({
      model: deployment,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      ...extras,
    })
    const raw = completion.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(raw) as {
      summary?: string
      concepts_solid?: string[]
      concepts_struggled?: string[]
      patterns?: string[]
      next_focus?: string | null
    }

    // Defensive normalisation: cap array sizes, strip empty strings, clip
    // string lengths so a runaway prompt response can't bloat the row.
    const clean = {
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 400) : "",
      concepts_solid: cleanConceptList(parsed.concepts_solid),
      concepts_struggled: cleanConceptList(parsed.concepts_struggled),
      patterns: (parsed.patterns ?? [])
        .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
        .slice(0, 2)
        .map(p => p.slice(0, 200)),
      next_focus:
        typeof parsed.next_focus === "string" && parsed.next_focus.trim().length > 0
          ? parsed.next_focus.slice(0, 160)
          : null,
    }

    await admin
      .from("sessions")
      .update({
        insights: clean,
        concepts_solid: clean.concepts_solid,
        concepts_struggled: clean.concepts_struggled,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", body.sessionId)

    return NextResponse.json({
      ok: true,
      source: "ai",
      insights: clean,
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens ?? 0,
            completionTokens: completion.usage.completion_tokens ?? 0,
            model: deployment,
          }
        : null,
    })
  } catch (err) {
    console.error("[session/analyze] failed:", (err as Error).message)
    return NextResponse.json(
      { error: "analyze_failed", detail: (err as Error).message },
      { status: 502 }
    )
  }
}

// Only accepts canonical skill IDs that exist in the taxonomy. Rejects
// model hallucinations (free-form text, made-up IDs, typos) silently.
// Capped at 6 because more than that per session is almost always the
// model over-guessing rather than the kid actually demonstrating that
// many distinct skills.
function cleanConceptList(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of input) {
    if (typeof c !== "string") continue
    const id = c.trim().toLowerCase()
    if (!id) continue
    if (seen.has(id)) continue
    if (!lookupSkill(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= 6) break
  }
  return out
}
