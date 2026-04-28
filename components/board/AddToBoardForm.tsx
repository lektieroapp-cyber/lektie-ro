"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { K } from "@/components/session/design-tokens"
import {
  MathGlyph,
  BookGlyph,
  DictionaryGlyph,
} from "@/components/overview/SubjectSummaryCard"
import { isTaskSubject, type TaskSubject } from "@/lib/tasks"
import { STEP_CAP, type VisionTask } from "@/lib/vision"

const MAX_BYTES = 10 * 1024 * 1024
const EXT_FROM_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
}

const SUBJECT_OPTIONS: TaskSubject[] = ["dansk", "matematik", "engelsk", "tysk"]

const SUBJECT_TINT: Record<TaskSubject, { tint: string; bar: string; glyph: React.ReactNode }> = {
  dansk:     { tint: "#E1EEDD", bar: "#5C9D6E", glyph: <BookGlyph /> },
  matematik: { tint: "#FBEFD7", bar: "#D6B850", glyph: <MathGlyph /> },
  engelsk:   { tint: "#E8DEF1", bar: "#7A5A9C", glyph: <DictionaryGlyph /> },
  tysk:      { tint: "#F4DBD1", bar: "#A05844", glyph: <DictionaryGlyph /> },
}

type Child = { id: string; name: string }

type Photo = {
  id: string
  path: string | null
  name: string
  previewUrl: string
  size: number
  type: string
  status: "uploading" | "thinking" | "done" | "failed"
  detectedSubject: string | null
  errorMessage?: string
  /** Full response from /api/tasks/draft (success or failure). Stored
   *  client-side so the admin debug panel can show it without refetching. */
  draftResponse?: DraftDebugResponse
  /** Vision-suggested bundle name ("Subtraktion side 16"). Stored
   *  separately from `groupTitle` so an edit-then-clear leaves us with
   *  a sensible default to fall back to. Null when the model didn't
   *  suggest one. */
  suggestedGroupTitle?: string | null
  /** Parent's edited bundle name. Empty string = use the suggestion (or
   *  null if none). Sent to /api/tasks/batch on commit. */
  groupTitle?: string
}

type DraftDebugResponse = {
  status: number
  subject?: string | null
  subjectConfidence?: string
  groupTitle?: string | null
  reason?: string | null
  detectionNotes?: string | null
  tasks?: VisionTask[]
  usage?: {
    promptTokens: number
    completionTokens: number
    model: string
  } | null
  mocked?: boolean
  elapsedMs?: number
  error?: string
  message?: string
  imagePath?: string
}

type DraftTask = {
  /** Stable id assigned client-side; survives across re-renders. */
  localId: string
  photoId: string
  task: VisionTask
  subject: TaskSubject
  approved: boolean
  dismissed: boolean
}

export type AddToBoardMessages = {
  title: string
  subtitle: string
  subjectLabel: string
  selectChildLabel: string
  noChildren: string
  addChildCta: string
  addPhotoCta: string
  addAnotherPhotoCta: string
  photoUploading: string
  photoThinking: string
  photoFailed: string
  photoTaskCount: string
  photoTaskCountOne: string
  photoNoTasks: string
  reviewTitle: string
  reviewSubtitle: string
  reviewSubtitleOne: string
  approve: string
  approved: string
  dismiss: string
  undoDismiss: string
  approveAll: string
  commit: string
  commitOne: string
  committing: string
  cancel: string
  errorVision: string
  errorChild: string
  errorEmpty: string
  subjects: Record<string, string>
}

export function AddToBoardForm({
  children,
  initialSubject,
  isAdmin = false,
  isDev = false,
  boardHref,
  onboardingHref,
  messages,
}: {
  children: Child[]
  /** When set, pre-selects this subject in the picker (used by the empty-
   *  Tavle subject cards which deep-link via ?subject=…). */
  initialSubject?: TaskSubject | null
  /** Admin-only verification panels in the review queue: Forventet svar
   *  (per-step expected answers) and Tutor-kontekst (opaque vision notes).
   *  Safe to show in prod — these are sanity-check aids the admin uses
   *  before sending a kid into a task. */
  isAdmin?: boolean
  /** Localhost-only raw-JSON debug panel above the review queue. Shows
   *  the full vision response, timings, and a re-run button — useful
   *  during prompt iteration but too noisy for prod even on the admin
   *  account. */
  isDev?: boolean
  boardHref: string
  onboardingHref: string
  messages: AddToBoardMessages
}) {
  const router = useRouter()
  const [childId, setChildId] = useState<string>(children[0]?.id ?? "")
  // Default subject for incoming extracted tasks. Parent can still override
  // per task in the review queue, but picking up-front means the common case
  // (whole batch is one fag) needs no clicks per task.
  const [defaultSubject, setDefaultSubject] = useState<TaskSubject>(initialSubject ?? "dansk")
  const [photos, setPhotos] = useState<Photo[]>([])
  const [tasks, setTasks] = useState<DraftTask[]>([])
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  // Set when a photo's vision-detected subject disagrees with the
  // parent's currently-picked subject. Drives the styled mismatch modal
  // below — replaces the previous silent override where wrong tasks just
  // landed on the wrong subject card. Cleared when the parent decides
  // (switch / keep) or dismisses.
  const [pendingMismatch, setPendingMismatch] = useState<
    { photoId: string; detected: TaskSubject } | null
  >(null)

  // After a photo finishes processing, compare its detected subject to
  // the parent's pick. If they disagree (and the detection is one of our
  // known subjects), surface the mismatch modal once. Skipped if a modal
  // is already open for an earlier photo — second mismatch queues up
  // visually but doesn't stack two modals.
  function maybeFlagMismatch(photoId: string, detected: string | null) {
    if (pendingMismatch) return
    if (!detected) return
    const normalized = detected.toLowerCase()
    if (!isTaskSubject(normalized)) return
    if (normalized === defaultSubject) return
    setPendingMismatch({ photoId, detected: normalized })
  }

  function applyMismatchSwitch() {
    if (!pendingMismatch) return
    const next = pendingMismatch.detected
    setDefaultSubject(next)
    // Re-tag every task that came out of the photo we flagged. Older
    // tasks from other photos keep whatever subject they were tagged
    // with so we don't blow away earlier per-task choices.
    setTasks(prev =>
      prev.map(t => (t.photoId === pendingMismatch.photoId ? { ...t, subject: next } : t)),
    )
    setPendingMismatch(null)
  }

  const showChildPicker = children.length > 1

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

  async function handleFile(file: File) {
    setError(null)
    if (file.size > MAX_BYTES) {
      setError("Billedet er for stort. Maks 10 MB.")
      return
    }
    const photoId = crypto.randomUUID()
    const previewUrl = URL.createObjectURL(file)
    setPhotos(prev => [
      ...prev,
      {
        id: photoId,
        path: null,
        name: file.name,
        previewUrl,
        size: file.size,
        type: file.type,
        status: "uploading",
        detectedSubject: null,
      },
    ])
    try {
      const ext =
        EXT_FROM_TYPE[file.type] ||
        file.name.split(".").pop()?.toLowerCase() ||
        "jpg"
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

      setPhotos(prev =>
        prev.map(p => (p.id === photoId ? { ...p, path, status: "thinking" } : p)),
      )
      const draftRes = await fetch("/api/tasks/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: path, imageName: file.name }),
      })
      const data = (await draftRes.json()) as DraftDebugResponse & {
        subject: string | null
        tasks: VisionTask[]
      }
      const debug: DraftDebugResponse = { ...data, status: draftRes.status }
      if (!draftRes.ok) {
        setPhotos(prev =>
          prev.map(p =>
            p.id === photoId
              ? {
                  ...p,
                  status: "failed",
                  errorMessage: data.message ?? messages.errorVision,
                  draftResponse: debug,
                }
              : p,
          ),
        )
        return
      }

      setPhotos(prev =>
        prev.map(p =>
          p.id === photoId
            ? {
                ...p,
                status: "done",
                detectedSubject: data.subject,
                draftResponse: debug,
                suggestedGroupTitle: data.groupTitle ?? null,
                // Pre-fill the editable bundle title with the AI suggestion
                // so the input renders the value directly (parent can edit
                // or leave it). Don't overwrite if the parent has already
                // typed something on a previous render.
                groupTitle:
                  p.groupTitle !== undefined
                    ? p.groupTitle
                    : (data.groupTitle ?? ""),
              }
            : p,
        ),
      )
      // New tasks default to the parent's chosen subject. The vision-detected
      // subject is shown as a hint on the photo chip but doesn't override the
      // intentional pick. Per-task override is still available in the review.
      setTasks(prev => [
        ...prev,
        ...buildEntriesForPhoto(data, photoId),
      ])
      // Surface a confirm modal if vision says the photo belongs to a
      // different subject than the parent picked — better to ask once
      // than commit a Matematik worksheet under the Engelsk pile.
      maybeFlagMismatch(photoId, data.subject)
    } catch (err) {
      console.error(err)
      setPhotos(prev =>
        prev.map(p =>
          p.id === photoId
            ? { ...p, status: "failed", errorMessage: messages.errorVision }
            : p,
        ),
      )
    }
  }

  function removePhoto(photoId: string) {
    setPhotos(prev => prev.filter(p => p.id !== photoId))
    setTasks(prev => prev.filter(t => t.photoId !== photoId))
  }

  // Admin debug helper — re-runs extraction against an already-uploaded
  // photo's storage path. Drops the photo's previously-extracted tasks and
  // re-pushes the fresh batch. Useful when iterating on the vision prompt
  // without having to re-upload from scratch.
  async function rerunExtraction(photoId: string) {
    const photo = photos.find(p => p.id === photoId)
    if (!photo || !photo.path) return
    setPhotos(prev =>
      prev.map(p =>
        p.id === photoId
          ? { ...p, status: "thinking", errorMessage: undefined }
          : p,
      ),
    )
    setTasks(prev => prev.filter(t => t.photoId !== photoId))
    try {
      const res = await fetch("/api/tasks/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: photo.path, imageName: photo.name }),
      })
      const data = (await res.json()) as DraftDebugResponse & {
        subject: string | null
        tasks: VisionTask[]
      }
      const debug: DraftDebugResponse = { ...data, status: res.status }
      if (!res.ok) {
        setPhotos(prev =>
          prev.map(p =>
            p.id === photoId
              ? {
                  ...p,
                  status: "failed",
                  errorMessage: data.message ?? messages.errorVision,
                  draftResponse: debug,
                }
              : p,
          ),
        )
        return
      }
      setPhotos(prev =>
        prev.map(p =>
          p.id === photoId
            ? {
                ...p,
                status: "done",
                detectedSubject: data.subject,
                draftResponse: debug,
                suggestedGroupTitle: data.groupTitle ?? null,
                // On re-run we DO want to refresh the title with whatever
                // the new extraction suggested — re-running typically
                // means the parent didn't like the previous result. Their
                // own edit (if any) was already saved above; here we
                // pull in the fresh suggestion for them to start from.
                groupTitle: data.groupTitle ?? "",
              }
            : p,
        ),
      )
      setTasks(prev => [
        ...prev,
        ...buildEntriesForPhoto(data, photoId),
      ])
      // Re-runs can change the detection — flag mismatch again if the
      // new subject still disagrees with the parent's pick.
      maybeFlagMismatch(photoId, data.subject)
    } catch (err) {
      console.error(err)
      setPhotos(prev =>
        prev.map(p =>
          p.id === photoId
            ? { ...p, status: "failed", errorMessage: messages.errorVision }
            : p,
        ),
      )
    }
  }

  // Accept any number of files from drag, paste, or the hidden input. Non-image
  // payloads are ignored so dropping a folder full of mixed files still works.
  async function handleFiles(files: Iterable<File>) {
    for (const f of files) {
      if (!f.type.startsWith("image/") && !/\.(heic|heif)$/i.test(f.name)) continue
      // eslint-disable-next-line no-await-in-loop
      await handleFile(f)
    }
  }

  // Paste-from-clipboard: works for Cmd/Ctrl+V of a screenshot or copied
  // image. Skipped while committing so the user can't add photos mid-save.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (committing) return
      const items = e.clipboardData?.items
      if (!items) return
      const files: File[] = []
      for (const it of items) {
        if (it.kind === "file") {
          const f = it.getAsFile()
          if (f) files.push(f)
        }
      }
      if (files.length > 0) {
        e.preventDefault()
        void handleFiles(files)
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
    // handleFiles closes over committing via the listener; re-binding on each
    // change keeps the guard accurate without depending on the function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committing])

  function toggleDismissed(localId: string) {
    setTasks(prev =>
      prev.map(t =>
        t.localId === localId ? { ...t, dismissed: !t.dismissed } : t,
      ),
    )
  }

  function changeSubject(localId: string, next: TaskSubject) {
    setTasks(prev =>
      prev.map(t => (t.localId === localId ? { ...t, subject: next } : t)),
    )
  }

  // Mutates a draft task's sub-step list. Editing is in-place and
  // immediate — the parent's review panel is the only opportunity to
  // tidy up before commit.
  function updateSteps(
    localId: string,
    steps: { label: string; prompt: string }[],
  ) {
    setTasks(prev =>
      prev.map(t =>
        t.localId === localId
          ? { ...t, task: { ...t.task, steps: steps.length > 0 ? steps : undefined } }
          : t,
      ),
    )
  }

  // Edits the i-th expected answer for a task. NO context sync here —
  // this fires on every keystroke, and replacing partial values
  // ("75" → "7" → "70") would corrupt the kontekst mid-typing.
  // Context sync happens once on blur via syncAnswerToContext below.
  function updateAnswer(localId: string, index: number, value: string) {
    setTasks(prev =>
      prev.map(t => {
        if (t.localId !== localId) return t
        const oldAnswers = t.task.expectedAnswers ?? []
        const nextAnswers = [...oldAnswers]
        // Pad with empty strings if editing past the current end.
        while (nextAnswers.length <= index) nextAnswers.push("")
        nextAnswers[index] = value
        return {
          ...t,
          task: { ...t.task, expectedAnswers: nextAnswers },
        }
      }),
    )
  }

  // Called on blur after the parent finishes editing a value. Replaces
  // the anchor (the value the field had at focus time) with the
  // committed value in the tutor-kontekst, using a word-boundary regex
  // so "75 → 60" doesn't clobber "750" / "175" elsewhere.
  //
  // When several sub-tasks share the same anchor (e.g. both B and C
  // are "30 kr."), a global replace would clobber both at once. To
  // keep the link 1:1 with the edited sub-task we only replace the
  // N-th occurrence of the anchor in context, where N matches the
  // position of THIS answer among same-valued earlier answers. The
  // mapping assumes vision writes values into context in step order
  // (left-to-right, top-to-bottom on the page) — which it does in
  // practice, see VISION_SYSTEM_PROMPT context examples.
  //
  // Skips the rewrite when either side is empty or unchanged.
  function syncAnswerToContext(
    localId: string,
    index: number,
    oldValue: string,
    newValue: string,
  ) {
    const oldTrim = oldValue.trim()
    const newTrim = newValue.trim()
    if (
      oldTrim.length === 0 ||
      newTrim.length === 0 ||
      oldTrim === newTrim
    ) return
    setTasks(prev =>
      prev.map(t => {
        if (t.localId !== localId) return t
        const ctx = t.task.context
        if (typeof ctx !== "string" || ctx.length === 0) return t
        // Count how many earlier answers (indices 0..index-1) had the
        // same anchor. That's the 0-based occurrence we want to swap;
        // earlier ones map to earlier sub-tasks and stay put.
        const answers = t.task.expectedAnswers ?? []
        let occurrenceTarget = 0
        for (let j = 0; j < index; j++) {
          if ((answers[j] ?? "").trim() === oldTrim) occurrenceTarget++
        }
        const escaped = oldTrim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const re = new RegExp(`\\b${escaped}\\b`, "g")
        let seen = 0
        const nextContext = ctx.replace(re, match =>
          seen++ === occurrenceTarget ? newTrim : match,
        )
        if (nextContext === ctx) return t
        return { ...t, task: { ...t.task, context: nextContext } }
      }),
    )
  }

  function updateContext(localId: string, value: string) {
    setTasks(prev =>
      prev.map(t =>
        t.localId === localId
          ? { ...t, task: { ...t.task, context: value.length > 0 ? value : undefined } }
          : t,
      ),
    )
  }

  // Maps a successful /api/tasks/draft response into review-queue entries.
  // When vision returned zero tasks but the photo isn't flagged as
  // "not_homework", inject ONE fallback task per photo so the parent
  // doesn't end up with a useless upload — the source image is linked,
  // so the in-session AI tutor can re-read it from scratch when the kid
  // starts working. Parent can still dismiss it. For "not_homework" we
  // skip the fallback (the photo genuinely isn't schoolwork) — the
  // photo chip's empty-state message tells the parent to retake.
  function buildEntriesForPhoto(
    data: DraftDebugResponse & { tasks: VisionTask[] },
    photoId: string,
  ): DraftTask[] {
    const tasks = data.tasks ?? []
    if (tasks.length > 0) {
      return tasks.map(t => ({
        localId: crypto.randomUUID(),
        photoId,
        task: t,
        subject: defaultSubject,
        approved: true,
        dismissed: false,
      }))
    }
    if (data.reason === "not_homework") return []
    const fallbackText =
      data.reason === "unreadable"
        ? "Billedet var svært at læse. Lektiehjælperen prøver igen, når sessionen starter."
        : "Vi læste ikke nogen opgave automatisk. Lektiehjælperen prøver at læse billedet, når sessionen starter."
    return [{
      localId: crypto.randomUUID(),
      photoId,
      task: {
        id: `fallback-${photoId}`,
        title: "Opgave fra billedet",
        text: fallbackText,
        type: "task",
        completionCertainty: "low",
      },
      subject: defaultSubject,
      approved: true,
      dismissed: false,
    }]
  }

  async function commit() {
    if (!childId) {
      setError(messages.errorChild)
      return
    }
    const toSave = tasks.filter(t => !t.dismissed)
    if (toSave.length === 0) {
      setError(messages.errorEmpty)
      return
    }
    setCommitting(true)
    setError(null)
    try {
      // Group by (photoId, subject) so each photo's tasks land under one
      // shared task_group_id — kid finishing task 1 then routes to task 2
      // in the same set instead of getting dumped to an empty board, same
      // as the kid-takes-photo flow. Per-task subject overrides split a
      // photo across multiple batches (rare). One batch per group via
      // /api/tasks/batch.
      const groups = new Map<string, DraftTask[]>()
      for (const t of toSave) {
        const key = `${t.photoId}::${t.subject}`
        const arr = groups.get(key) ?? []
        arr.push(t)
        groups.set(key, arr)
      }
      for (const batch of groups.values()) {
        const photo = photos.find(p => p.id === batch[0].photoId)
        // Resolve which name to send: parent's edit if non-empty, else the
        // vision suggestion, else null (Tavle falls back to the generic
        // "N opgaver fra ét lektiebillede" placeholder for null titles).
        const editedTitle = photo?.groupTitle?.trim() ?? ""
        const groupTitle =
          editedTitle.length > 0
            ? editedTitle
            : photo?.suggestedGroupTitle?.trim() || null
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch("/api/tasks/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId,
            subject: batch[0].subject,
            sourceImagePath: photo?.path ?? null,
            approve: true,
            groupTitle,
            tasks: batch.map(t => ({
              title: t.task.title ?? null,
              text: t.task.text,
              type: t.task.type,
              goal: t.task.goal ?? null,
              steps: t.task.steps ?? null,
              context: t.task.context ?? null,
              needsPaper: t.task.needsPaper ?? null,
              expectedAnswers: t.task.expectedAnswers ?? null,
              completionCertainty: t.task.completionCertainty ?? "medium",
            })),
          }),
        })
        if (!res.ok) throw new Error("commit failed")
      }
      router.push(boardHref)
      router.refresh()
    } catch (err) {
      console.error(err)
      setError(messages.errorVision)
      setCommitting(false)
    }
  }

  const liveTasks = tasks.filter(t => !t.dismissed)
  const liveCount = liveTasks.length
  const totalCount = tasks.length
  const anyThinking = photos.some(p => p.status === "uploading" || p.status === "thinking")
  const allDone = photos.length > 0 && photos.every(p => p.status === "done" || p.status === "failed")

  return (
    <div
      className="relative flex w-full flex-col gap-5"
      onDragEnter={e => {
        if (committing) return
        if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return
        e.preventDefault()
        dragDepth.current += 1
        setDragActive(true)
      }}
      onDragOver={e => {
        if (Array.from(e.dataTransfer?.types ?? []).includes("Files")) {
          e.preventDefault()
        }
      }}
      onDragLeave={e => {
        if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return
        e.preventDefault()
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragActive(false)
      }}
      onDrop={e => {
        if (committing) return
        const files = e.dataTransfer?.files
        if (!files || files.length === 0) return
        e.preventDefault()
        dragDepth.current = 0
        setDragActive(false)
        void handleFiles(Array.from(files))
      }}
    >
      {dragActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-card border-2 border-dashed border-mint-deep bg-mint-soft/85 text-mint-deep"
        >
          <span
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            Slip billederne her
          </span>
        </div>
      )}
      {/* Subject picker — full-width row of subject cards using the same
          rich glyphs as the Tavle electives so the visual identity carries
          across the flow. Picking a subject bulk-applies to any draft tasks
          that haven't been individually overridden in the review queue. */}
      <div
        className="rounded-card bg-white p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <p className="text-sm font-medium text-ink/80">{messages.subjectLabel}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {SUBJECT_OPTIONS.filter(s => s !== "tysk").map(s => {
            const active = defaultSubject === s
            const tint = SUBJECT_TINT[s]
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setDefaultSubject(s)
                  setTasks(prev => prev.map(t => ({ ...t, subject: s })))
                }}
                className={`flex w-full items-center gap-3 rounded-card p-4 text-left transition cursor-pointer ${
                  active ? "ring-2" : "hover:-translate-y-0.5"
                }`}
                style={{
                  background: tint.tint,
                  // Active card gets a colored ring matching the subject bar
                  // — easier to read at a glance than relying on a tint shift.
                  boxShadow: active
                    ? `0 0 0 2px ${tint.bar}, 0 6px 18px -10px rgba(31,45,26,0.2)`
                    : "0 1px 0 rgba(255,255,255,0.5) inset, 0 4px 14px -10px rgba(31,45,26,0.15)",
                }}
              >
                <span aria-hidden className="shrink-0">
                  {tint.glyph}
                </span>
                <span
                  className="text-base font-semibold text-ink"
                  style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
                >
                  {messages.subjects[s] ?? s}
                </span>
              </button>
            )
          })}
        </div>
        {showChildPicker && (
          <label className="mt-5 flex items-center justify-between gap-3 border-t border-ink/8 pt-4 text-sm font-medium text-ink/80">
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
        )}
      </div>

      {/* Photo strip */}
      <div className="flex flex-wrap gap-3">
        {photos.map((p, i) => (
          <PhotoChip
            key={p.id}
            photo={p}
            index={i + 1}
            onRemove={() => removePhoto(p.id)}
            messages={messages}
          />
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={committing}
          className="flex h-36 w-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-ink/20 bg-white/60 text-ink/55 transition hover:-translate-y-0.5 hover:border-mint-deep hover:bg-white hover:text-ink disabled:opacity-50 sm:h-40 sm:w-40"
        >
          <span
            aria-hidden
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: "#E4F2EB", color: "#4F8E6B" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
          <span className="px-2 text-center text-xs font-semibold leading-tight">
            {photos.length === 0 ? messages.addPhotoCta : messages.addAnotherPhotoCta}
          </span>
        </button>
      </div>

      {photos.length === 0 && (
        <p className="text-sm text-ink/55">
          {messages.subtitle}
          <span className="ml-1 text-ink/45">
            Træk billeder hertil, eller indsæt fra udklipsholderen (Ctrl+V).
          </span>
        </p>
      )}

      {/* Localhost-only raw-JSON debug section — one row per photo with
          everything the extractor returned. Helps diagnose "why did it
          pick wrong" or "why did this fail" during prompt iteration. Not
          shown in prod even on the admin account: the raw vision text
          can include extracted homework that's noisy for live use. */}
      {isAdmin && isDev && photos.length > 0 && (
        <DebugPanel photos={photos} onRerun={rerunExtraction} />
      )}

      {/* Review */}
      {tasks.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2
              className="text-lg font-semibold text-ink"
              style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
            >
              {messages.reviewTitle}
            </h2>
            <span className="text-xs text-ink/55">
              {liveCount === 1
                ? messages.reviewSubtitleOne
                : messages.reviewSubtitle.replace("{n}", String(liveCount))}
            </span>
          </div>

          {/* One editable bundle title per photo with 2+ live tasks. The
              parent can override the AI suggestion before commit; what they
              type here is what shows up on the Tavle bundle row. Photos
              with 0 or 1 live task collapse to a solo card on the board so
              there's no bundle to name — input hidden in that case. */}
          {(() => {
            const photoTaskCounts = new Map<string, number>()
            for (const t of tasks) {
              if (t.dismissed) continue
              photoTaskCounts.set(t.photoId, (photoTaskCounts.get(t.photoId) ?? 0) + 1)
            }
            const bundles = photos.filter(p => (photoTaskCounts.get(p.id) ?? 0) >= 2)
            if (bundles.length === 0) return null
            return (
              <div className="flex flex-col gap-2">
                {bundles.map(p => (
                  <BundleTitleInput
                    key={p.id}
                    photo={p}
                    photoIndex={photos.findIndex(pp => pp.id === p.id) + 1}
                    onChange={value =>
                      setPhotos(prev =>
                        prev.map(pp => (pp.id === p.id ? { ...pp, groupTitle: value } : pp)),
                      )
                    }
                  />
                ))}
              </div>
            )
          })()}

          <ul className="flex flex-col gap-3">
            {tasks.map(t => (
              <DraftTaskCard
                key={t.localId}
                draft={t}
                photoIndex={photos.findIndex(p => p.id === t.photoId) + 1}
                onToggleDismiss={() => toggleDismissed(t.localId)}
                onSubjectChange={s => changeSubject(t.localId, s)}
                onStepsChange={steps => updateSteps(t.localId, steps)}
                onAnswerChange={(idx, v) => updateAnswer(t.localId, idx, v)}
                onAnswerCommit={(idx, oldV, newV) =>
                  syncAnswerToContext(t.localId, idx, oldV, newV)
                }
                onContextChange={v => updateContext(t.localId, v)}
                isAdmin={isAdmin}
                messages={messages}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Commit bar */}
      {photos.length > 0 && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 bg-canvas/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border sm:px-4">
          <div className="text-xs text-ink/60">
            {liveCount} / {totalCount} {totalCount === 1 ? "opgave" : "opgaver"}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={boardHref}
              className="rounded-btn border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink/70 transition hover:bg-canvas cursor-pointer"
            >
              {messages.cancel}
            </Link>
            <button
              type="button"
              onClick={commit}
              disabled={committing || liveCount === 0 || anyThinking || !allDone}
              className="rounded-btn bg-primary px-5 py-2 text-sm font-semibold text-ink transition hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {committing
                ? messages.committing
                : liveCount === 1
                  ? messages.commitOne
                  : messages.commit.replace("{n}", String(liveCount))}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-clay">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={e => {
          const fs = e.target.files
          if (fs && fs.length > 0) void handleFiles(Array.from(fs))
          // Allow re-selecting the same file later
          if (fileRef.current) fileRef.current.value = ""
        }}
      />
      {pendingMismatch && (
        <SubjectMismatchModal
          picked={defaultSubject}
          detected={pendingMismatch.detected}
          subjectLabels={messages.subjects}
          onSwitch={applyMismatchSwitch}
          onKeep={() => setPendingMismatch(null)}
        />
      )}
    </div>
  )
}

/**
 * Surfaces a "you picked X but the photo looks like Y" choice when the
 * vision-detected subject disagrees with the parent's pick. Switching
 * re-tags every task from the flagged photo; keeping leaves them on the
 * parent's original pick. Backdrop dismiss = keep.
 */
function SubjectMismatchModal({
  picked,
  detected,
  subjectLabels,
  onSwitch,
  onKeep,
}: {
  picked: TaskSubject
  detected: TaskSubject
  subjectLabels: Record<string, string>
  onSwitch: () => void
  onKeep: () => void
}) {
  const pickedLabel = subjectLabels[picked] ?? picked
  const detectedLabel = subjectLabels[detected] ?? detected
  const detectedTint = SUBJECT_TINT[detected]
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subject-mismatch-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Luk"
        onClick={onKeep}
        className="absolute inset-0 cursor-pointer bg-ink/40 backdrop-blur-sm"
      />
      <div
        className="relative w-full max-w-md rounded-card bg-white p-6 text-center shadow-2xl"
        style={{ boxShadow: "0 24px 60px -20px rgba(31,45,26,0.35)" }}
      >
        {/* Subject glyph in its own tint — visual cue for what we
            detected, before the parent reads the body copy. */}
        <span
          aria-hidden
          className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: detectedTint.tint }}
        >
          {detectedTint.glyph}
        </span>
        <h2
          id="subject-mismatch-title"
          className="text-xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          Det her ligner {detectedLabel}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/65">
          Du har valgt <b>{pickedLabel}</b>, men billedet ser ud til at være
          <> </>
          <b>{detectedLabel}</b>. Vil du skifte fag for denne lektie?
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onKeep}
            className="rounded-btn border border-ink/15 bg-white px-5 py-2.5 text-sm font-semibold text-ink/75 transition hover:bg-canvas cursor-pointer"
          >
            Behold {pickedLabel}
          </button>
          <button
            type="button"
            onClick={onSwitch}
            className="rounded-btn bg-mint-deep px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 cursor-pointer"
            style={{ boxShadow: "0 4px 12px -4px rgba(79,142,107,0.45)" }}
          >
            Skift til {detectedLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function PhotoChip({
  photo,
  index,
  onRemove,
  messages,
}: {
  photo: Photo
  index: number
  onRemove: () => void
  messages: AddToBoardMessages
}) {
  const status = photo.status
  const isActive = status === "uploading" || status === "thinking"
  const statusInfo: { label: string; tone: "mint" | "muted" | "clay" } | null =
    status === "uploading" ? { label: messages.photoUploading, tone: "muted" }
      : status === "thinking" ? { label: messages.photoThinking, tone: "mint" }
      : status === "failed" ? { label: messages.photoFailed, tone: "clay" }
      : status === "done" && photo.detectedSubject
        ? { label: photo.detectedSubject, tone: "mint" }
        : null
  const dot = statusInfo?.tone === "mint" ? "#4F8E6B" : statusInfo?.tone === "clay" ? "#A05844" : "rgba(31,45,26,0.45)"
  return (
    <div
      className="relative h-36 w-36 overflow-hidden rounded-card border border-ink/8 bg-white sm:h-40 sm:w-40"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.previewUrl}
        alt=""
        className="h-full w-full object-cover"
        style={{ opacity: status === "done" ? 1 : 0.55 }}
      />
      {/* Top-edge stripe ONLY while uploading (the brief PUT to Storage,
          usually <1s on a fast line). Once the vision call kicks in
          (status="thinking") we hand off to the centered spinner so the
          two indicators don't double up during the long phase. */}
      {status === "uploading" && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-mint-soft/70"
        >
          <div className="h-full w-1/3 animate-photo-chip-stripe rounded-full bg-mint-deep/80" />
        </div>
      )}
      {/* Centered spinner overlay during the long "thinking" (vision)
          phase — the 30-45s call where motion reassures the parent the
          system isn't frozen. */}
      {status === "thinking" && (
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className="h-9 w-9 animate-spin rounded-full border-[2.5px] border-white/70"
            style={{ borderTopColor: "var(--color-mint-deep, #4F8E6B)" }}
          />
        </div>
      )}
      {/* Status strip — soft white tray with a colored dot + label, matches
          the chip-style we use elsewhere (subject pills, status pills). */}
      <div
        className="absolute inset-x-2 bottom-2 flex items-center gap-2 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink"
        style={{ boxShadow: "0 4px 10px -6px rgba(31,45,26,0.25)" }}
      >
        <span
          aria-hidden
          className={`inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${
            isActive ? "animate-pulse" : ""
          }`}
          style={{ background: dot }}
        />
        <span className="text-ink/55">#{index}</span>
        {statusInfo && (
          <span className="ml-auto truncate uppercase tracking-wider text-[10px] text-ink/65">
            {statusInfo.label}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Fjern"
        aria-label="Fjern billede"
        className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-ink/70 transition hover:bg-white hover:text-ink cursor-pointer"
        style={{ boxShadow: "0 2px 6px rgba(31,45,26,0.2)" }}
      >
        ×
      </button>
    </div>
  )
}

function BundleTitleInput({
  photo,
  photoIndex,
  onChange,
}: {
  photo: Photo
  photoIndex: number
  onChange: (value: string) => void
}) {
  // Value is pre-filled with the AI suggestion at upload time (see the
  // `groupTitle: data.groupTitle ?? ""` line in the upload + rerun
  // handlers), so the input renders the actual suggested text — parent
  // can edit or clear directly. Empty string means "use no title" and
  // commits null to the DB so Tavle falls back to the placeholder.
  const value = photo.groupTitle ?? ""
  return (
    <div className="rounded-card border border-mint-edge/60 bg-mint-soft/40 p-3">
      <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-mint-deep/85">
        <span className="flex items-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 7h18M3 12h18M3 17h12" />
          </svg>
          Sæt-titel · billede #{photoIndex}
        </span>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Giv sættet et navn"
          maxLength={80}
          className="w-full rounded-btn border border-mint-edge/60 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink placeholder:text-ink/40 focus:border-mint-deep focus:outline-none"
        />
      </label>
    </div>
  )
}

function DraftTaskCard({
  draft,
  photoIndex,
  onToggleDismiss,
  onSubjectChange,
  onStepsChange,
  onAnswerChange,
  onAnswerCommit,
  onContextChange,
  isAdmin = false,
  messages,
}: {
  draft: DraftTask
  photoIndex: number
  onToggleDismiss: () => void
  onSubjectChange: (s: TaskSubject) => void
  onStepsChange: (steps: { label: string; prompt: string }[]) => void
  /** Per-keystroke update of one expected answer at `idx`. Cheap — just
   *  updates the answer; never touches the tutor-kontekst. */
  onAnswerChange: (idx: number, value: string) => void
  /** Fired on blur AFTER the parent finishes editing an answer.
   *  `oldValue` is whatever was in the input when it received focus,
   *  so the substitution into tutor-kontekst uses the original anchor
   *  rather than a half-typed intermediate. */
  onAnswerCommit: (idx: number, oldValue: string, newValue: string) => void
  /** Edit the free-form tutor-kontekst block. Empty string clears it. */
  onContextChange: (value: string) => void
  isAdmin?: boolean
  messages: AddToBoardMessages
}) {
  const t = draft.task
  const dismissed = draft.dismissed
  const steps = t.steps ?? []
  const capHit = steps.length >= STEP_CAP

  function setStep(idx: number, patch: Partial<{ label: string; prompt: string }>) {
    const next = steps.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    onStepsChange(next)
  }
  function removeStep(idx: number) {
    onStepsChange(steps.filter((_, i) => i !== idx))
  }
  function addStep() {
    onStepsChange([
      ...steps,
      { label: nextStepLabel(steps.map(s => s.label)), prompt: "" },
    ])
  }
  // Original task text is often a dense paragraph with fill-in blanks —
  // hide it behind a toggle so the sub-tasks (the actually actionable
  // items) are what the parent sees first.
  const [textOpen, setTextOpen] = useState(false)
  const hasOriginalText = !!t.title && !!t.text && t.text !== t.title
  const stepCount = t.steps?.length ?? 0

  return (
    <li
      className={`rounded-card border bg-white transition ${
        dismissed ? "border-ink/5 opacity-60" : "border-ink/5"
      }`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Top row — meta chips + per-card controls. */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/5 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wider">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5"
            style={{ background: K.mintSoft, color: K.mintDeep }}
          >
            {messages.subjects[draft.subject] ?? draft.subject}
          </span>
          <span className="text-ink/45">Billede #{photoIndex}</span>
          {stepCount > 0 && (
            <span className="text-ink/45">
              · {stepCount} {stepCount === 1 ? "deltrin" : "deltrin"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={draft.subject}
            onChange={e => onSubjectChange(e.target.value as TaskSubject)}
            disabled={dismissed}
            className="rounded-btn border border-ink/15 bg-white px-2 py-1 text-xs text-ink disabled:opacity-50"
            aria-label="Skift fag"
          >
            {SUBJECT_OPTIONS.map(s => (
              <option key={s} value={s}>{messages.subjects[s] ?? s}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onToggleDismiss}
            className={`rounded-btn px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              dismissed
                ? "bg-primary text-ink hover:opacity-90"
                : "border border-ink/15 bg-white text-ink/70 hover:bg-canvas"
            }`}
          >
            {dismissed ? messages.undoDismiss : messages.dismiss}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 px-4 py-4">
        {/* Title */}
        <h3
          className="text-base font-semibold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {t.title || shorten(t.text, 90)}
        </h3>

        {/* Goal — small mint-soft chip with a target glyph. The "why" of
            the task, prominent so the parent gets the pedagogical intent
            at a glance. */}
        {t.goal && (
          <div
            className="inline-flex items-start gap-2 rounded-card px-3 py-2 text-xs text-ink/80"
            style={{ background: K.mintSoft }}
          >
            <span aria-hidden style={{ color: K.mintDeep }} className="mt-0.5 shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <span className="font-semibold" style={{ color: K.mintDeep }}>Mål: </span>
              {t.goal}
            </div>
          </div>
        )}

        {/* Sub-task list — editable. Each row has label + prompt inputs +
            a delete button. Footer has an "Add" link, plus a warning chip
            when we're at the extractor's cap (which usually means more
            sub-items existed on the page than we could fit). */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">
              Deltrin {steps.length > 0 && <span className="text-ink/40">· {steps.length}</span>}
            </p>
            {capHit && (
              <span
                title={`Vi hentede maks ${STEP_CAP} deltrin. Hvis billedet har flere, så tilføj dem her.`}
                className="inline-flex items-center gap-1 rounded-full bg-clay-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-clay-deep"
                style={{ color: "#8F4A38" }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 9v4M12 17h.01" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Maks {STEP_CAP} nået
              </span>
            )}
          </div>
          {steps.length === 0 ? (
            <div className="mt-1.5 flex flex-col gap-1.5">
              <p className="text-xs italic text-ink/45">Ingen deltrin endnu.</p>
              {/* When the extractor couldn't read sub-items (small images,
                  cluttered layout, handwriting), surface that as a soft
                  notice so the parent knows it's not a bug. The tutor still
                  has the full task text + context and will guide the kid
                  through the exercise even without a curated step list. */}
              {t.context && (
                <p className="text-xs text-ink/55">
                  Tutoren vil guide barnet gennem opgaven ud fra opgaveteksten.
                  Tilføj selv deltrin hvis du vil.
                </p>
              )}
            </div>
          ) : (
            <ol className="mt-2 flex flex-col gap-1.5">
              {steps.map((s, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 rounded-btn bg-canvas/50 px-2 py-1.5"
                >
                  <input
                    type="text"
                    aria-label="Etiket"
                    value={s.label}
                    maxLength={6}
                    disabled={dismissed}
                    onChange={e => setStep(idx, { label: e.target.value })}
                    className="mt-0.5 inline-flex h-7 w-9 shrink-0 items-center justify-center rounded-full bg-white text-center text-[11px] font-bold uppercase text-ink focus:outline-none focus:ring-2 focus:ring-mint-deep/30 disabled:opacity-50"
                    style={{ color: K.mintDeep, border: `1px solid ${K.mintEdge}`, padding: 0 }}
                  />
                  <textarea
                    aria-label="Deltrin"
                    value={s.prompt}
                    maxLength={200}
                    rows={1}
                    disabled={dismissed}
                    onChange={e => setStep(idx, { prompt: e.target.value })}
                    onInput={e => {
                      const el = e.currentTarget
                      el.style.height = "auto"
                      el.style.height = `${el.scrollHeight}px`
                    }}
                    className="min-w-0 flex-1 resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-ink/85 focus:border-ink/15 focus:bg-white focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    disabled={dismissed}
                    title="Slet deltrin"
                    aria-label="Slet deltrin"
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/45 transition hover:bg-ink/5 hover:text-clay cursor-pointer disabled:opacity-40"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </li>
              ))}
            </ol>
          )}
          <button
            type="button"
            onClick={addStep}
            disabled={dismissed || capHit}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-mint-deep transition hover:opacity-80 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tilføj deltrin
          </button>
        </div>

        {/* Forventet svar — admin/dev preview so the parent can sanity-check
            that the vision model read the task correctly BEFORE the kid
            sits down. Never persisted; never shown to the kid. Only renders
            when the extractor returned at least one non-empty answer
            (open-ended creative tasks legitimately have none). */}
        {/* Forventet svar — shown to every parent so they can spot-check
            what the AI thinks the answers are before sending the kid in.
            Useful even for non-admin parents: catches misread numbers
            (price tags, OCR slips) at review time, not after the kid is
            stuck. Tutor-kontekst stays admin-only because it's tutor
            scaffolding meant for the model, not parent-facing content. */}
        {t.expectedAnswers && t.expectedAnswers.some(a => a.trim().length > 0) && (
          <ExpectedAnswers
            steps={steps}
            answers={t.expectedAnswers}
            disabled={dismissed}
            onAnswerChange={onAnswerChange}
            onAnswerCommit={onAnswerCommit}
          />
        )}

        {/* Tutor context — admin/dev preview of the opaque notes the
            extractor captured for Dani (target words from the page,
            unreadable-region explanations, hidden-answer locations).
            This is what the AI tutor will use during the session; the
            kid never sees it. Editable: parent can correct misreads or
            add detail; auto-syncs from expected-answer edits via
            updateAnswer's word-boundary substitution. */}
        {/* Render the textarea whenever the user is admin — empty
            context is fine (the textarea handles input). Previously
            gated on `t.context || onContextChange` which was always
            truthy because the prop is required. */}
        {isAdmin && (
          <div className="rounded-card border border-dashed border-ink/15 bg-canvas/50 px-3 py-2.5 text-[12px]">
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink/55">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                Tutor-kontekst
              </span>
              <textarea
                value={t.context ?? ""}
                onChange={e => onContextChange(e.target.value)}
                disabled={dismissed}
                rows={Math.max(2, Math.min(6, ((t.context ?? "").match(/\n/g)?.length ?? 0) + 2))}
                placeholder="Notater til Dani — synlige facts, sjældne ord, særlige hint"
                className="w-full resize-y rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[12px] leading-relaxed text-ink/85 placeholder:text-ink/35 focus:border-ink/15 focus:bg-white focus:outline-none disabled:opacity-50"
              />
            </label>
          </div>
        )}

        {/* Original task text — collapsed behind a disclosure button so
            the dense paragraph with fill-in blanks doesn't dominate. */}
        {hasOriginalText && (
          <div className="border-t border-ink/5 pt-3">
            <button
              type="button"
              onClick={() => setTextOpen(o => !o)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ink/55 transition hover:text-ink cursor-pointer"
              aria-expanded={textOpen}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition ${textOpen ? "rotate-180" : ""}`}
                aria-hidden
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              {textOpen ? "Skjul opgavetekst" : "Vis opgavetekst"}
            </button>
            {textOpen && (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/65">
                {t.text}
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function ExpectedAnswers({
  steps,
  answers,
  disabled,
  onAnswerChange,
  onAnswerCommit,
}: {
  steps: { label: string; prompt: string }[]
  answers: string[]
  disabled?: boolean
  /** Per-keystroke update — only mutates the answer state. */
  onAnswerChange: (idx: number, value: string) => void
  /** Called on blur with the anchor (value at focus time) and the
   *  committed value, so the parent can do a one-shot regex replace
   *  in the tutor-kontekst without seeing every intermediate keystroke. */
  onAnswerCommit: (idx: number, oldValue: string, newValue: string) => void
}) {
  // Anchor per input: the value the field had when it received focus.
  // Captured in onFocus, consumed in onBlur. useRef instead of state
  // so updating it doesn't cause a re-render that resets the input.
  const anchorRef = useRef<Record<number, string>>({})
  function captureAnchor(i: number) {
    anchorRef.current[i] = (answers[i] ?? "").trim()
  }
  function commitAnchor(i: number, current: string) {
    const old = anchorRef.current[i] ?? ""
    onAnswerCommit(i, old, current)
    anchorRef.current[i] = current.trim()
  }
  const hasSteps = steps.length > 0
  return (
    <div
      className="rounded-card border border-dashed border-mint-edge bg-mint-soft/40 px-3 py-2.5 text-[12px]"
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-mint-deep/85">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Forventet svar
      </div>
      {hasSteps ? (
        <ul className="flex flex-col gap-1.5">
          {steps.map((s, i) => (
            <li key={s.label + i} className="flex items-center gap-2">
              <span className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-white/80 px-1.5 text-[10px] font-bold text-mint-deep">
                {s.label}
              </span>
              <input
                type="text"
                value={answers[i] ?? ""}
                onChange={e => onAnswerChange(i, e.target.value)}
                onFocus={() => captureAnchor(i)}
                onBlur={e => commitAnchor(i, e.target.value)}
                disabled={disabled}
                placeholder="Svar"
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-[12px] text-ink/90 placeholder:text-ink/35 focus:border-mint-deep/40 focus:bg-white focus:outline-none disabled:opacity-50"
              />
            </li>
          ))}
        </ul>
      ) : (
        <input
          type="text"
          value={answers[0] ?? ""}
          onChange={e => onAnswerChange(0, e.target.value)}
          onFocus={() => captureAnchor(0)}
          onBlur={e => commitAnchor(0, e.target.value)}
          disabled={disabled}
          placeholder="Svar"
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-[12px] text-ink/90 placeholder:text-ink/35 focus:border-mint-deep/40 focus:bg-white focus:outline-none disabled:opacity-50"
        />
      )}
    </div>
  )
}

function isSubject(s: string | null | undefined): s is TaskSubject {
  return s === "matematik" || s === "dansk" || s === "engelsk" || s === "tysk"
}

function shorten(text: string, max = 90): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + "…"
}

// Suggests a sensible label for a freshly added step. Walks the existing
// labels to figure out whether the page is using letters (A, B, C…) or
// numbers (1, 2, 3…) and increments accordingly. Falls back to "A" on an
// empty list.
function nextStepLabel(existing: string[]): string {
  for (let i = existing.length - 1; i >= 0; i--) {
    const last = existing[i].trim()
    if (/^\d+$/.test(last)) {
      return String(parseInt(last, 10) + 1)
    }
    if (/^[A-Z]$/.test(last)) {
      const code = last.charCodeAt(0)
      return code < 90 ? String.fromCharCode(code + 1) : "AA"
    }
    if (/^[a-z]$/.test(last)) {
      const code = last.charCodeAt(0)
      return code < 122 ? String.fromCharCode(code + 1) : "aa"
    }
  }
  return "A"
}

// ─── Debug panel ─────────────────────────────────────────────────────────────
// Admin-only. One row per uploaded photo with everything the extractor
// returned: subject + confidence, reason / detection notes, token usage,
// elapsed ms, plus a "Vis råt JSON" toggle and a "Kør igen" button to
// re-extract without re-uploading.

function DebugPanel({
  photos,
  onRerun,
}: {
  photos: Photo[]
  onRerun: (photoId: string) => void
}) {
  return (
    <details
      className="rounded-card border border-ink/10 bg-canvas/40 px-4 py-3"
    >
      <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider text-ink/65">
        Debug · vision-output ({photos.length})
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        {photos.map((p, i) => (
          <DebugRow key={p.id} photo={p} index={i + 1} onRerun={() => onRerun(p.id)} />
        ))}
      </div>
    </details>
  )
}

function DebugRow({
  photo,
  index,
  onRerun,
}: {
  photo: Photo
  index: number
  onRerun: () => void
}) {
  const [showRaw, setShowRaw] = useState(false)
  const [copied, setCopied] = useState(false)
  const r = photo.draftResponse

  async function copyJson() {
    if (!r) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(r, null, 2))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback for browsers blocking clipboard API in dev — leave the
      // pre block visible so the dev can still hand-select.
      setShowRaw(true)
    }
  }
  const ok = r ? r.status >= 200 && r.status < 300 : false
  const tasksCount = r?.tasks?.length ?? 0
  const sizeKb = Math.round(photo.size / 1024)
  return (
    <div className="rounded-card bg-white p-3 text-[12px] text-ink/85" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="font-bold text-ink">#{index}</span>
        <span className="font-mono text-ink/55">{photo.name} · {sizeKb} kB · {photo.type || "?"}</span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
          style={
            photo.status === "done" ? { background: "#E1EEDD", color: "#4F8E6B" }
              : photo.status === "failed" ? { background: "#F4DBD1", color: "#A05844" }
              : { background: "rgba(31,45,26,0.06)", color: "rgba(31,45,26,0.6)" }
          }
        >
          {photo.status}
        </span>
        {r?.elapsedMs != null && (
          <span className="font-mono text-ink/55">{r.elapsedMs}ms</span>
        )}
        {r?.usage && (
          <span className="font-mono text-ink/55">
            {r.usage.promptTokens}p / {r.usage.completionTokens}c · {r.usage.model}
          </span>
        )}
        {r?.mocked && (
          <span className="rounded-full bg-mint-soft px-2 py-0.5 text-[10px] font-bold uppercase text-mint-deep">
            mocked
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRaw(s => !s)}
            className="rounded-md border border-ink/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink/70 transition hover:bg-canvas cursor-pointer"
          >
            {showRaw ? "Skjul JSON" : "Vis råt JSON"}
          </button>
          <button
            type="button"
            onClick={copyJson}
            disabled={!r}
            className="rounded-md border border-ink/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink/70 transition hover:bg-canvas cursor-pointer disabled:opacity-50"
            title="Kopiér hele response som JSON til udklipsholderen"
          >
            {copied ? "Kopieret ✓" : "Kopier JSON"}
          </button>
          <button
            type="button"
            onClick={onRerun}
            disabled={!photo.path || photo.status === "thinking" || photo.status === "uploading"}
            className="rounded-md bg-ink px-2.5 py-1 text-[11px] font-semibold text-canvas transition hover:opacity-90 cursor-pointer disabled:opacity-50"
            title="Kør vision-extractor igen mod samme billede"
          >
            Kør igen
          </button>
        </div>
      </div>

      {/* Quick-glance summary line. */}
      {r && (
        <div className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
          <DbgField label="ok">{String(ok)}</DbgField>
          <DbgField label="status">{String(r.status)}</DbgField>
          <DbgField label="subject">
            {r.subject ?? "—"}{r.subjectConfidence ? ` (${r.subjectConfidence})` : ""}
          </DbgField>
          <DbgField label="tasks">{String(tasksCount)}</DbgField>
          <DbgField label="reason">{r.reason ?? "—"}</DbgField>
          <DbgField label="detectionNotes">{r.detectionNotes ?? "—"}</DbgField>
          {r.error && <DbgField label="error">{r.error}</DbgField>}
          {r.message && <DbgField label="message">{r.message}</DbgField>}
        </div>
      )}

      {showRaw && r && (
        <pre
          className="mt-3 max-h-80 overflow-auto rounded-md bg-ink p-3 text-[10.5px] leading-relaxed text-canvas/95"
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        >
          <code>{JSON.stringify(r, null, 2)}</code>
        </pre>
      )}
    </div>
  )
}

function DbgField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink/50">{label}</span>
      <span className="min-w-0 flex-1 truncate text-ink/85">{children}</span>
    </div>
  )
}
