"use client"

import { useRef, useState } from "react"

const CoachIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

export function CoachPanel({
  childName,
  grade,
}: {
  childName?: string
  grade?: number
}) {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const answerRef = useRef<HTMLDivElement>(null)

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || streaming) return

    setSubmitted(true)
    setAnswer("")
    setStreaming(true)

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, childName, grade }),
      })
      const reader = res.body?.getReader()
      if (!reader) throw new Error("no stream")
      const decoder = new TextDecoder()
      let acc = ""
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setAnswer(acc)
        answerRef.current?.scrollTo({ top: answerRef.current.scrollHeight })
      }
    } finally {
      setStreaming(false)
    }
  }

  function reset() {
    setQuestion("")
    setAnswer("")
    setSubmitted(false)
    setStreaming(false)
  }

  return (
    <div
      className="rounded-card bg-white p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-tint text-blue-soft">
          {CoachIcon}
        </span>
        <div>
          <h3 className="font-semibold text-ink">Spørg en pædagogisk assistent</h3>
          <p className="text-xs text-muted">Få råd til at hjælpe{childName ? ` ${childName}` : " dit barn"} derhjemme</p>
        </div>
      </div>

      {!submitted ? (
        <form onSubmit={ask} className="mt-4 flex flex-col gap-3">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder={`Fx: "Hvordan forklarer jeg brøker for en ${grade ?? 4}. klasses elev?" eller "Hvad er den bedste måde at læse højt med sit barn?"`}
            rows={3}
            className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-[15px] leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <button
            type="submit"
            disabled={!question.trim()}
            className="self-start rounded-btn bg-primary px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-primary-hover disabled:opacity-50"
          >
            Spørg
          </button>
        </form>
      ) : (
        <div className="mt-4">
          <div className="mb-3 rounded-lg bg-canvas px-3.5 py-2.5 text-sm text-ink/70 italic">
            "{question}"
          </div>
          <div
            ref={answerRef}
            className="max-h-64 overflow-y-auto rounded-lg bg-blue-tint/40 px-4 py-4 text-[15px] leading-relaxed text-ink"
          >
            {answer || <span className="animate-pulse text-muted">Tænker …</span>}
          </div>
          {!streaming && (
            <button
              type="button"
              onClick={reset}
              className="mt-3 text-sm text-muted underline hover:text-ink"
            >
              Stil et nyt spørgsmål
            </button>
          )}
        </div>
      )}
    </div>
  )
}
