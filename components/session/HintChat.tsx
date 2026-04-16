"use client"

import { useEffect, useRef, useState } from "react"
import type { HintMode, SolveResponse, Task, Turn } from "./types"

const MAX_TURNS = 8
const WARN_AT = 6

export function HintChat({
  task,
  solve,
  mode,
  turns,
  setTurns,
  childId,
  onComplete,
  onMoreHomework,
  onFinishSession,
  onSwitchToHint,
  completed,
}: {
  task: Task
  solve: SolveResponse
  mode: HintMode
  turns: Turn[]
  setTurns: (fn: (prev: Turn[]) => Turn[]) => void
  childId?: string
  onComplete: (turns: Turn[]) => void
  onMoreHomework: () => void
  onFinishSession: () => void
  onSwitchToHint: () => void
  completed: boolean
}) {
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [partial, setPartial] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inflightRef = useRef(false)

  const assistantTurns = turns.filter(t => t.role === "assistant").length
  const atLimit = assistantTurns >= MAX_TURNS
  const isExplain = mode === "explain"
  const firstExplainDone = isExplain && assistantTurns >= 1 && !streaming

  async function callHint(nextTurns: Turn[]) {
    if (inflightRef.current) return
    inflightRef.current = true
    setStreaming(true)
    setPartial("")
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: solve.sessionId,
          taskText: task.text,
          subject: solve.subject,
          turns: nextTurns,
          mode,
          childId,
        }),
      })
      const reader = res.body?.getReader()
      if (!reader) throw new Error("no stream")
      const decoder = new TextDecoder()
      let acc = ""
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setPartial(acc)
      }
      setTurns(prev => [...prev, { role: "assistant", content: acc }])
      setPartial("")
    } finally {
      setStreaming(false)
      inflightRef.current = false
    }
  }

  // Kick off the first AI message when the component mounts or mode changes
  // (e.g. switching from explain → hint clears turns and remounts).
  // The inflightRef guard prevents double-fire from React strict mode.
  useEffect(() => {
    if (turns.length === 0) {
      callHint([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [turns, partial])


  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || streaming || atLimit) return
    setInput("")
    const next: Turn[] = [...turns, { role: "user", content: text }]
    setTurns(() => next)
    await callHint(next)
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col rounded-card bg-white"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Header */}
      <header className="border-b border-ink/5 px-4 py-3 md:px-6 md:py-4">
        <p className="text-ink font-medium leading-snug">{task.text}</p>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 md:space-y-4 md:px-6 md:py-6">
        {turns.map((t, i) => (
          <Bubble key={i} role={t.role} isExplain={isExplain}>{t.content}</Bubble>
        ))}
        {streaming && partial && (
          <Bubble role="assistant" isExplain={isExplain}>{partial}</Bubble>
        )}
        {streaming && !partial && (
          <Bubble role="assistant" isExplain={isExplain}>
            <span className="inline-flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="inline-block h-2 w-2 rounded-full bg-ink/40 animate-[loading-dot_1.4s_ease-in-out_infinite]"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
              <style>{`
                @keyframes loading-dot {
                  0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
                  40% { transform: scale(1); opacity: 1; }
                }
              `}</style>
            </span>
          </Bubble>
        )}

        {/* Explain mode action buttons are rendered in the input area below */}

        {/* Done */}
        {completed && (
          <div className="flex flex-col gap-2 rounded-xl bg-blue-tint/60 px-4 py-4">
            <p className="text-sm font-medium text-ink">Godt klaret! 🎉</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onMoreHomework}
                className="flex-1 rounded-btn bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                Næste opgave
              </button>
              <button
                type="button"
                onClick={onFinishSession}
                className="flex-1 rounded-btn border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas"
              >
                Færdig for i dag
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      {!completed && (
        <div className="shrink-0 border-t border-ink/5 px-4 py-3 md:px-6 md:py-4">
          {/* Explain mode: show action buttons instead of text input */}
          {firstExplainDone ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={() => onComplete(turns)}
                className="flex-1 rounded-btn border border-ink/15 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas"
              >
                Prøv nu selv
              </button>
              <button
                type="button"
                onClick={onSwitchToHint}
                className="flex-1 rounded-btn bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                Jeg har brug for hjælp
              </button>
            </div>
          ) : (
            <>
              {!isExplain && assistantTurns >= WARN_AT && !atLimit && (
                <p className="mb-3 text-xs text-coral-deep">
                  Du er tæt på grænsen. Få mere ud af dit næste svar.
                </p>
              )}
              {!isExplain && atLimit && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-card bg-blue-tint/60 px-4 py-3 text-sm text-ink">
                  <span>Du har nået grænsen for denne opgave. Godt klaret!</span>
                  <button
                    type="button"
                    onClick={() => onComplete(turns)}
                    className="rounded-btn bg-success px-4 py-2 text-xs font-semibold text-white"
                  >
                    Afslut
                  </button>
                </div>
              )}
              <form onSubmit={send} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={isExplain ? "Spørg om noget …" : "Skriv dit svar …"}
                  disabled={streaming || atLimit}
                  className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-canvas/60"
                />
                <button
                  type="submit"
                  disabled={streaming || atLimit || !input.trim()}
                  className="shrink-0 rounded-btn bg-primary px-4 py-2.5 text-[15px] font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
                >
                  Send
                </button>
                {assistantTurns >= 1 && !atLimit && (
                  <button
                    type="button"
                    onClick={() => onComplete(turns)}
                    className="shrink-0 rounded-btn border border-success/30 bg-success/10 px-3 py-2.5 text-[15px] font-semibold text-success transition hover:bg-success/20"
                  >
                    ✓
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Bubble({ role, isExplain, children }: {
  role: "user" | "assistant"
  isExplain: boolean
  children: React.ReactNode
}) {
  const isUser = role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
        isUser ? "bg-primary text-white" : isExplain ? "bg-blue-tint/70 text-ink" : "bg-blue-tint/60 text-ink"
      }`}>
        {typeof children === "string" ? <RichText text={children} /> : children}
      </div>
    </div>
  )
}

/** Renders simple markdown: **bold**, \n as line breaks. */
function RichText({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <>
      {lines.map((line, i) => {
        if (line.trim() === "") return <br key={i} />
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <span key={i}>
            {i > 0 && lines[i - 1].trim() !== "" && <br />}
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>
              }
              return <span key={j}>{part}</span>
            })}
          </span>
        )
      })}
    </>
  )
}
