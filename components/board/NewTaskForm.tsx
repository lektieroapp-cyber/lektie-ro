"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ScanPanel } from "@/components/session/ScanPanel"
import { ThinkingPanel } from "@/components/session/ThinkingPanel"
import type { ConversationMode } from "@/components/session/types"
import type { TaskSubject } from "@/lib/tasks"
import type { VisionTask } from "@/lib/vision"

const VOICE_ENABLED = process.env.NEXT_PUBLIC_VOICE_ENABLED === "true"
const CONVO_MODE_STORAGE_KEY = "lr_convo_mode"
const MAX_BYTES = 10 * 1024 * 1024
const EXT_FROM_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
}

const SUBJECT_OPTIONS: TaskSubject[] = ["matematik", "dansk", "engelsk", "tysk"]

type Child = { id: string; name: string }

type Stage = "idle" | "uploading" | "thinking" | "saving" | "review"

type Draft = {
  subject: string | null
  tasks: VisionTask[]
  imagePath: string | null
}

type ApprovalState = Record<string, "pending" | "approving" | "approved" | "dismissed">

type Messages = {
  title: string
  subtitle: string
  subtitleCurate: string
  uploadCta: string
  selectChildLabel: string
  selectChildPlaceholder: string
  noChildren: string
  addChildCta: string
  thinkingTitle: string
  thinkingBody: string
  savingTitle: string
  savingBody: string
  reviewTitle: string
  reviewSubtitle: string
  reviewSubject: string
  approve: string
  approving: string
  approved: string
  dismiss: string
  approveAll: string
  anotherPhoto: string
  doneToBoard: string
  errorVision: string
  errorUpload: string
  errorSubject: string
  errorChild: string
  subjects: Record<string, string>
}

/**
 * Two modes:
 *
 *   start  — kid (or parent) wants to do homework now. Upload → extract →
 *            auto-create all tasks (auto-approved) → jump straight into the
 *            first task's tutoring page. If they bail mid-session, the task
 *            row stays in_progress and lands on the board.
 *
 *   curate — parent wants to add tasks to the board for later. Upload →
 *            extract → review queue → manual approve/dismiss. Tasks go on
 *            the board; no tutoring is started.
 */
export type NewTaskMode = "start" | "curate"

export function NewTaskForm({
  mode,
  children,
  lockedChildId,
  childName,
  onboardingHref,
  boardHref,
  taskHrefBase,
  messages,
}: {
  mode: NewTaskMode
  children: Child[]
  /** Kid mode: form is locked to this child, no picker shown. */
  lockedChildId?: string | null
  /** Used in the ScanPanel greeting ("Hej Dani!"). */
  childName?: string | null
  onboardingHref: string
  boardHref: string
  /** e.g. "/da/parent/tasks" — id appended at navigation time. */
  taskHrefBase: string
  messages: Messages
}) {
  const router = useRouter()
  const [childId, setChildId] = useState<string>(
    lockedChildId ?? children[0]?.id ?? "",
  )
  const showChildPicker = !lockedChildId && children.length > 1
  const [stage, setStage] = useState<Stage>("idle")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [subject, setSubject] = useState<TaskSubject>("matematik")
  const [error, setError] = useState<string | null>(null)
  const [approval, setApproval] = useState<ApprovalState>({})
  const fileRef = useRef<HTMLInputElement>(null)

  // Conversation mode toggle (visual only on this page — mode is read again on
  // the task page when the kid actually starts tutoring). Persisted to the
  // same localStorage key as ScanPanel uses elsewhere. Default = voice for
  // every kid, regardless of grade — the app is designed around the spoken
  // homework conversation; text is the opt-out, not the default.
  const [conversationMode, setConversationMode] = useState<ConversationMode>(
    VOICE_ENABLED ? "voice" : "text",
  )
  useEffect(() => {
    if (!VOICE_ENABLED) return
    try {
      const stored = window.localStorage.getItem(CONVO_MODE_STORAGE_KEY)
      if (stored === "voice" || stored === "text") setConversationMode(stored)
    } catch {}
  }, [])
  function changeConversationMode(next: ConversationMode) {
    setConversationMode(next)
    try {
      window.localStorage.setItem(CONVO_MODE_STORAGE_KEY, next)
    } catch {}
  }

  if (children.length === 0) {
    return (
      <div
        className="mx-auto max-w-md rounded-card bg-white p-8 text-center"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h1
          className="text-xl font-semibold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {messages.title}
        </h1>
        <p className="mt-3 text-sm text-ink/65">{messages.noChildren}</p>
        <Link
          href={onboardingHref}
          className="mt-5 inline-flex rounded-btn bg-primary px-5 py-2.5 text-sm font-semibold text-ink transition hover:opacity-90 cursor-pointer"
        >
          {messages.addChildCta}
        </Link>
      </div>
    )
  }

  async function uploadAndExtract(file: File) {
    setError(null)
    if (file.size > MAX_BYTES) {
      setError("Billedet er for stort. Maks 10 MB.")
      return
    }
    if (!childId) {
      setError(messages.errorChild)
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setStage("uploading")
    try {
      const ext = EXT_FROM_TYPE[file.type] || file.name.split(".").pop()?.toLowerCase() || "jpg"
      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size, ext }),
      })
      if (!urlRes.ok) throw new Error("upload-url failed")
      const { uploadUrl, path } = (await urlRes.json()) as {
        uploadUrl: string
        path: string
      }
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!putRes.ok) throw new Error("storage PUT failed")

      setStage("thinking")
      const draftRes = await fetch("/api/tasks/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: path, imageName: file.name }),
      })
      if (!draftRes.ok) throw new Error("draft failed")
      const data = (await draftRes.json()) as {
        subject: string | null
        tasks: VisionTask[]
      }
      const initialSubject = isSubject(data.subject) ? data.subject : "matematik"
      setSubject(initialSubject)
      setDraft({ subject: data.subject, tasks: data.tasks, imagePath: path })

      if (mode === "start") {
        // Quick path: auto-create all extracted tasks (approved) and jump
        // straight into the first one. The rest sit on the board so the kid
        // can move on after finishing the first.
        if (data.tasks.length === 0) {
          // Vision returned nothing actionable. Fall back to the curate-style
          // empty state so the kid sees a helpful message instead of a stuck
          // spinner.
          setApproval({})
          setStage("review")
          return
        }
        setStage("saving")
        try {
          const created: { id: string }[] = []
          for (const t of data.tasks) {
            // eslint-disable-next-line no-await-in-loop
            const res = await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                childId,
                subject: initialSubject,
                title: t.title ?? null,
                text: t.text,
                type: t.type,
                goal: t.goal ?? null,
                steps: t.steps ?? null,
                context: t.context ?? null,
                needsPaper: t.needsPaper ?? null,
                sourceImagePath: path,
                approve: true,
              }),
            })
            if (res.ok) {
              const j = (await res.json()) as { task: { id: string } }
              created.push({ id: j.task.id })
            }
          }
          if (created.length === 0) {
            throw new Error("no tasks saved")
          }
          // Straight into tutoring on the first task.
          router.push(`${taskHrefBase}/${created[0].id}`)
          return
        } catch (err) {
          console.error(err)
          setError(messages.errorVision)
          setStage("idle")
          return
        }
      }

      // Curate path: parent reviews, picks what lands.
      setApproval(
        Object.fromEntries(data.tasks.map(t => [t.id, "pending" as const])),
      )
      setStage("review")
    } catch (err) {
      console.error(err)
      setError(messages.errorVision)
      setStage("idle")
    }
  }

  async function approveOne(t: VisionTask) {
    if (!draft || !childId) return
    setApproval(a => ({ ...a, [t.id]: "approving" }))
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          subject,
          title: t.title ?? null,
          text: t.text,
          type: t.type,
          goal: t.goal ?? null,
          steps: t.steps ?? null,
          context: t.context ?? null,
          needsPaper: t.needsPaper ?? null,
          sourceImagePath: draft.imagePath,
          approve: true,
        }),
      })
      if (!res.ok) throw new Error("approve failed")
      setApproval(a => ({ ...a, [t.id]: "approved" }))
    } catch (err) {
      console.error(err)
      setApproval(a => ({ ...a, [t.id]: "pending" }))
      setError(messages.errorVision)
    }
  }

  function dismissOne(t: VisionTask) {
    setApproval(a => ({ ...a, [t.id]: "dismissed" }))
  }

  async function approveAll() {
    if (!draft) return
    for (const t of draft.tasks) {
      if (approval[t.id] === "pending") {
        // eslint-disable-next-line no-await-in-loop
        await approveOne(t)
      }
    }
  }

  function startOver() {
    setDraft(null)
    setApproval({})
    setError(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setStage("idle")
    if (fileRef.current) fileRef.current.value = ""
  }

  function goToBoard() {
    router.push(boardHref)
    router.refresh()
  }

  const allHandled =
    draft != null &&
    draft.tasks.every(t => approval[t.id] === "approved" || approval[t.id] === "dismissed")
  const anyApproved =
    draft != null && draft.tasks.some(t => approval[t.id] === "approved")

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Parent mode with multiple kids: small "Hvem er den til?" picker
          floats above the ScanPanel so the parent doesn't accidentally land
          a task on the wrong child. Hidden in kid mode (locked) and when
          there's only one kid (no choice to make). */}
      {showChildPicker && stage === "idle" && (
        <div
          className="mx-auto w-full max-w-md rounded-btn border border-ink/10 bg-white px-4 py-3"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <label className="flex items-center justify-between gap-3 text-sm font-medium text-ink/80">
            <span>{messages.selectChildLabel}</span>
            <select
              value={childId}
              onChange={e => setChildId(e.target.value)}
              className="rounded-btn border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink"
            >
              {children.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {stage === "idle" && (
        <ScanPanel
          onSelect={() => fileRef.current?.click()}
          onFile={uploadAndExtract}
          error={error}
          childName={childName ?? undefined}
          conversationMode={VOICE_ENABLED ? conversationMode : undefined}
          onConversationModeChange={
            VOICE_ENABLED ? changeConversationMode : undefined
          }
        />
      )}

      {(stage === "uploading" || stage === "thinking") && (
        <ThinkingPanel
          previewUrl={previewUrl}
          uploading={stage === "uploading"}
        />
      )}

      {stage === "saving" && (
        <div
          className="mx-auto w-full max-w-md rounded-card bg-white p-8 text-center"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-ink/15"
            style={{ borderTopColor: "var(--color-mint-deep, #4F8E6B)" }}
          />
          <p
            className="mt-4 text-base font-semibold text-ink"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            {messages.savingTitle}
          </p>
          <p className="mt-1 text-sm text-ink/60">{messages.savingBody}</p>
        </div>
      )}

      {stage === "review" && draft && (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <div
            className="rounded-card bg-white p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <h2
              className="text-lg font-semibold text-ink"
              style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
            >
              {messages.reviewTitle}
            </h2>
            <p className="mt-1 text-sm text-ink/65">
              {messages.reviewSubtitle.replace("{n}", String(draft.tasks.length))}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink/80">
                {messages.reviewSubject}
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value as TaskSubject)}
                  className="mt-1 w-full rounded-btn border border-ink/15 bg-white px-3 py-2 text-sm text-ink"
                >
                  {SUBJECT_OPTIONS.map(s => (
                    <option key={s} value={s}>{messages.subjects[s] ?? s}</option>
                  ))}
                </select>
              </label>
              {showChildPicker && (
                <label className="block text-sm font-medium text-ink/80">
                  {messages.selectChildLabel}
                  <select
                    value={childId}
                    onChange={e => setChildId(e.target.value)}
                    className="mt-1 w-full rounded-btn border border-ink/15 bg-white px-3 py-2 text-sm text-ink"
                  >
                    {children.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            {draft.tasks.map(t => {
              const state = approval[t.id] ?? "pending"
              const dimmed = state === "dismissed"
              const done = state === "approved"
              return (
                <li
                  key={t.id}
                  className={`rounded-card border bg-white p-4 transition ${
                    dimmed ? "border-ink/5 opacity-60" : "border-ink/5"
                  }`}
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div
                    className="text-base font-semibold text-ink"
                    style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
                  >
                    {t.title || shorten(t.text)}
                  </div>
                  {t.title && (
                    <div className="mt-1 text-sm text-ink/60">{t.text}</div>
                  )}
                  {t.goal && (
                    <div className="mt-2 text-xs italic text-ink/55">
                      Mål: {t.goal}
                    </div>
                  )}
                  {t.steps && t.steps.length > 0 && (
                    <ul className="mt-2 list-decimal pl-4 text-xs text-ink/65">
                      {t.steps.map(s => (
                        <li key={s.label}>
                          <span className="font-semibold">{s.label}.</span> {s.prompt}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    {state === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => dismissOne(t)}
                          className="rounded-btn border border-ink/15 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-canvas cursor-pointer"
                        >
                          {messages.dismiss}
                        </button>
                        <button
                          type="button"
                          onClick={() => approveOne(t)}
                          className="rounded-btn bg-primary px-4 py-1.5 text-xs font-semibold text-ink transition hover:opacity-90 cursor-pointer"
                        >
                          {messages.approve}
                        </button>
                      </>
                    )}
                    {state === "approving" && (
                      <span className="text-xs text-ink/55">{messages.approving}</span>
                    )}
                    {done && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-mint-deep">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {messages.approved}
                      </span>
                    )}
                    {state === "dismissed" && (
                      <span className="text-xs text-ink/45">Fjernet</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={startOver}
              className="rounded-btn border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink/80 transition hover:bg-canvas cursor-pointer"
            >
              {messages.anotherPhoto}
            </button>
            <div className="flex flex-wrap gap-2">
              {!allHandled && (
                <button
                  type="button"
                  onClick={approveAll}
                  className="rounded-btn bg-primary px-4 py-2 text-sm font-semibold text-ink transition hover:opacity-90 cursor-pointer"
                >
                  {messages.approveAll}
                </button>
              )}
              {(allHandled || anyApproved) && (
                <button
                  type="button"
                  onClick={goToBoard}
                  className="rounded-btn bg-ink px-4 py-2 text-sm font-semibold text-canvas transition hover:opacity-90 cursor-pointer"
                >
                  {messages.doneToBoard}
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-clay">{error}</p>}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) void uploadAndExtract(f)
        }}
      />
    </div>
  )
}

function isSubject(s: string | null | undefined): s is TaskSubject {
  return s === "matematik" || s === "dansk" || s === "engelsk" || s === "tysk"
}

function shorten(text: string): string {
  if (text.length <= 80) return text
  return text.slice(0, 80).trimEnd() + "…"
}
