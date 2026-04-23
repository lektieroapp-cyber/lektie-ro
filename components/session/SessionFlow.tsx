"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { SparkleIcon } from "@/components/icons/RewardIcons"
import { logDevEvent } from "./dev-log"
import { DevLog } from "./DevLog"
import { EmptyPhotoPanel } from "./EmptyPhotoPanel"
import { ImagePreviewPanel } from "./ImagePreviewPanel"
import { ScanPanel } from "./ScanPanel"
import { SessionCostPanel } from "./SessionCostPanel"
import { ThinkingPanel } from "./ThinkingPanel"
import { clearCostEvents, pushCostEvent } from "@/lib/dev-cost"
import { modelIdFromDeployment } from "@/lib/ai-pricing"
import { SubjectPicker } from "./SubjectPicker"
import { TaskPicker } from "./TaskPicker"
import { ModeSelector } from "./ModeSelector"
import { HintChat } from "./HintChat"
import { VoiceSubjectChoice } from "./VoiceSubjectChoice"
import { VoiceTaskChoice } from "./VoiceTaskChoice"
import type { ConversationMode, HintMode, SolveResponse, Task, Turn } from "./types"

const VOICE_ENABLED = process.env.NEXT_PUBLIC_VOICE_ENABLED === "true"
const CONVO_MODE_STORAGE_KEY = "lr_convo_mode"

type Stage =
  | "idle"
  | "uploading"
  | "thinking"
  | "emptyPhoto"
  | "subject"
  | "pick"
  | "mode"
  | "hint"
  | "done"
  | "sessionDone"

const MAX_BYTES = 10 * 1024 * 1024

const EXT_FROM_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
}

// Mock task banks per subject — used when subject is corrected in demo mode.
const MOCK_TASKS: Record<string, Task[]> = {
  matematik: [
    { id: "t1", text: "Regn ud: 24 + 17", type: "addition" },
    { id: "t2", text: "Regn ud: 36 − 19", type: "subtraction" },
    { id: "t3", text: "Hvor mange æbler er der i alt, hvis Lærke har 5 og Jonas har 8?", type: "word-problem" },
  ],
  dansk: [
    { id: "t1", text: "Hvad handler teksten om? Skriv med dine egne ord.", type: "reading" },
    { id: "t2", text: "Find tre tillægsord i teksten.", type: "grammar" },
    { id: "t3", text: "Sæt komma i sætningen: 'Da vi kom hjem var hunden glad'.", type: "grammar" },
  ],
  engelsk: [
    { id: "t1", text: "Translate: 'Hunden løber i parken'.", type: "translation" },
    { id: "t2", text: "Write a sentence using the word 'yesterday'.", type: "composition" },
    { id: "t3", text: "Fill in: 'She ___ (go) to school every day.'", type: "grammar" },
  ],
}

const DEV_SOLVE: SolveResponse = {
  sessionId: "dev-session-0000",
  subject: "matematik",
  grade: 4,
  tasks: MOCK_TASKS.matematik,
  mocked: true,
}
const DEV_TASK: Task = DEV_SOLVE.tasks[0]

export function SessionFlow({
  isAdmin = false,
  activeChildId,
  childName,
  childEmoji: _childEmoji,
  childGrade,
}: {
  isAdmin?: boolean
  activeChildId?: string | null
  childName?: string | null
  childEmoji?: string | null
  /** Grade from the child's profile. Null if no child or grade unset. */
  childGrade?: number | null
}) {
  // Companion defaults to lion everywhere consumers read it — no forced picker.
  // Kids can still reach the picker via the dev panel (🐾 Makker) or a future
  // settings button.
  // Dev tools (scene jumper + dev log) render only on localhost, never in prod
  // or preview — even for admins. Keeps the staging/prod surface clean.
  const [isLocalhost, setIsLocalhost] = useState(false)
  useEffect(() => {
    const h = window.location.hostname
    setIsLocalhost(h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0")
  }, [])
  const showDevTools = isAdmin && isLocalhost

  const [stage, setStage] = useState<Stage>("idle")
  // Below grade 5 the kid can't reliably type (still building writing fluency),
  // so voice is the right default AND there's no "ægte" choice for them to
  // make — we lock the toggle out and let the parent-implied default stand.
  // Grade 5+ can read/write, so they get to flip it and we remember their
  // preference per browser.
  const canKidToggleConversation =
    VOICE_ENABLED && childGrade != null && childGrade >= 5
  // Default: voice for 0.-4. klasse (Louise + Marcuz: fjerner skrivebarrieren
  // for de mindste og ordblinde). Older kids default to text.
  // Admins always start in voice mode regardless of grade — they're testing
  // the voice flow and shouldn't have to flip the toggle every session.
  const [conversationMode, setConversationMode] = useState<ConversationMode>(() => {
    if (!VOICE_ENABLED) return "text"
    if (isAdmin) return "voice"
    return childGrade != null && childGrade <= 4 ? "voice" : "text"
  })
  useEffect(() => {
    // Stored kid-preference only applies when the kid is old enough to set
    // it. Below grade 5 the grade-based default wins.
    // Admins skip the restore — they always start in voice on each load,
    // even if they manually toggled to text earlier in another session.
    if (!canKidToggleConversation) return
    if (isAdmin) return
    try {
      const stored = window.localStorage.getItem(CONVO_MODE_STORAGE_KEY)
      if (stored === "voice" || stored === "text") setConversationMode(stored)
    } catch {}
  }, [canKidToggleConversation, isAdmin])
  function changeConversationMode(next: ConversationMode) {
    setConversationMode(next)
    try {
      window.localStorage.setItem(CONVO_MODE_STORAGE_KEY, next)
    } catch {}
    logDevEvent("info", `Snak-tilstand: ${next}`)
  }
  const [solve, setSolve] = useState<SolveResponse | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [mode, setMode] = useState<HintMode | null>(null)
  const [dbSessionId, setDbSessionId] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // Remember subject across tasks in the same homework session
  const [sessionSubject, setSessionSubject] = useState<string | null>(null)
  const [completedTasks, setCompletedTasks] = useState(0)
  // Task IDs already finished on the CURRENT photo. Cleared when the kid
  // takes a new photo. Used to hide done items in TaskPicker so the kid
  // doesn't re-pick what they just solved.
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([])

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
    const flowStart = performance.now()
    logDevEvent("upload", `Starter: ${file.name}`, {
      size: file.size,
      type: file.type,
    })

    try {
      const uploadStart = performance.now()
      const path = await uploadFile(file)
      const uploadMs = Math.round(performance.now() - uploadStart)
      setImagePath(path)
      setStage("thinking")
      logDevEvent("upload", "Billede sendt til Supabase", { path, ms: uploadMs })
      logDevEvent("stage", "uploading → thinking")

      const solveStart = performance.now()
      logDevEvent("info", "→ /api/solve (Azure vision)")
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: path, imageName: file.name }),
      })
      const solveMs = Math.round(performance.now() - solveStart)
      if (!res.ok) throw new Error("solve failed")
      const data = (await res.json()) as SolveResponse
      if (data.usage) {
        pushCostEvent({
          kind: "vision",
          promptTokens: data.usage.promptTokens,
          completionTokens: data.usage.completionTokens,
          model: modelIdFromDeployment(data.usage.model),
          ms: solveMs,
        })
      }
      const resolvedSubject = data.subject || sessionSubject
      if (resolvedSubject) setSessionSubject(resolvedSubject)
      const solveWithSubject = resolvedSubject ? { ...data, subject: resolvedSubject } : data
      setSolve(solveWithSubject)
      logDevEvent("solve", `${data.tasks.length} opgaver fundet`, {
        subject: solveWithSubject.subject,
        confidence: solveWithSubject.subjectConfidence ?? "—",
        grade: solveWithSubject.grade,
        reason: solveWithSubject.reason ?? "—",
        mocked: !!solveWithSubject.mocked,
        ms: solveMs,
        totalMs: Math.round(performance.now() - flowStart),
      })

      // Smart routing:
      //  1. No tasks → tell the kid, let them try another photo
      //  2. Tasks exist but subject guess is low-confidence OR null → confirm first
      //  3. Tasks exist + confident subject → straight to task picker
      if (solveWithSubject.tasks.length === 0) {
        setStage("emptyPhoto")
      } else if (!solveWithSubject.subject || solveWithSubject.subjectConfidence === "low") {
        setStage("subject")
      } else {
        setStage("pick")
      }
    } catch (err) {
      logDevEvent("ai-error", `Solve fejlede: ${(err as Error).message}`)
      setError("Noget gik galt. Prøv at tage billedet igen.")
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setImagePath(null)
      if (fileRef.current) fileRef.current.value = ""
      setStage("idle")
    }
  }

  // Admin-only test shortcut: skip the upload step and run /api/solve on an
  // image that's already in the bucket. Triggered by `?testImage=<path>` on
  // the dashboard URL (only honoured for admins — parents hit the normal
  // upload flow). Lets us iterate on AI behaviour without re-taking photos.
  async function startWithExistingImage(path: string) {
    setError(null)
    setImagePath(path)
    setPreviewUrl(null)
    setStage("thinking")
    logDevEvent("upload", "Test-billede: bruger eksisterende path", { path })
    // Fire a signed-URL fetch in parallel with /api/solve so the dev preview
    // panel has something to render as soon as we land in task-pick. No-op
    // for non-admins (endpoint will 403 and we just swallow it).
    void fetch(`/api/admin/image-url?path=${encodeURIComponent(path)}`)
      .then(async r => {
        if (!r.ok) return
        const j = (await r.json()) as { url?: string }
        if (j.url) setPreviewUrl(j.url)
      })
      .catch(() => {})
    const start = performance.now()
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: path }),
      })
      if (!res.ok) throw new Error("solve failed")
      const data = (await res.json()) as SolveResponse
      if (data.usage) {
        pushCostEvent({
          kind: "vision",
          promptTokens: data.usage.promptTokens,
          completionTokens: data.usage.completionTokens,
          model: modelIdFromDeployment(data.usage.model),
          ms: Math.round(performance.now() - start),
        })
      }
      const resolvedSubject = data.subject || sessionSubject
      if (resolvedSubject) setSessionSubject(resolvedSubject)
      const solveWithSubject = resolvedSubject ? { ...data, subject: resolvedSubject } : data
      setSolve(solveWithSubject)
      logDevEvent("solve", `${data.tasks.length} opgaver fundet (test-billede)`, {
        subject: solveWithSubject.subject,
        confidence: solveWithSubject.subjectConfidence ?? "—",
        mocked: !!solveWithSubject.mocked,
        ms: Math.round(performance.now() - start),
      })
      if (solveWithSubject.tasks.length === 0) {
        setStage("emptyPhoto")
      } else if (!solveWithSubject.subject || solveWithSubject.subjectConfidence === "low") {
        setStage("subject")
      } else {
        setStage("pick")
      }
    } catch (err) {
      logDevEvent("ai-error", `Solve fejlede (test): ${(err as Error).message}`)
      setError("Kunne ikke læse det genbrugte billede. Det kan være udløbet.")
      setImagePath(null)
      setStage("idle")
    }
  }

  const searchParams = useSearchParams()
  const testImagePath = searchParams?.get("testImage") ?? null
  useEffect(() => {
    if (!testImagePath) return
    if (!isAdmin) return
    if (stage !== "idle") return
    void startWithExistingImage(testImagePath)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testImagePath, isAdmin])

  function pickSubject(subject: string) {
    if (!solve) return
    setSessionSubject(subject)
    const tasks = solve.mocked && MOCK_TASKS[subject]
      ? MOCK_TASKS[subject]
      : solve.tasks
    setSolve({ ...solve, subject, tasks })
    setStage("pick")
    logDevEvent("subject", `Valgt: ${subject}`)
  }

  // Kid goes straight from task → hint. The ModeSelector "hvor vil du starte?"
  // screen was removed (2026-04-23): with the new goal+steps extraction, Dani's
  // first turn already orients around the task and asks the kid to engage, so
  // the three-way picker was extra clicks without extra value. Dev panel can
  // still jump to the "mode" stage if we need the legacy picker for testing.
  async function pickTask(t: Task) {
    setTask(t)
    setTurns([])
    setMode("hint")
    setStage("hint")
    logDevEvent("task", t.text.slice(0, 60), { type: t.type })

    // Create a session row if we have a real child (not dev/parent mode).
    if (activeChildId && activeChildId !== "parent" && solve) {
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId: activeChildId,
            subject: solve.subject,
            // Grade comes from the child's profile, not the photo.
            grade: childGrade ?? null,
            mode: "hint",
            // Use `t` directly — setTask(t) is async, so this closure's `task`
            // state is still the previous value at this point.
            problemText: t.text,
            problemType: t.type,
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

  // Retained for the dev panel's mode-stage jump. Normal kid flow no longer
  // hits this path — pickTask transitions straight to "hint".
  async function pickMode(m: HintMode) {
    setMode(m)
    setStage("hint")
    logDevEvent("mode", m)

    if (activeChildId && activeChildId !== "parent" && solve) {
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId: activeChildId,
            subject: solve.subject,
            grade: childGrade ?? null,
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
    logDevEvent("complete", `Opgave klaret på ${completedTurns.length} ture`)
    setCompletedTasks(n => n + 1)
    if (task) {
      setCompletedTaskIds(prev => (prev.includes(task.id) ? prev : [...prev, task.id]))
    }
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

  // Go back to task picker (same photo) or scan (new photo)
  function nextTask() {
    setTask(null)
    setMode(null)
    setDbSessionId(null)
    setTurns([])
    // Go back to task picker if we still have the solve data
    if (solve) {
      setStage("pick")
    } else {
      setStage("idle")
    }
  }

  // New photo — clears solve and goes to camera
  function newPhoto() {
    setStage("idle")
    setSolve(null)
    setTask(null)
    setMode(null)
    setDbSessionId(null)
    setTurns([])
    setImagePath(null)
    setError(null)
    // New photo → new task set → reset the per-photo completion list.
    setCompletedTaskIds([])
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  // AI-initiated retake — fired when Dani emits [needphoto]. Resets to idle
  // and auto-pops the file picker so the kid doesn't have to hunt for the
  // camera button. setTimeout gives React a tick to render the idle state
  // before we kick off the native file dialog.
  function requestNewPhoto() {
    newPhoto()
    window.setTimeout(() => fileRef.current?.click(), 50)
    logDevEvent("info", "AI bad om nyt billede ([needphoto])")
  }

  // Full reset — also forgets subject (new homework session)
  function reset() {
    newPhoto()
    setSessionSubject(null)
    setCompletedTasks(0)
    clearCostEvents()
  }

  function finishSession() {
    setStage("sessionDone")
  }

  // Big confetti blast when the whole session is done
  useEffect(() => {
    if (stage !== "sessionDone") return
    import("@/lib/confetti").then(m => {
      m.fireConfetti()
      // Extra burst for the big finish
      setTimeout(() => m.fireConfetti(), 600)
    })
  }, [stage])

  function devJump(target: Stage, opts?: { mode?: HintMode }) {
    setError(null)
    setPreviewUrl(null)
    setImagePath(null)
    const needsSolve = ["subject", "pick", "mode", "hint", "done"].includes(target)
    const needsTask  = ["mode", "hint", "done"].includes(target)
    const needsMode  = ["hint", "done"].includes(target)
    // Use remembered subject, fall back to DEV_SOLVE default
    const sub = sessionSubject ?? DEV_SOLVE.subject ?? "matematik"
    const tasks = MOCK_TASKS[sub] ?? DEV_SOLVE.tasks
    const devSolve = { ...DEV_SOLVE, subject: sub, tasks }
    if (target === "emptyPhoto") {
      // Dev-only: fake an empty solve so the panel renders.
      setSolve({
        sessionId: "dev-empty",
        subject: null,
        grade: 0,
        tasks: [],
        reason: "no_tasks",
        detectionNotes: "Dev jump — ingen rigtig analyse.",
        mocked: true,
      })
    } else if (needsSolve) {
      setSolve(devSolve)
    } else {
      setSolve(null)
    }
    if (needsTask)  setTask(tasks[0]);  else setTask(null)
    setMode(needsMode ? (opts?.mode ?? "hint") : null)
    setDbSessionId(null)
    setTurns([])
    setStage(target)
  }

  const needsFill = stage === "hint" || stage === "done"

  return (
    <div className={`relative flex flex-col ${needsFill ? "min-h-0 flex-1" : "flex-1 items-center justify-center"}`}>
      {stage === "idle" && (
        <ScanPanel
          onSelect={() => fileRef.current?.click()}
          onFile={onFile}
          error={error}
          childName={childName ?? undefined}
          completedCount={completedTasks}
          onFinish={completedTasks > 0 ? finishSession : undefined}
          conversationMode={conversationMode}
          onConversationModeChange={canKidToggleConversation ? changeConversationMode : undefined}
        />
      )}
      {stage === "sessionDone" && (
        <div
          className="rounded-card bg-white p-6 text-center md:p-10"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <SparkleIcon size={32} color="#7ACBA2" />
          </span>
          <h2
            className="mt-3 text-2xl font-bold text-ink md:text-3xl"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            {completedTasks} opgave{completedTasks > 1 ? "r" : ""} klaret i dag!
          </h2>
          <p className="mt-2 text-sm text-muted">Godt arbejde. Vi ses næste gang!</p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 rounded-btn border border-ink/15 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas"
          >
            Start en ny session
          </button>
        </div>
      )}
      {(stage === "uploading" || stage === "thinking") && (
        <ThinkingPanel
          previewUrl={previewUrl}
          uploading={stage === "uploading"}
        />
      )}
      {stage === "emptyPhoto" && solve && (
        <EmptyPhotoPanel
          reason={solve.reason ?? "no_tasks"}
          detectionNotes={solve.detectionNotes}
          onRetry={newPhoto}
        />
      )}
      {stage === "subject" && solve && (
        <>
          {conversationMode === "voice" && (
            <div style={{ maxWidth: 440, margin: "0 auto 14px", display: "flex", justifyContent: "center" }}>
              <VoiceSubjectChoice guess={solve.subject} onPick={pickSubject} />
            </div>
          )}
          <SubjectPicker
            onPick={pickSubject}
            guess={solve.subject}
            guessConfidence={solve.subjectConfidence}
            detectionNotes={solve.detectionNotes}
          />
        </>
      )}
      {stage === "pick" && solve && (() => {
        // Voice-pick should only offer tasks the kid hasn't finished yet.
        // When every task is done, skip the voice prompt entirely — TaskPicker
        // renders the "all done" state + "Tag et nyt billede" CTA.
        const remainingTasks = solve.tasks.filter(
          t => !completedTaskIds.includes(t.id)
        )
        return (
          <>
            {conversationMode === "voice" && remainingTasks.length > 0 && (
              <div style={{ maxWidth: 440, margin: "0 auto 14px", display: "flex", justifyContent: "center" }}>
                <VoiceTaskChoice
                  key={remainingTasks.map(t => t.id).join(",")}
                  tasks={remainingTasks}
                  onPick={pickTask}
                />
              </div>
            )}
            <TaskPicker
              solve={solve}
              onPick={pickTask}
              onNewPhoto={newPhoto}
              completedTaskIds={completedTaskIds}
            />
          </>
        )
      })()}
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
          onMoreHomework={nextTask}
          onFinishSession={finishSession}
          onRequestNewPhoto={requestNewPhoto}
          completed={stage === "done"}
          conversationMode={conversationMode}
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

      {/* Cost panel is admin-only but visible everywhere (prod too) — admins
          want to see live spend during real testing, not just on localhost. */}
      {isAdmin && <SessionCostPanel />}

      {showDevTools && (
        <>
          <DevLog
            stage={stage}
            solve={solve}
            task={task}
            mode={mode}
            turns={turns}
            completedTasks={completedTasks}
          />
          {/* Floating preview of the homework photo. Shown during task
              picker, mode, hint and done stages so we can glance at the
              original while chatting with the AI. Minimizes to a small
              corner thumb; click to maximize to a full-screen lightbox. */}
          {previewUrl &&
            (stage === "subject" ||
              stage === "pick" ||
              stage === "mode" ||
              stage === "hint" ||
              stage === "done") && (
              <ImagePreviewPanel url={previewUrl} />
            )}
        </>
      )}
    </div>
  )
}

// ─── Dev panel ───────────────────────────────────────────────────────────────

const STAGES: { label: string; stage: Stage; opts?: { mode?: HintMode } }[] = [
  { label: "📷 Scan",       stage: "idle" },
  { label: "⏳ Uploading",  stage: "uploading" },
  { label: "🔍 Thinking",   stage: "thinking" },
  { label: "❓ Empty photo", stage: "emptyPhoto" },
  { label: "📚 Subject",    stage: "subject" },
  { label: "📋 Pick task",  stage: "pick" },
  { label: "🎯 Mode pick",  stage: "mode" },
  { label: "📖 Explain",    stage: "hint", opts: { mode: "explain" } },
  { label: "💡 Hint",       stage: "hint", opts: { mode: "hint" } },
  { label: "✅ Done",       stage: "done", opts: { mode: "hint" } },
  { label: "🏁 Session done", stage: "sessionDone" },
]

type AiModeChecks = {
  endpoint: boolean
  key: boolean
  deployment: boolean
  aiModeEnv: string | null
  endpointHost: string | null
}

function DevPanel({ currentStage, onJump }: {
  currentStage: Stage
  onJump: (stage: Stage, opts?: { mode?: HintMode }) => void
}) {
  const [open, setOpen] = useState(false)
  const [aiMode, setAiMode] = useState<"live" | "test" | null>(null)
  const [liveAvailable, setLiveAvailable] = useState(false)
  const [checks, setChecks] = useState<AiModeChecks | null>(null)
  const [flipping, setFlipping] = useState(false)

  useEffect(() => {
    if (!open || aiMode) return
    fetch("/api/ai-mode")
      .then(r => r.json())
      .then(d => {
        setAiMode(d.mode ?? null)
        setLiveAvailable(Boolean(d.liveAvailable))
        setChecks(d.checks ?? null)
      })
      .catch(() => {})
  }, [open, aiMode])

  async function flipAiMode(next: "live" | "test") {
    if (flipping) return
    setFlipping(true)
    try {
      const res = await fetch("/api/ai-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      })
      if (res.ok) {
        const j = await res.json()
        setAiMode(j.mode)
      }
    } finally {
      setFlipping(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="rounded-card border border-ink/20 bg-white p-3 shadow-xl" style={{ minWidth: 230 }}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink/60">
            AI mode
          </p>
          {checks && !liveAvailable && (
            <div className="mb-2 rounded-md bg-coral-deep/10 p-2 text-[10px] text-coral-deep">
              <p className="mb-1 font-bold">Live kan ikke nås — Vercel env mangler:</p>
              <ul className="list-disc pl-4 leading-relaxed">
                {!checks.endpoint && <li>AZURE_OPENAI_ENDPOINT</li>}
                {!checks.key && <li>AZURE_OPENAI_KEY</li>}
                {!checks.deployment && <li>AZURE_OPENAI_DEPLOYMENT</li>}
              </ul>
              <p className="mt-1 text-[9.5px] opacity-80">
                Tilføj dem i Vercel → Settings → Env Variables, og kør en ny deploy.
              </p>
            </div>
          )}
          {checks && liveAvailable && (
            <div className="mb-2 rounded-md bg-success/10 p-2 text-[10px] text-success">
              <p className="font-bold">
                Azure nået: {checks.endpointHost ?? "—"}
              </p>
              <p className="mt-0.5 text-[9.5px] text-ink/60">
                AI_MODE env: <code>{checks.aiModeEnv ?? "(unset)"}</code>
              </p>
            </div>
          )}
          <div className="mb-3 flex gap-1 rounded-lg bg-canvas p-1">
            {(["test", "live"] as const).map(m => {
              const active = aiMode === m
              const disabled = m === "live" && !liveAvailable
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => !disabled && !active && flipAiMode(m)}
                  disabled={flipping || disabled}
                  className={`flex-1 rounded-md px-2 py-1 text-[12px] font-semibold transition ${
                    active
                      ? "bg-white text-ink shadow-sm"
                      : disabled
                        ? "text-ink/30 cursor-not-allowed"
                        : "text-ink/60 hover:text-ink cursor-pointer"
                  }`}
                  title={disabled ? "Azure ikke konfigureret" : undefined}
                >
                  {m === "live" ? "🔴 Live" : "🧪 Test"}
                </button>
              )
            })}
          </div>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink/60">
            Jump to stage
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
                    active ? "bg-ink/10 text-ink" : "text-ink/70 hover:bg-canvas"
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
        className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-canvas shadow-lg transition hover:bg-ink/80 focus:outline-none"
        title="Dev flow panel"
      >
        <span className="text-sm">{open ? "✕" : "⚙"}</span>
      </button>
    </div>
  )
}
