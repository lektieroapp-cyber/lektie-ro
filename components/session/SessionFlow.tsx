"use client"

import { useRef, useState } from "react"
import { ScanPanel } from "./ScanPanel"
import { ThinkingPanel } from "./ThinkingPanel"
import { TaskPicker } from "./TaskPicker"
import { ModeSelector } from "./ModeSelector"
import { HintChat } from "./HintChat"
import type { HintMode, SolveResponse, Task, Turn } from "./types"

type Stage = "idle" | "uploading" | "thinking" | "pick" | "mode" | "hint" | "done"

const MAX_BYTES = 10 * 1024 * 1024

const EXT_FROM_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
}

const DEV_SOLVE: SolveResponse = {
  sessionId: "dev-session-0000",
  subject: "matematik",
  grade: 4,
  tasks: [
    { id: "t1", text: "Regn ud: 7 × 8", type: "multiplication" },
    { id: "t2", text: "Hvad er halvdelen af 56?", type: "division" },
  ],
  mocked: true,
}
const DEV_TASK: Task = DEV_SOLVE.tasks[0]

export function SessionFlow({
  isAdmin = false,
  activeChildId,
}: {
  isAdmin?: boolean
  activeChildId?: string | null
}) {
  const [stage, setStage] = useState<Stage>("idle")
  const [solve, setSolve] = useState<SolveResponse | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [mode, setMode] = useState<HintMode | null>(null)
  const [dbSessionId, setDbSessionId] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File): Promise<string> {
    const ext = EXT_FROM_TYPE[file.type] || file.name.split(".").pop()?.toLowerCase() || "jpg"
    const urlRes = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type, size: file.size, ext }),
    })
    if (!urlRes.ok) {
      const j = await urlRes.json().catch(() => ({}))
      throw new Error(`upload-url ${urlRes.status} ${j.error ?? ""}`)
    }
    const { uploadUrl, path } = (await urlRes.json()) as { uploadUrl: string; path: string }
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    })
    if (!putRes.ok) throw new Error(`storage PUT ${putRes.status}`)
    return path
  }

  async function onFile(file: File) {
    setError(null)
    if (file.size > MAX_BYTES) { setError("Billedet er for stort. Maks 10 MB."); return }
    if (!EXT_FROM_TYPE[file.type] && !file.type.startsWith("image/")) {
      setError("Filen ser ikke ud til at være et billede."); return
    }

    setPreviewUrl(URL.createObjectURL(file))
    setStage("uploading")

    try {
      const path = await uploadFile(file)
      setImagePath(path)
      setStage("thinking")

      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: path, imageName: file.name }),
      })
      if (!res.ok) throw new Error("solve failed")
      const data = (await res.json()) as SolveResponse
      setSolve(data)
      setStage("pick")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ukendt fejl"
      setError(`Kunne ikke uploade billedet (${msg}). Prøv igen.`)
      setStage("idle")
    }
  }

  function pickTask(t: Task) {
    setTask(t)
    setTurns([])
    setStage("mode")
  }

  async function pickMode(m: HintMode) {
    setMode(m)
    setStage("hint")

    // Create a session row if we have a real child (not dev/parent mode).
    if (activeChildId && activeChildId !== "parent" && solve) {
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId: activeChildId,
            subject: solve.subject,
            grade: solve.grade,
            mode: m,
            problemText: task?.text,
            problemType: task?.type,
            imagePath: imagePath ?? undefined,
          }),
        })
        if (res.ok) {
          const json = await res.json() as { sessionId: string }
          setDbSessionId(json.sessionId)
        }
      } catch {
        // Non-fatal: session won't be recorded but flow continues.
      }
    }
  }

  async function completeSession(completedTurns: Turn[]) {
    setStage("done")
    if (!dbSessionId) return
    try {
      await fetch("/api/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: dbSessionId,
          turnCount: completedTurns.length,
          completed: true,
          turns: completedTurns,
        }),
      })
    } catch {
      // Non-fatal.
    }
  }

  function reset() {
    setStage("idle")
    setSolve(null)
    setTask(null)
    setMode(null)
    setDbSessionId(null)
    setTurns([])
    setImagePath(null)
    setError(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  function devJump(target: Stage, opts?: { mode?: HintMode }) {
    setError(null)
    setPreviewUrl(null)
    setImagePath(null)
    const needsSolve = ["pick", "mode", "hint", "done"].includes(target)
    const needsTask  = ["mode", "hint", "done"].includes(target)
    const needsMode  = ["hint", "done"].includes(target)
    if (needsSolve) setSolve(DEV_SOLVE); else setSolve(null)
    if (needsTask)  setTask(DEV_TASK);   else setTask(null)
    setMode(needsMode ? (opts?.mode ?? "hint") : null)
    setDbSessionId(null)
    setTurns([])
    setStage(target)
  }

  return (
    <div className="relative">
      {stage === "idle" && (
        <ScanPanel onSelect={() => fileRef.current?.click()} onFile={onFile} error={error} />
      )}
      {(stage === "uploading" || stage === "thinking") && (
        <ThinkingPanel
          previewUrl={previewUrl}
          label={stage === "uploading" ? "Uploader billede …" : "Jeg kigger på opgaven …"}
          sub={stage === "uploading"
            ? "Vi sender dit billede sikkert til vores server i Sverige."
            : "Et øjeblik mens jeg finder ud af, hvad du arbejder med."}
        />
      )}
      {stage === "pick" && solve && (
        <TaskPicker solve={solve} onPick={pickTask} onCancel={reset} imagePath={imagePath} />
      )}
      {stage === "mode" && task && solve && (
        <ModeSelector task={task} solve={solve} onSelect={pickMode} onBack={() => setStage("pick")} />
      )}
      {(stage === "hint" || stage === "done") && task && solve && mode && (
        <HintChat
          task={task}
          solve={solve}
          mode={mode}
          turns={turns}
          setTurns={setTurns}
          childId={activeChildId ?? undefined}
          onComplete={completeSession}
          onReset={reset}
          onSwitchToHint={() => { setMode("hint"); setTurns([]) }}
          completed={stage === "done"}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />

      {isAdmin && <DevPanel currentStage={stage} onJump={devJump} />}
    </div>
  )
}

// ─── Dev panel ───────────────────────────────────────────────────────────────

const STAGES: { label: string; stage: Stage; opts?: { mode?: HintMode } }[] = [
  { label: "📷 Scan",       stage: "idle" },
  { label: "⏳ Uploading",  stage: "uploading" },
  { label: "🔍 Thinking",   stage: "thinking" },
  { label: "📋 Pick task",  stage: "pick" },
  { label: "🎯 Mode pick",  stage: "mode" },
  { label: "📖 Explain",    stage: "hint", opts: { mode: "explain" } },
  { label: "💡 Hint",       stage: "hint", opts: { mode: "hint" } },
  { label: "✅ Done",       stage: "done", opts: { mode: "hint" } },
]

function DevPanel({ currentStage, onJump }: {
  currentStage: Stage
  onJump: (stage: Stage, opts?: { mode?: HintMode }) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="rounded-card border border-coral-deep/25 bg-white p-3 shadow-xl" style={{ minWidth: 190 }}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-coral-deep/70">
            Dev — jump to stage
          </p>
          <div className="flex flex-col gap-1">
            {STAGES.map(({ label, stage, opts }) => {
              const active = currentStage === stage
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onJump(stage, opts)}
                  className={`rounded-lg px-3 py-1.5 text-left text-[13px] font-medium transition ${
                    active ? "bg-coral-deep/10 text-coral-deep" : "text-ink hover:bg-canvas"
                  }`}
                >
                  {label}
                  {active && <span className="ml-1 text-[11px] opacity-60">← current</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-coral-deep text-white shadow-lg transition hover:bg-coral-deep/80 focus:outline-none"
        title="Dev flow panel"
      >
        <span className="text-sm">{open ? "✕" : "⚙"}</span>
      </button>
    </div>
  )
}
