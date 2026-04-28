"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { HintChat } from "@/components/session/HintChat"
import { logDevEvent } from "@/components/session/dev-log"
import type {
  CompletionStatus,
  ConversationMode,
  SolveResponse,
  Task,
  Turn,
} from "@/components/session/types"

const VOICE_ENABLED = process.env.NEXT_PUBLIC_VOICE_ENABLED === "true"
const CONVO_MODE_STORAGE_KEY = "lr_convo_mode"

type Props = {
  task: Task
  subject: string
  childId: string | null
  childGrade: number | null
  /** Where to send the kid when they tap "Færdig" or close the session. */
  boardHref: string
  /** Next still-open task in the same group (homework set), if any. When
   *  set, the post-completion "More homework" CTA navigates here instead of
   *  dropping the kid back on the board — mirrors `SessionFlow.nextTask`. */
  nextSiblingHref?: string | null
  /** Resolved engelsk-tutoring preference ("danish" or "english"). Forwarded
   *  to HintChat so the /api/tts call can swap voices accordingly. */
  englishTutoringLanguage?: "danish" | "english" | null
}

export function TaskHintShell({ task, subject, childId, childGrade, boardHref, nextSiblingHref = null, englishTutoringLanguage = null }: Props) {
  const router = useRouter()
  // Voice is the default tutoring mode for every kid regardless of grade —
  // the spoken homework conversation is the core experience, text is the
  // opt-out. localStorage override below honours an explicit "text" pick
  // from a previous session.
  const [conversationMode, setConversationMode] = useState<ConversationMode>(() => {
    if (!VOICE_ENABLED) return "text"
    return "voice"
  })
  useEffect(() => {
    if (!VOICE_ENABLED) return
    try {
      const stored = window.localStorage.getItem(CONVO_MODE_STORAGE_KEY)
      if (stored === "voice" || stored === "text") setConversationMode(stored)
    } catch {}
  }, [])

  const [turns, setTurns] = useState<Turn[]>([])
  const [completed, setCompleted] = useState(false)
  const [dbSessionId, setDbSessionId] = useState<string | null>(null)
  const startedRef = useRef(false)

  // Synthesise a SolveResponse for HintChat. The legacy flow expected one of
  // these — we manufacture it from the task row so HintChat doesn't need to
  // change.
  const solve: SolveResponse = {
    sessionId: dbSessionId ?? "task-pending",
    subject,
    grade: childGrade,
    tasks: [task],
  }

  // Open a new session row the first time the kid lands on the page. The
  // session is linked to the task via task_id; backend bumps the task to
  // in_progress automatically.
  useEffect(() => {
    if (startedRef.current) return
    if (!childId) {
      // Parent dogfooding from parent mode — no session row, just chat.
      startedRef.current = true
      return
    }
    startedRef.current = true
    void (async () => {
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId,
            subject,
            grade: childGrade ?? null,
            problemText: task.text,
            problemType: task.type,
            taskId: task.id,
          }),
        })
        if (res.ok) {
          const json = (await res.json()) as { sessionId: string }
          setDbSessionId(json.sessionId)
        }
      } catch {
        // Non-fatal — chat still works, just doesn't persist.
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function completeSession(completedTurns: Turn[], status?: CompletionStatus) {
    setCompleted(true)
    logDevEvent(
      "complete",
      status
        ? `${status.kind} — ${status.stepsDone}/${status.stepsTotal} trin, ${completedTurns.length} ture`
        : `Opgave klaret på ${completedTurns.length} ture`,
    )
    if (!dbSessionId) return
    try {
      await fetch("/api/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: dbSessionId,
          turnCount: completedTurns.length,
          completed: status ? status.kind === "completed" : true,
          stepsDone: status?.stepsDone,
          stepsTotal: status?.stepsTotal,
          completionKind: status?.kind,
          turns: completedTurns,
        }),
      })
    } catch {
      // Non-fatal.
    }
  }

  function back() {
    router.push(boardHref)
  }

  // "More homework" is the auto-advance after the celebration screen. When
  // the task is part of a group with siblings still open, hop to the next
  // one — that's the whole point of grouping. Otherwise fall back to the
  // board. "Finish session" always exits to the board.
  function moreHomework() {
    if (nextSiblingHref) router.push(nextSiblingHref)
    else router.push(boardHref)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2">
        <Link
          href={boardHref}
          className="text-sm font-medium text-ink/60 hover:text-ink"
        >
          ← Tavlen
        </Link>
      </div>
      <div className="flex min-h-0 w-full max-w-2xl flex-1 flex-col self-center lg:max-w-3xl">
        <HintChat
          task={task}
          solve={solve}
          turns={turns}
          setTurns={setTurns}
          childId={childId ?? undefined}
          onComplete={completeSession}
          onMoreHomework={moreHomework}
          onFinishSession={back}
          completed={completed}
          conversationMode={conversationMode}
          englishTutoringLanguage={englishTutoringLanguage}
        />
      </div>
    </div>
  )
}

