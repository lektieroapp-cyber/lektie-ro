import { NextResponse, type NextRequest } from "next/server"
import { getAIMode } from "@/lib/ai-mode"
import { getAzure, getDeployment } from "@/lib/azure"

// Matches a kid's free-form spoken answer to one of the task cards in the
// task picker. Used when voice-agent mode is active so the kid can say
// "jeg vil starte med at beskrive mit hjem" instead of tapping a specific
// card. Two-stage:
//   1. Cheap heuristic (ordinals, numbers, direct title contains). Catches
//      "den første", "anden", "nummer 2", "hjem".
//   2. LLM fallback via gpt-5-mini when the heuristic finds nothing obvious.
//
// Returns the task.id the kid most likely meant, or null when we can't
// confidently pick one. UI shows the fallback "tap a card" message when null.

type TaskInput = {
  id: string
  title?: string
  goal?: string
  text?: string
}

type Body = {
  transcript: string
  tasks: TaskInput[]
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Body
  if (
    !body.transcript ||
    !Array.isArray(body.tasks) ||
    body.tasks.length === 0
  ) {
    return NextResponse.json({ error: "invalid" }, { status: 400 })
  }

  const cleaned = body.transcript.toLowerCase().trim()

  // Heuristic pass.
  const heuristic = heuristicMatch(cleaned, body.tasks)
  if (heuristic) {
    return NextResponse.json({ taskId: heuristic, source: "heuristic" })
  }

  // LLM pass. Test mode short-circuits to the first task so the flow is
  // demoable without credits.
  const aiMode = await getAIMode()
  if (aiMode === "test") {
    return NextResponse.json({ taskId: body.tasks[0].id, source: "mock" })
  }

  const taskList = body.tasks
    .map(
      (t, i) =>
        `${i + 1}. id="${t.id}" — ${t.title ?? (t.text ?? "").slice(0, 80)}${
          t.goal ? ` (${t.goal})` : ""
        }`
    )
    .join("\n")

  const prompt = `Eleven skal vælge en opgave ved at sige hvad vedkommende vil lave. Find den opgave der passer bedst til elevens udsagn.

Eleven sagde: "${body.transcript}"

Tilgængelige opgaver:
${taskList}

Returnér KUN valid JSON: { "taskId": "<id>" } hvor id er det præcise id fra listen. Hvis ingen af opgaverne passer eller eleven tydeligvis ikke har valgt, returnér { "taskId": null }.`

  try {
    const client = getAzure()
    const extras = {
      reasoning_effort: "minimal",
      max_completion_tokens: 100,
    } as unknown as Record<string, never>
    const completion = await client.chat.completions.create({
      model: getDeployment(),
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      ...extras,
    })
    const raw = completion.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(raw) as { taskId?: string | null }
    const valid = body.tasks.find(t => t.id === parsed.taskId)
    return NextResponse.json({
      taskId: valid?.id ?? null,
      source: "ai",
    })
  } catch (err) {
    console.error("[match-task] azure failed:", (err as Error).message)
    return NextResponse.json(
      { taskId: null, error: (err as Error).message },
      { status: 502 }
    )
  }
}

// Ordinal / number / direct-title matcher. Runs before the LLM to dodge a
// round-trip when the kid gives an unambiguous answer.
function heuristicMatch(
  transcript: string,
  tasks: TaskInput[]
): string | null {
  const numMap = new Map<string, number>([
    // Danish ordinals + numbers, in rough expected frequency.
    ["første", 0], ["forste", 0], ["en", 0], ["et", 0], ["1", 0], ["nummer 1", 0], ["nummer en", 0], ["nummer et", 0],
    ["anden", 1], ["to", 1], ["2", 1], ["nummer 2", 1], ["nummer to", 1],
    ["tredje", 2], ["tre", 2], ["3", 2], ["nummer 3", 2], ["nummer tre", 2],
    ["fjerde", 3], ["fire", 3], ["4", 3], ["nummer 4", 3], ["nummer fire", 3],
  ])

  // Ordinal/number match — look for standalone words so "tre" doesn't
  // match "tretten" etc.
  const tokens = transcript.split(/[\s.,!?]+/).filter(Boolean)
  for (const [phrase, idx] of numMap) {
    const parts = phrase.split(" ")
    if (parts.length === 1) {
      if (tokens.includes(parts[0]) && idx < tasks.length) return tasks[idx].id
    } else {
      // Multi-word phrase — look for contiguous match
      for (let i = 0; i <= tokens.length - parts.length; i++) {
        if (parts.every((p, j) => tokens[i + j] === p)) {
          if (idx < tasks.length) return tasks[idx].id
        }
      }
    }
  }

  // Direct title contains — kid might just repeat the title.
  for (const t of tasks) {
    const title = (t.title ?? "").toLowerCase().trim()
    if (title.length >= 3 && transcript.includes(title)) return t.id
  }

  return null
}
