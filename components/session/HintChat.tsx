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
  onReset,
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
  onReset: () => void
  onSwitchToHint: () => void
  completed: boolean
}) {
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [partial, setPartial] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const kickedOff = useRef(false)

  const assistantTurns = turns.filter(t => t.role === "assistant").length
  const atLimit = assistantTurns >= MAX_TURNS
  const isExplain = mode === "explain"
  const firstExplainDone = isExplain && assistantTurns >= 1 && !streaming

  // Reset kickoff guard when mode resets.
  useEffect(() => { kickedOff.current = false }, [mode])

  async function callHint(nextTurns: Turn[]) {
    setStreaming(true)
    setPartial("")
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: solve.sessionId,
          taskText: task.text,
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
    }
  }

  useEffect(() => {
    if (kickedOff.current) return
    kickedOff.current = true
    callHint([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      className="flex flex-col rounded-card bg-white"
      style={{ boxShadow: "var(--shadow-card)", minHeight: "60vh" }}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-4 border-b border-ink/5 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">
            {solve.subject} · {solve.grade}. klasse
            {" · "}
            <span className={isExplain ? "text-blue-soft" : "text-primary"}>
              {isExplain ? "Forstå opgaven" : "Hint-guide"}
            </span>
          </p>
          <p className="mt-1 text-ink font-medium leading-snug">{task.text}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 text-sm text-muted underline hover:text-ink"
        >
          Ny opgave
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {turns.map((t, i) => (
          <Bubble key={i} role={t.role} isExplain={isExplain}>{t.content}</Bubble>
        ))}
        {streaming && partial && (
          <Bubble role="assistant" isExplain={isExplain}>{partial}</Bubble>
        )}
        {streaming && !partial && (
          <Bubble role="assistant" isExplain={isExplain}>
            <span className="inline-block animate-pulse text-muted">…</span>
          </Bubble>
        )}

        {/* Explain mode: after first response show action buttons */}
        {firstExplainDone && !completed && (
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={() => onComplete(turns)}
              className="rounded-btn border border-ink/15 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas"
            >
              Prøv nu selv 🙌
            </button>
            <button
              type="button"
              onClick={onSwitchToHint}
              className="rounded-btn bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              Jeg har stadig brug for hjælp 💡
            </button>
          </div>
        )}

        {/* Done celebration */}
        {completed && (
          <div className="flex flex-col items-center gap-3 rounded-card bg-blue-tint/60 px-6 py-8 text-center">
            <span className="text-4xl">🎉</span>
            <p className="text-lg font-bold text-ink" style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}>
              Flot arbejde!
            </p>
            <p className="text-sm text-muted">Du kom igennem opgaven. Det er præcis sådan man lærer.</p>
            <button
              type="button"
              onClick={onReset}
              className="mt-2 rounded-btn bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              Tag en ny opgave
            </button>
          </div>
        )}
      </div>

      {/* Input area */}
      {!completed && (
        <div className="border-t border-ink/5 px-6 py-4">
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

          <div className="flex items-center gap-3">
            <form onSubmit={send} className="flex flex-1 items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={isExplain ? "Spørg om noget du ikke forstod …" : "Skriv et svar eller et spørgsmål …"}
                disabled={streaming || atLimit}
                className="flex-1 rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-canvas/60"
              />
              <button
                type="submit"
                disabled={streaming || atLimit || !input.trim()}
                className="rounded-btn bg-primary px-5 py-2.5 text-[15px] font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
              >
                Send
              </button>
            </form>
            {/* "I'm done" button — always available after first AI response */}
            {assistantTurns >= 1 && !atLimit && (
              <button
                type="button"
                onClick={() => onComplete(turns)}
                title="Jeg er færdig med opgaven"
                className="shrink-0 rounded-btn border border-success/30 bg-success/10 px-3 py-2.5 text-xs font-semibold text-success transition hover:bg-success/20"
              >
                Færdig ✓
              </button>
            )}
          </div>
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
      <div className={`max-w-[80%] rounded-card px-4 py-3 text-[15px] leading-relaxed ${
        isUser ? "bg-primary text-white" : isExplain ? "bg-blue-tint/70 text-ink" : "bg-blue-tint/60 text-ink"
      }`}>
        {children}
      </div>
    </div>
  )
}
