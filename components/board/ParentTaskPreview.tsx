"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { TaskRow, TaskStatus } from "@/lib/tasks"

type SessionLite = {
  id: string
  created_at: string
  ended_at: string | null
  turn_count: number
  completed: boolean
  difficulty_score: number | null
  steps_done: number | null
  steps_total: number | null
  completion_kind: string | null
}

type Messages = {
  back: string
  subjectLabel: string
  childLabel: string
  statusLabel: string
  createdLabel: string
  textLabel: string
  goalLabel: string
  stepsLabel: string
  sessionsLabel: string
  sessionsEmpty: string
  dismiss: string
  dismissConfirm: string
  delete: string
  deleteConfirm: string
  tryIt: string
  tryItHint: string
  subjects: Record<string, string>
  statusPending: string
  statusInProgress: string
  statusDone: string
}

const STATUS_INFO: Record<TaskStatus, { bg: string; fg: string }> = {
  pending:     { bg: "rgba(31,45,26,0.06)", fg: "rgba(31,45,26,0.7)" },
  in_progress: { bg: "#FBEFD7",             fg: "#7A5A1F" },
  done:        { bg: "#E1EEDD",             fg: "#4F8E6B" },
  dismissed:   { bg: "rgba(31,45,26,0.06)", fg: "rgba(31,45,26,0.45)" },
}

export function ParentTaskPreview({
  task,
  childName,
  sessions,
  boardHref,
  tryItHref,
  messages,
}: {
  task: TaskRow
  childName: string | null
  sessions: SessionLite[]
  boardHref: string
  /** Where the "Prøv selv" button takes the parent — typically the same
   *  task page but in tutoring mode. We keep this server-driven so the page
   *  decides which path is appropriate. */
  tryItHref: string
  messages: Messages
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<null | "dismiss" | "delete">(null)
  const status = task.status
  const statusLabel =
    status === "pending" ? messages.statusPending
      : status === "in_progress" ? messages.statusInProgress
      : status === "done" ? messages.statusDone
      : status

  async function dismiss() {
    if (!confirm(messages.dismissConfirm)) return
    setBusy("dismiss")
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      })
      router.push(boardHref)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function destroy() {
    if (!confirm(messages.deleteConfirm)) return
    setBusy("delete")
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" })
      router.push(boardHref)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex w-full flex-col gap-5 pb-12 md:pb-16">
      <Link
        href={boardHref}
        className="inline-flex items-center gap-1 self-start text-sm font-medium text-ink/60 transition hover:text-ink cursor-pointer"
      >
        <span aria-hidden>‹</span> {messages.back}
      </Link>

      {/* Header card */}
      <div
        className="rounded-card bg-white p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-ink/50">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ background: STATUS_INFO[status].bg, color: STATUS_INFO[status].fg }}
              >
                {statusLabel}
              </span>
              <span>{messages.subjects[task.subject] ?? task.subject}</span>
              {childName && <span>· {childName}</span>}
            </div>
            <h2
              className="mt-2 text-2xl font-bold text-ink md:text-3xl"
              style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
            >
              {task.title || shorten(task.text, 90)}
            </h2>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* Try-it-yourself moved up here next to dismiss/delete so the
                three task-level actions live together. The bottom CTA was
                redundant once this row is visible. Mint styling sets it
                apart from the destructive actions. */}
            <Link
              href={tryItHref}
              className="rounded-btn border border-mint-deep/30 bg-mint-soft/60 px-3 py-1.5 text-xs font-semibold text-mint-deep transition hover:bg-mint-soft cursor-pointer"
            >
              {messages.tryIt}
            </Link>
            <button
              type="button"
              onClick={dismiss}
              disabled={busy !== null || status === "dismissed"}
              className="rounded-btn border border-ink/15 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-canvas cursor-pointer disabled:opacity-50"
            >
              {busy === "dismiss" ? "…" : messages.dismiss}
            </button>
            <button
              type="button"
              onClick={destroy}
              disabled={busy !== null}
              className="rounded-btn border border-clay/30 bg-white px-3 py-1.5 text-xs font-semibold text-clay transition hover:bg-clay/10 cursor-pointer disabled:opacity-50"
            >
              {busy === "delete" ? "…" : messages.delete}
            </button>
          </div>
        </div>
      </div>

      {/* Each detail block is a collapsible card. Opgavetekst defaults
          open (it's what the parent comes here to see); the rest start
          collapsed so the page reads as a tidy list of section headers
          the parent can drill into instead of one long scroll. */}
      <CollapsibleCard label={messages.textLabel} defaultOpen>
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink/85">
          {task.text}
        </p>
      </CollapsibleCard>

      {task.goal && (
        <CollapsibleCard label={messages.goalLabel}>
          <p className="text-sm italic leading-relaxed text-ink/70">{task.goal}</p>
        </CollapsibleCard>
      )}

      {task.steps && task.steps.length > 0 && (
        <CollapsibleCard label={messages.stepsLabel}>
          <ol className="flex flex-col gap-1.5 pl-1 text-sm text-ink/80">
            {task.steps.map(s => (
              <li key={s.label} className="flex items-start gap-2">
                <span
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/8 text-[11px] font-semibold text-ink/65"
                >
                  {s.label}
                </span>
                <span>{s.prompt}</span>
              </li>
            ))}
          </ol>
        </CollapsibleCard>
      )}

      {/* Source image, if present */}
      {task.sourceImagePath && (
        <SourceImage path={task.sourceImagePath} />
      )}

      {/* Session history — also collapsible, defaults open when there
          are sessions to show, closed when empty (no point expanding
          an empty placeholder). */}
      <CollapsibleCard
        label={messages.sessionsLabel}
        defaultOpen={sessions.length > 0}
      >
        {sessions.length === 0 ? (
          <p className="text-sm text-ink/55">{messages.sessionsEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map(s => (
              <SessionRow key={s.id} session={s} />
            ))}
          </ul>
        )}
      </CollapsibleCard>
    </div>
  )
}

/**
 * Card-styled toggle with an uppercase label and a chevron that rotates
 * 180° on open. Uses local state so each card opens/closes independently
 * without needing a shared accordion parent.
 */
function CollapsibleCard({
  label,
  defaultOpen = false,
  children,
}: {
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      className="rounded-card bg-white p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-ink/55">
          {label}
        </span>
        <span
          aria-hidden
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink/50 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

function SessionRow({ session }: { session: SessionLite }) {
  const date = new Date(session.created_at).toLocaleString("da-DK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
  const status = session.completed
    ? { label: "Færdig", bg: "#E1EEDD", fg: "#4F8E6B" }
    : session.completion_kind === "abandoned"
      ? { label: "Afbrudt", bg: "rgba(31,45,26,0.06)", fg: "rgba(31,45,26,0.6)" }
      : { label: "I gang", bg: "#FBEFD7", fg: "#7A5A1F" }
  const stepsLabel =
    session.steps_total != null
      ? `${session.steps_done ?? 0}/${session.steps_total} trin`
      : `${session.turn_count} ture`
  return (
    <li className="flex items-center justify-between gap-3 rounded-btn bg-canvas/60 px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{date}</p>
        <p className="text-xs text-ink/55">{stepsLabel}</p>
      </div>
      <span
        className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
        style={{ background: status.bg, color: status.fg }}
      >
        {status.label}
      </span>
    </li>
  )
}

function SourceImage({ path }: { path: string }) {
  // We don't have the signed URL here; the page server can pre-sign and pass
  // through if/when needed. For now show a small chip with the path so the
  // parent at least knows there's a source photo on file.
  void path
  return null
}

function shorten(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + "…"
}
