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
  backHref,
  taskHrefBase,
}: {
  locale: string
  subject: string
  tasks: Task[]
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
      <TaskPicker
        solve={solve}
        onPick={pickTask}
        // No "Tag et nyt billede" CTA here — that path belongs to the
        // kid snap-flow, not the saved-bundle picker. Send them back to
        // the board instead.
        onNewPhoto={() => router.push(backHref)}
      />
    </div>
  )
}
