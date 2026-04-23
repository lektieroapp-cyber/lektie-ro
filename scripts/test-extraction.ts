#!/usr/bin/env tsx
// scripts/test-extraction.ts
//
// Batch-test the vision extractor against every image in task-samples/.
// Reads .env.local for Azure credentials, walks each grade-subject folder,
// calls extractTasksFromImage(), writes per-image JSON + a summary report.
//
// Usage:
//   npm run test:extraction                # run against all samples
//   npm run test:extraction -- --filter 3  # only folders matching "3"
//   npm run test:extraction -- --limit 5   # stop after 5 images
//   npm run test:extraction -- --only "1. Årg matematik"  # one folder
//
// Output lives in task-samples/.results/:
//   - <folder>/<image>.json   — raw extraction result + elapsedMs
//   - REPORT.md               — human-readable summary across all images
//   - summary.json            — machine-readable stats for tooling
//
// Re-running with --no-skip forces a fresh call; default caches by file.

import { config as dotenvConfig } from "dotenv"
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises"

// Load credentials from .env.local (Next's convention) — dotenv defaults to
// .env which we don't use in this project.
dotenvConfig({ path: ".env.local" })

import { existsSync } from "node:fs"
import { join, basename, extname } from "node:path"
import { extractTasksFromImage, type VisionResult } from "../lib/vision"

type CliOpts = {
  filter?: string
  only?: string
  limit?: number
  perFolder?: number
  skipExisting: boolean
}

function parseArgs(argv: string[]): CliOpts {
  const opts: CliOpts = { skipExisting: true }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--filter") opts.filter = argv[++i]
    else if (a === "--only") opts.only = argv[++i]
    else if (a === "--limit") opts.limit = parseInt(argv[++i], 10)
    else if (a === "--per-folder") opts.perFolder = parseInt(argv[++i], 10)
    else if (a === "--no-skip") opts.skipExisting = false
    else if (a === "--help" || a === "-h") {
      console.log(`\nUsage: tsx scripts/test-extraction.ts [options]
  --filter <str>       Only process folders containing <str>
  --only <folder>      Only process one specific folder
  --limit <n>          Stop after n images total
  --per-folder <n>     Cap n images per folder (good for breadth sampling)
  --no-skip            Re-run even when cached JSON exists
  --help               Show this message\n`)
      process.exit(0)
    }
  }
  return opts
}

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"])
const ROOT = join(process.cwd(), "task-samples")
const RESULTS = join(ROOT, ".results")

type PerImageOutcome = {
  folder: string
  image: string
  path: string
  subject: string | null
  subjectConfidence: string
  taskCount: number
  totalSteps: number
  needsPaperCount: number
  types: string[]
  elapsedMs: number
  error: string | null
  titles: string[]
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!existsSync(ROOT)) {
    console.error(`task-samples/ not found at ${ROOT}`)
    process.exit(1)
  }
  await mkdir(RESULTS, { recursive: true })

  const folders = (await readdir(ROOT, { withFileTypes: true }))
    .filter(d => d.isDirectory() && d.name !== ".results")
    .map(d => d.name)
    .filter(n => (opts.only ? n === opts.only : true))
    .filter(n => (opts.filter ? n.toLowerCase().includes(opts.filter.toLowerCase()) : true))
    .sort()

  if (folders.length === 0) {
    console.error("No matching sample folders. Check --filter/--only.")
    process.exit(1)
  }

  const outcomes: PerImageOutcome[] = []
  let processed = 0
  const startedAll = Date.now()

  for (const folder of folders) {
    const folderPath = join(ROOT, folder)
    const outDir = join(RESULTS, folder)
    await mkdir(outDir, { recursive: true })

    const files = (await readdir(folderPath))
      .filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()))
      .sort()

    let folderProcessed = 0
    for (const file of files) {
      if (opts.limit && processed >= opts.limit) break
      if (opts.perFolder && folderProcessed >= opts.perFolder) break
      const imgPath = join(folderPath, file)
      const outPath = join(outDir, `${basename(file, extname(file))}.json`)

      if (opts.skipExisting && existsSync(outPath)) {
        // Re-use the cached result for the report without re-calling Azure.
        try {
          const cached = JSON.parse(await readFile(outPath, "utf8")) as {
            result?: VisionResult
            elapsedMs?: number
            error?: string | null
          }
          if (cached.result) {
            outcomes.push(summarise(folder, file, imgPath, cached.result, cached.elapsedMs ?? 0, null))
            console.log(`· cached  ${folder}/${file}`)
            processed++
            continue
          }
        } catch {
          // Fall through to re-run
        }
      }

      const buf = await readFile(imgPath)
      const mime = mimeFromExt(extname(file))
      const dataUrl = `data:${mime};base64,${buf.toString("base64")}`
      const started = Date.now()
      try {
        const result = await extractTasksFromImage(dataUrl)
        const elapsedMs = Date.now() - started
        await writeFile(outPath, JSON.stringify({ image: imgPath, elapsedMs, result }, null, 2))
        outcomes.push(summarise(folder, file, imgPath, result, elapsedMs, null))
        console.log(`✓ ${folder}/${file}  ${elapsedMs}ms  ${result.subject}/${result.tasks.length}gr`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const elapsedMs = Date.now() - started
        await writeFile(
          outPath,
          JSON.stringify({ image: imgPath, elapsedMs, error: msg }, null, 2)
        )
        outcomes.push({
          folder,
          image: file,
          path: imgPath,
          subject: null,
          subjectConfidence: "—",
          taskCount: 0,
          totalSteps: 0,
          needsPaperCount: 0,
          types: [],
          titles: [],
          elapsedMs,
          error: msg,
        })
        console.log(`✗ ${folder}/${file}  ERROR: ${msg}`)
      }
      processed++
      folderProcessed++
    }
    if (opts.limit && processed >= opts.limit) break
  }

  await writeReport(outcomes, Date.now() - startedAll)
  console.log(
    `\nDone: ${processed} images, ${outcomes.filter(o => o.error).length} errors. ` +
      `See ${join("task-samples", ".results", "REPORT.md")}.`
  )
}

function summarise(
  folder: string,
  file: string,
  path: string,
  result: VisionResult,
  elapsedMs: number,
  error: string | null
): PerImageOutcome {
  return {
    folder,
    image: file,
    path,
    subject: result.subject,
    subjectConfidence: result.subjectConfidence,
    taskCount: result.tasks.length,
    totalSteps: result.tasks.reduce((n, t) => n + (t.steps?.length ?? 0), 0),
    needsPaperCount: result.tasks.filter(t => t.needsPaper).length,
    types: [...new Set(result.tasks.map(t => t.type))],
    titles: result.tasks.map(t => t.title ?? t.text.slice(0, 40)),
    elapsedMs,
    error,
  }
}

function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase()
  return (
    { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".heic": "image/heic" }[e] ||
    "image/jpeg"
  )
}

async function writeReport(outcomes: PerImageOutcome[], totalMs: number) {
  const byFolder = new Map<string, PerImageOutcome[]>()
  for (const o of outcomes) {
    if (!byFolder.has(o.folder)) byFolder.set(o.folder, [])
    byFolder.get(o.folder)!.push(o)
  }
  const lines: string[] = []
  lines.push(`# Extraction test report`)
  lines.push("")
  lines.push(`Ran at ${new Date().toISOString()}. Total time ${(totalMs / 1000).toFixed(1)}s. ${outcomes.length} images.`)
  lines.push("")

  const errors = outcomes.filter(o => o.error)
  const zeros = outcomes.filter(o => !o.error && o.taskCount === 0)
  const noSubject = outcomes.filter(o => !o.error && !o.subject)

  lines.push(`## Health`)
  lines.push(`- Failed: ${errors.length}`)
  lines.push(`- 0 groups extracted: ${zeros.length}`)
  lines.push(`- null subject: ${noSubject.length}`)
  lines.push(`- needsPaper tasks: ${outcomes.reduce((n, o) => n + o.needsPaperCount, 0)}`)
  const avgMs = outcomes.length
    ? outcomes.reduce((n, o) => n + o.elapsedMs, 0) / outcomes.length
    : 0
  lines.push(`- Avg vision latency: ${avgMs.toFixed(0)}ms`)
  lines.push("")

  // Subject × folder matrix (what we expect vs what we get)
  lines.push(`## Per-folder summary`)
  lines.push("")
  lines.push(`| Folder | N | Subjects returned | Avg groups | Avg steps | needsPaper | Types seen |`)
  lines.push(`|---|---|---|---|---|---|---|`)
  for (const [folder, list] of byFolder) {
    const n = list.length
    const subjectSet = new Set(list.map(l => l.subject ?? "null"))
    const avgGroups = list.reduce((a, l) => a + l.taskCount, 0) / n
    const avgSteps = list.reduce((a, l) => a + l.totalSteps, 0) / n
    const paper = list.reduce((a, l) => a + l.needsPaperCount, 0)
    const types = new Set<string>()
    for (const l of list) l.types.forEach(t => types.add(t))
    lines.push(
      `| ${folder} | ${n} | ${[...subjectSet].join(", ")} | ${avgGroups.toFixed(1)} | ${avgSteps.toFixed(1)} | ${paper} | ${[...types].join(", ")} |`
    )
  }
  lines.push("")

  lines.push(`## Per-image detail`)
  lines.push("")
  for (const [folder, list] of byFolder) {
    lines.push(`### ${folder}`)
    lines.push("")
    for (const o of list) {
      if (o.error) {
        lines.push(`- **${o.image}** — ERROR: \`${o.error}\``)
        continue
      }
      lines.push(
        `- **${o.image}** — subject=\`${o.subject ?? "null"}\` (${o.subjectConfidence})` +
          ` · ${o.taskCount} groups / ${o.totalSteps} steps` +
          ` · needsPaper=${o.needsPaperCount}` +
          ` · types=[${o.types.join(",")}]` +
          ` · ${o.elapsedMs}ms`
      )
      for (const t of o.titles.slice(0, 5)) {
        lines.push(`  - ${t}`)
      }
    }
    lines.push("")
  }

  await writeFile(join(RESULTS, "REPORT.md"), lines.join("\n"))
  await writeFile(
    join(RESULTS, "summary.json"),
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        totalMs,
        imageCount: outcomes.length,
        errorCount: errors.length,
        outcomes,
      },
      null,
      2
    )
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
