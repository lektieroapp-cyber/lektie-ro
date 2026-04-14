"use client"

import { useEffect, useRef, useState } from "react"
import type { SolveResponse, Task, Turn } from "./types"

const MAX_TURNS = 8
const WARN_AT = 6

export function HintChat({
  task,
  solve,
  turns,
  setTurns,
  onComplete,
  onReset,
  completed,
}: {
  task: Task
  solve: SolveResponse
  turns: Turn[]
  setTurns: (fn: (prev: Turn[]) => Turn[]) => void
  onComplete: () => void
  onReset: () => void
  completed: boolean
}) {
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [partial, setPartial] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const kickedOff = useRef(false)

  const assistantTurns = turns.filter(t => t.role === "assistant").length
  const atLimit = assistantTurns >= MAX_TURNS

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

  // Kick off the first assistant turn automatically.
  useEffect(() => {
    if (kickedOff.current) return
    kickedOff.current = true
    callHint([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll as new content arrives.
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
      <header className="flex items-start justify-between gap-4 border-b border-ink/5 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">
            {solve.subject} · {solve.grade}. klasse
          </p>
          <p className="mt-1 text-ink font-medium">{task.text}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 text-sm text-muted underline hover:text-ink"
        >
          Ny opgave
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {turns.map((t, i) => (
          <Bubble key={i} role={t.role}>
            {t.content}
          </Bubble>
        ))}
        {streaming && partial && <Bubble role="assistant">{partial}</Bubble>}
        {streaming && !partial && (
          <Bubble role="assistant">
            <span className="inline-block animate-pulse text-muted">…</span>
          </Bubble>
        )}
      </div>

      <div className="border-t border-ink/5 px-6 py-4">
        {assistantTurns >= WARN_AT && !atLimit && (
          <p className="mb-3 text-xs text-coral-deep">
            Du er tæt på grænsen — få mere ud af sidste spørgsmål.
          </p>
        )}
        {atLimit && !completed && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-card bg-blue-tint/60 px-4 py-3 text-sm text-ink">
            <span>Du har nået grænsen for denne opgave. Godt arbejde!</span>
            <button
              type="button"
              onClick={onComplete}
              className="rounded-btn bg-success px-4 py-2 text-xs font-semibold text-white"
            >
              Afslut
            </button>
          </div>
        )}
        <form onSubmit={send} className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Skriv et svar eller et spørgsmål …"
            disabled={streaming || atLimit || completed}
            className="flex-1 rounded-card border border-ink/10 bg-white px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-canvas/60"
          />
          <button
            type="submit"
            disabled={streaming || atLimit || completed || !input.trim()}
            className="rounded-btn bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-card px-4 py-3 text-[15px] leading-relaxed ${
          isUser ? "bg-primary text-white" : "bg-blue-tint/60 text-ink"
        }`}
      >
        {children}
      </div>
    </div>
  )
}
