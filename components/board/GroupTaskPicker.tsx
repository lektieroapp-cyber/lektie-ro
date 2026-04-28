"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { TaskPicker } from "@/components/session/TaskPicker"
import type { SolveResponse, Task } from "@/components/session/types"

// Thin client wrapper around the kid-flow TaskPicker for a saved bundle.
// Builds a synthetic SolveResponse out of the stored tasks (no sessionId
// because no session exists yet — the session is created when the kid
// actually opens one of the tasks via the existing per-task page).
export function GroupTaskPicker({
  locale,
  subject,
  tasks,
  completedTaskIds,
  justDoneLabel,
  backHref,
  taskHrefBase,
}: {
  locale: string
  subject: string
  tasks: Task[]
  /** Ids of tasks already finished — TaskPicker hides them from the
   *  grid and switches its headline to "N tilbage" so the kid coming
   *  back from a finished task sees progress reflected immediately. */
  completedTaskIds?: string[]
  /** When the kid arrives here straight from completing a task, this is
   *  that task's title. Drives a celebration banner above the picker so
   *  the kid gets a "godt klaret!" before being asked to pick the
   *  next task. Null on first visit / "Start alle". */
  justDoneLabel?: string | null
  backHref: string
  taskHrefBase: string
}) {
  const router = useRouter()
  void locale

  const solve: SolveResponse = {
    sessionId: "",
    subject,
    subjectConfidence: "high",
    tasks,
    reason: null,
    detectionNotes: null,
  }

  function pickTask(t: Task) {
    router.push(`${taskHrefBase}/${t.id}`)
  }

  return (
    <div className="flex w-full flex-col gap-5 pb-12 md:pb-16">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 self-start text-sm font-medium text-ink/60 transition hover:text-ink cursor-pointer"
      >
        <span aria-hidden>‹</span> Tilbage
      </Link>
      {/* Celebration banner — only shown when the kid just finished a
          task in this set. Mint-soft pill with the finished task's
          title so they read it as personal recognition, not generic
          "you did something". Centered to match the picker below. */}
      {justDoneLabel && (
        <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-card bg-mint-soft px-4 py-3 text-sm text-mint-deep" role="status">
          <span aria-hidden className="text-xl">🎉</span>
          <span className="font-semibold">
            Godt klaret! Du blev færdig med <span className="italic">{justDoneLabel}</span>.
          </span>
        </div>
      )}
      {/* Wrap in flex+justify-center so the picker actually centers in
          the wide parent layout on desktop. TaskPicker's own
          `margin: 0 auto` doesn't take effect reliably inside a flex
          column (auto margins compete with `align-items: stretch`); a
          centering wrapper is the bullet-proof fix. */}
      <div className="flex w-full justify-center">
        <TaskPicker
          solve={solve}
          onPick={pickTask}
          completedTaskIds={completedTaskIds}
          // No "Tag et nyt billede" CTA here — that path belongs to the
          // kid snap-flow, not the saved-bundle picker. Send them back
          // to the board instead.
          onNewPhoto={() => router.push(backHref)}
        />
      </div>
      {/* "Færdig for i dag" exit — explicit way out before the kid has
          finished every task in the set. Important: the existing
          "Tag et nyt billede" link inside TaskPicker reads as kid-flow
          language and doesn't actually mean "I'm done"; this button
          gives a clear opt-out that lands them on the board. Mint-deep
          pill so it's a confident affirmative action, not a hide-away
          underline link. */}
      <div className="mx-auto flex w-full max-w-md justify-center pt-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-btn border border-mint-deep/40 bg-white px-5 py-2.5 text-sm font-bold text-mint-deep transition hover:bg-mint-soft/50 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Færdig for i dag
        </Link>
      </div>
    </div>
  )
}
