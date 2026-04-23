#!/usr/bin/env tsx
// scripts/simulate-session.ts
//
// End-to-end evaluation of the hint pipeline. For each cached extraction
// result in task-samples/.results/, pick the first task and simulate a 5-
// turn conversation between Dani (real hint prompt) and a synthetic pupil.
// A third LLM then grades the transcript on Socratic rules, language
// handling, acknowledgment, on-goal, and age-appropriateness.
//
// Lets us see the QUALITY of the hint flow across grades and subjects
// without hand-testing every combination — the learning loop for prompt
// tuning. Each run produces:
//
//   task-samples/.results/<folder>/<image>.session.json   — transcript + grade
//   task-samples/.results/SESSIONS.md                     — aggregate summary
//
// Usage:
//   npm run test:sessions                                  # all cached results
//   npm run test:sessions -- --filter 3                    # grade-3 folders
//   npm run test:sessions -- --only "5. Årgang matematik"
//   npm run test:sessions -- --turns 7                     # more rounds
//   npm run test:sessions -- --no-skip                     # force re-run
//
// Prereq: `npm run test:extraction` has already produced the .results/
// JSONs. This script ONLY handles the session/grade step.

import { config as dotenvConfig } from "dotenv"
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join, basename, extname } from "node:path"
import { getAzure, getDeployment } from "../lib/azure"
import { buildChildSystemPrompt } from "../lib/prompts"
import type { VisionResult } from "../lib/vision"

dotenvConfig({ path: ".env.local" })

type CliOpts = {
  filter?: string
  only?: string
  limit?: number
  turns: number
  skipExisting: boolean
}

function parseArgs(argv: string[]): CliOpts {
  const opts: CliOpts = { turns: 5, skipExisting: true }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--filter") opts.filter = argv[++i]
    else if (a === "--only") opts.only = argv[++i]
    else if (a === "--limit") opts.limit = parseInt(argv[++i], 10)
    else if (a === "--turns") opts.turns = parseInt(argv[++i], 10)
    else if (a === "--no-skip") opts.skipExisting = false
    else if (a === "--help" || a === "-h") {
      console.log(`\nUsage: tsx scripts/simulate-session.ts [options]
  --filter <str>       Only process folders containing <str>
  --only <folder>      Only process one specific folder
  --limit <n>          Stop after n sessions total
  --turns <n>          Conversation rounds to simulate (default 5)
  --no-skip            Re-run even when cached session JSON exists\n`)
      process.exit(0)
    }
  }
  return opts
}

const RESULTS = join(process.cwd(), "task-samples", ".results")

type Turn = { role: "user" | "assistant"; content: string }

type GraderReport = {
  scores: {
    socratic: number
    acknowledgment: number
    onGoal: number
    language: number
    ageAppropriate: number
  }
  praise: string[]
  issues: string[]
  summary: string
}

type SessionOutput = {
  image: string
  folder: string
  grade: number
  subject: string | null
  task: {
    title?: string
    text: string
    type: string
    goal?: string
    needsPaper?: boolean
    steps?: { label: string; prompt: string }[]
  }
  turns: Turn[]
  elapsedMs: number
  grade_report: GraderReport | null
  grader_error?: string
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!existsSync(RESULTS)) {
    console.error(
      `No .results/ found. Run 'npm run test:extraction' first so there's ` +
        `something to simulate against.`
    )
    process.exit(1)
  }

  const folders = (await readdir(RESULTS, { withFileTypes: true }))
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(n => (opts.only ? n === opts.only : true))
    .filter(n => (opts.filter ? n.toLowerCase().includes(opts.filter.toLowerCase()) : true))
    .sort()

  if (folders.length === 0) {
    console.error("No matching result folders. Check --filter/--only.")
    process.exit(1)
  }

  const outputs: SessionOutput[] = []
  let processed = 0
  const startedAll = Date.now()

  for (const folder of folders) {
    const grade = inferGradeFromFolderName(folder)
    const folderPath = join(RESULTS, folder)
    const files = (await readdir(folderPath)).filter(f => f.endsWith(".json"))

    for (const file of files) {
      if (opts.limit && processed >= opts.limit) break
      const extractPath = join(folderPath, file)
      const sessionPath = join(
        folderPath,
        basename(file, extname(file)) + ".session.json"
      )

      if (opts.skipExisting && existsSync(sessionPath)) {
        try {
          const cached = JSON.parse(
            await readFile(sessionPath, "utf8")
          ) as SessionOutput
          outputs.push(cached)
          console.log(`· cached  ${folder}/${file}`)
          processed++
          continue
        } catch {
          // fall through
        }
      }

      let raw: { result?: VisionResult; error?: string }
      try {
        raw = JSON.parse(await readFile(extractPath, "utf8"))
      } catch {
        console.log(`× ${folder}/${file}  unreadable extraction json`)
        continue
      }
      if (!raw.result || raw.result.tasks.length === 0) {
        console.log(`- ${folder}/${file}  no tasks — skip`)
        continue
      }

      const task = raw.result.tasks[0]
      const subject = raw.result.subject
      const started = Date.now()
      try {
        const turns = await simulate({
          task,
          subject,
          grade,
          turnCount: opts.turns,
        })
        const report = await gradeTranscript({
          task,
          subject,
          grade,
          turns,
        })
        const elapsedMs = Date.now() - started
        const output: SessionOutput = {
          image: extractPath,
          folder,
          grade,
          subject,
          task,
          turns,
          elapsedMs,
          grade_report: report,
        }
        await writeFile(sessionPath, JSON.stringify(output, null, 2))
        outputs.push(output)
        const scoreAvg = avgScore(report)
        console.log(
          `✓ ${folder}/${file}  ${turns.length} turns  score=${scoreAvg.toFixed(2)}  ${elapsedMs}ms`
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`✗ ${folder}/${file}  ${msg}`)
      }
      processed++
    }
    if (opts.limit && processed >= opts.limit) break
  }

  await writeAggregateReport(outputs, Date.now() - startedAll)
  console.log(
    `\nDone: ${processed} sessions. See ${join("task-samples", ".results", "SESSIONS.md")}.`
  )
}

function inferGradeFromFolderName(name: string): number {
  const m = name.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 4
}

// ─── Simulation ─────────────────────────────────────────────────────────

type TaskLike = {
  title?: string
  text: string
  type: string
  goal?: string
  needsPaper?: boolean
  steps?: { label: string; prompt: string }[]
}

async function simulate(args: {
  task: TaskLike
  subject: string | null
  grade: number
  turnCount: number
}): Promise<Turn[]> {
  const client = getAzure()

  // Dani system prompt — the REAL production prompt the kid-facing flow uses.
  const daniSystem = buildChildSystemPrompt({
    mode: "hint",
    subject: args.subject ?? "matematik",
    grade: args.grade,
    taskText: args.task.text,
    taskGoal: args.task.goal ?? null,
    taskSteps: args.task.steps ?? null,
    taskType: args.task.type,
    needsPaper: args.task.needsPaper ?? null,
    child: null,
    deliveryMode: "text",
  })

  // Synthetic pupil — mixes correct answers, mistakes, and confusion.
  // Different language posture per subject so engelsk/tysk kids try the
  // target language sometimes.
  const kidSystem = buildKidSystemPrompt(args.subject, args.grade, args.task)

  const turns: Turn[] = []
  // Seed: Dani speaks first (matches the real flow where callHint([]) fires
  // on mount and the first AI turn appears before any kid input).
  const firstAi = await callChat(client, daniSystem, [
    {
      role: "user",
      content: `Opgaven er: ${args.task.text}`,
    },
  ])
  turns.push({ role: "assistant", content: firstAi })

  for (let i = 0; i < args.turnCount - 1; i++) {
    const kid = await callChat(client, kidSystem, toKidView(turns))
    turns.push({ role: "user", content: kid })
    const dani = await callChat(client, daniSystem, [
      { role: "user", content: `Opgaven er: ${args.task.text}` },
      ...turns.map(t => ({ role: t.role, content: t.content })),
    ])
    turns.push({ role: "assistant", content: dani })
  }
  return turns
}

function buildKidSystemPrompt(
  subject: string | null,
  grade: number,
  task: TaskLike
): string {
  const subj = subject ?? "matematik"
  const langLine =
    subj === "engelsk"
      ? "Blandet dansk + engelsk — svar EN GANG IMELLEM på engelsk når opgaven inviterer til det ('I like …', 'I'm afraid of …'). Ellers dansk."
      : subj === "tysk"
        ? "Blandet dansk + enkelte tyske ord. Meta-kommunikation er dansk."
        : "Svar altid på dansk."
  const persona =
    grade <= 2
      ? "Du er en meget ung elev — korte ord, simpel sætningsbygning, nogle stavefejl, ofte spørgende."
      : grade <= 4
        ? "Du er mellemtrinselev — enkle sætninger, kan godt bruge fagtermer du har lært, men glemmer ofte ting."
        : "Du er ældre folkeskoleelev — bedre sprog, men stadig usikker på nye emner. Tænker højt."

  return `Du simulerer en ${grade}.-klasses elev i dansk folkeskole som laver lektier med AI-guiden Dani.

OPGAVEN du arbejder på:
Titel: ${task.title ?? task.text.slice(0, 50)}
Beskrivelse: ${task.text}
${task.goal ? `Mål: ${task.goal}` : ""}

REGLER FOR DIN REPLIK:
- MAKS 1-2 sætninger per tur. Kort, som en rigtig elev.
- Bland svarene: nogle gange prøver du rigtigt, andre gange er du i tvivl, andre gange laver du en fejl du kunne lave i den aldersgruppe.
- Personlighed: ${persona}
- Sprog: ${langLine}
- Stil IKKE dig selv som en voksen. Ingen meta-kommentarer.
- Hvis Dani har bedt dig gøre noget på papir: lad som om du har skrevet det ("Jeg skrev 4,8") i stedet for at give et fuldstændigt svar på én gang.
- Drop ALDRIG opgaven — svar altid med noget der driver samtalen videre.
- Skriv aldrig din rolle-beskrivelse tilbage — du er bare en elev.`
}

// Flip the transcript so the kid sees Dani's replies as "user" (i.e., someone
// talking to them) and the kid's own replies as "assistant" (i.e., themselves).
function toKidView(turns: Turn[]): { role: "user" | "assistant"; content: string }[] {
  return turns.map(t => ({
    role: t.role === "assistant" ? "user" : "assistant",
    content: t.content,
  }))
}

async function callChat(
  client: ReturnType<typeof getAzure>,
  system: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const gpt5Extras = {
    reasoning_effort: "minimal",
    max_completion_tokens: 250,
  } as unknown as Record<string, never>
  const completion = await client.chat.completions.create({
    model: getDeployment(),
    messages: [{ role: "system", content: system }, ...history],
    ...gpt5Extras,
  })
  return completion.choices[0]?.message?.content ?? ""
}

// ─── Grading ────────────────────────────────────────────────────────────

async function gradeTranscript(args: {
  task: TaskLike
  subject: string | null
  grade: number
  turns: Turn[]
}): Promise<GraderReport | null> {
  const client = getAzure()
  const transcript = args.turns
    .map((t, i) => `[${String(i + 1).padStart(2, "0")}] ${t.role === "assistant" ? "DANI" : "KID "}\n${t.content.trim()}`)
    .join("\n\n")

  const prompt = `Du er pædagogisk-ekspert der vurderer en tutorsamtale mellem Dani (AI-guide) og en ${args.grade}.-klasses elev i dansk folkeskole.

Fag: ${args.subject ?? "ukendt"}
Opgave: ${args.task.title ?? args.task.text.slice(0, 80)}
Mål: ${args.task.goal ?? "(ingen eksplicit)"}

TRANSSKRIPT:
${transcript}

Vurdér HVER regel 1-5 (5 er bedst) baseret på Danis samlede opførsel:

1. **socratic** — Dani gav ALDRIG facit direkte, men guidede eleven til selv at finde svaret.
2. **acknowledgment** — Dani reagerede konkret på elevens faktiske svar (ikke bare generisk ros).
3. **onGoal** — Dani holdt fokus på opgavens mål, gentog ikke målet i hvert svar.
4. **language** — Korrekt sprog: dansk for meta, engelsk for engelsk-indhold (hvis fag=engelsk), tysk for tysk-indhold.
5. **ageAppropriate** — Sætningslængde, ordforråd og kompleksitet passede til ${args.grade}. klasse.

Giv 3 KONKRETE ting Dani gjorde godt + 3 KONKRETE problemer (hver som én sætning).

Returnér UDELUKKENDE valid JSON:
{
  "scores": { "socratic": <1-5>, "acknowledgment": <1-5>, "onGoal": <1-5>, "language": <1-5>, "ageAppropriate": <1-5> },
  "praise": ["…", "…", "…"],
  "issues": ["…", "…", "…"],
  "summary": "Én sætning om samtalens samlede kvalitet."
}`

  try {
    const extras = {
      reasoning_effort: "minimal",
      max_completion_tokens: 700,
    } as unknown as Record<string, never>
    const completion = await client.chat.completions.create({
      model: getDeployment(),
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      ...extras,
    })
    const raw = completion.choices[0]?.message?.content ?? "{}"
    return JSON.parse(raw) as GraderReport
  } catch {
    return null
  }
}

function avgScore(r: GraderReport | null): number {
  if (!r) return 0
  const s = r.scores
  return (s.socratic + s.acknowledgment + s.onGoal + s.language + s.ageAppropriate) / 5
}

// ─── Aggregate report ───────────────────────────────────────────────────

async function writeAggregateReport(outputs: SessionOutput[], totalMs: number) {
  const lines: string[] = []
  lines.push(`# Session simulation report`)
  lines.push("")
  lines.push(
    `Ran at ${new Date().toISOString()}. ${outputs.length} sessions in ${(totalMs / 1000).toFixed(0)}s.`
  )
  lines.push("")

  const graded = outputs.filter(o => o.grade_report)
  if (graded.length === 0) {
    lines.push("No graded sessions.")
    await writeFile(join(RESULTS, "SESSIONS.md"), lines.join("\n"))
    return
  }

  const avg = (pick: (r: GraderReport) => number) =>
    graded.reduce((n, o) => n + pick(o.grade_report!), 0) / graded.length

  lines.push("## Aggregate scores (avg across all sessions, 1-5)")
  lines.push("")
  lines.push(`- Socratic:          **${avg(r => r.scores.socratic).toFixed(2)}**`)
  lines.push(`- Acknowledgment:    **${avg(r => r.scores.acknowledgment).toFixed(2)}**`)
  lines.push(`- On-goal:           **${avg(r => r.scores.onGoal).toFixed(2)}**`)
  lines.push(`- Language:          **${avg(r => r.scores.language).toFixed(2)}**`)
  lines.push(`- Age-appropriate:   **${avg(r => r.scores.ageAppropriate).toFixed(2)}**`)
  lines.push("")

  // Group by grade + subject to spot where prompts need work.
  lines.push("## Per grade × subject")
  lines.push("")
  lines.push("| Grade | Subject | N | Soc | Ack | Goal | Lang | Age | Overall |")
  lines.push("|---|---|---|---|---|---|---|---|---|")
  const buckets = new Map<string, SessionOutput[]>()
  for (const o of graded) {
    const key = `${o.grade}|${o.subject ?? "?"}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(o)
  }
  for (const [key, list] of [...buckets.entries()].sort()) {
    const [grade, subject] = key.split("|")
    const n = list.length
    const soc = list.reduce((n, o) => n + o.grade_report!.scores.socratic, 0) / list.length
    const ack = list.reduce((n, o) => n + o.grade_report!.scores.acknowledgment, 0) / list.length
    const goal = list.reduce((n, o) => n + o.grade_report!.scores.onGoal, 0) / list.length
    const lang = list.reduce((n, o) => n + o.grade_report!.scores.language, 0) / list.length
    const age = list.reduce((n, o) => n + o.grade_report!.scores.ageAppropriate, 0) / list.length
    const overall = (soc + ack + goal + lang + age) / 5
    lines.push(
      `| ${grade} | ${subject} | ${n} | ${soc.toFixed(1)} | ${ack.toFixed(1)} | ${goal.toFixed(1)} | ${lang.toFixed(1)} | ${age.toFixed(1)} | **${overall.toFixed(2)}** |`
    )
  }
  lines.push("")

  // Worst sessions first — that's where prompt tweaks will have impact.
  lines.push("## Weakest sessions (lowest overall)")
  lines.push("")
  const ranked = [...graded].sort((a, b) => avgScore(a.grade_report) - avgScore(b.grade_report))
  for (const o of ranked.slice(0, 10)) {
    const r = o.grade_report!
    const overall = avgScore(r).toFixed(2)
    lines.push(`### ${o.folder} — ${basename(o.image)} (overall ${overall})`)
    lines.push("")
    lines.push(`**Task:** ${o.task.title ?? o.task.text.slice(0, 80)}`)
    lines.push(
      `Scores: soc=${r.scores.socratic} ack=${r.scores.acknowledgment} ` +
        `goal=${r.scores.onGoal} lang=${r.scores.language} age=${r.scores.ageAppropriate}`
    )
    lines.push(`_${r.summary}_`)
    lines.push("")
    if (r.issues?.length) {
      lines.push(`**Issues:**`)
      for (const p of r.issues) lines.push(`- ${p}`)
      lines.push("")
    }
    if (r.praise?.length) {
      lines.push(`**Did well:**`)
      for (const p of r.praise) lines.push(`- ${p}`)
      lines.push("")
    }
  }

  // Full transcripts for every session — you can scroll and read.
  lines.push("## Transcripts")
  lines.push("")
  for (const o of outputs) {
    const r = o.grade_report
    const tag = r ? `(overall ${avgScore(r).toFixed(2)})` : "(no grade)"
    lines.push(`### ${o.folder} — ${basename(o.image)} ${tag}`)
    lines.push("")
    lines.push(`**${o.task.title ?? o.task.text.slice(0, 80)}**`)
    lines.push("")
    for (const t of o.turns) {
      const who = t.role === "assistant" ? "DANI" : "KID"
      lines.push(`**${who}:** ${t.content.trim()}`)
      lines.push("")
    }
  }

  await writeFile(join(RESULTS, "SESSIONS.md"), lines.join("\n"))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
