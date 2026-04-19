"use client"

import { useEffect, useRef, useState } from "react"
import { Companion, Sparkles } from "@/components/mascot/Companion"
import { useCompanion } from "@/components/mascot/CompanionContext"
import { companionByType, DEFAULT_COMPANION } from "@/components/mascot/types"
import { IdeaIcon } from "@/components/icons/ModeIcons"
import { renderWithBlocks } from "./blocks/parse"
import { logDevEvent } from "./dev-log"
import { K } from "./design-tokens"
import type { HintMode, SolveResponse, Task, Turn } from "./types"

const MAX_TURNS = 25
const WARN_AT = 20
// Minimum time the typing dots show before any text renders — makes Azure's
// fast-start responses feel less abrupt + gives the "Dani er ved at tænke" beat.
const MIN_THINKING_MS = 700

function aiTurnsBefore(turns: Turn[]): number {
  return turns.filter(t => t.role === "assistant").length
}

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
  completed: boolean
}) {
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [partial, setPartial] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inflightRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const assistantTurns = turns.filter(t => t.role === "assistant").length
  const atLimit = assistantTurns >= MAX_TURNS
  const isExplain = mode === "explain"

  async function callHint(nextTurns: Turn[]) {
    if (inflightRef.current) return
    inflightRef.current = true
    setStreaming(true)
    setPartial("")
    const start = performance.now()
    logDevEvent("info", "→ /api/hint", {
      subject: solve.subject,
      mode,
      turn: aiTurnsBefore(nextTurns) + 1,
      chars: nextTurns.reduce((n, t) => n + t.content.length, 0),
    })

    // Buffer any bytes that arrive before MIN_THINKING_MS so the typing dots
    // always show for at least that long. Once the gate is open, commit the
    // buffer and stream the rest as it arrives.
    let buffered = ""
    let gateOpen = false
    let firstTokenAt: number | null = null
    const gateTimer = window.setTimeout(() => {
      gateOpen = true
      if (buffered) setPartial(buffered)
    }, MIN_THINKING_MS)

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
      const mocked = res.headers.get("X-Mocked") === "1"
      const reader = res.body?.getReader()
      if (!reader) throw new Error("no stream")
      const decoder = new TextDecoder()
      let acc = ""
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        acc += chunk
        if (firstTokenAt === null) {
          firstTokenAt = Math.round(performance.now() - start)
          logDevEvent("info", "first token", { ms: firstTokenAt })
        }
        if (gateOpen) {
          setPartial(acc)
        } else {
          buffered = acc
        }
      }
      window.clearTimeout(gateTimer)

      // Respect the min-thinking-time even if the stream finished early —
      // otherwise typing dots flash then disappear on fast Azure responses.
      const elapsed = performance.now() - start
      if (elapsed < MIN_THINKING_MS) {
        await new Promise(r => setTimeout(r, MIN_THINKING_MS - elapsed))
      }

      // Batched: all three state updates in one synchronous tick so React
      // renders exactly once — no intermediate "streaming=true, partial=''"
      // state that would flash the typing dots.
      setTurns(prev => [...prev, { role: "assistant", content: acc }])
      setPartial("")
      setStreaming(false)

      const totalMs = Math.round(performance.now() - start)
      const wordCount = acc.split(/\s+/).filter(Boolean).length
      logDevEvent("turn-ai", acc.slice(0, 80) + (acc.length > 80 ? "…" : ""), {
        chars: acc.length,
        words: wordCount,
        firstTokenMs: firstTokenAt ?? -1,
        totalMs,
        mocked,
      })
      if (wordCount > 70) {
        logDevEvent("ai-error", "⚠ Over 70-ord grænse", { words: wordCount })
      }
    } catch (err) {
      window.clearTimeout(gateTimer)
      setStreaming(false)
      setPartial("")
      logDevEvent("ai-error", `Hint fejlede: ${(err as Error).message}`)
    } finally {
      inflightRef.current = false
    }
  }

  // Kick off first AI message on mount / mode change.
  useEffect(() => {
    if (turns.length === 0) {
      callHint([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [turns, partial])

  // Re-focus the input as soon as streaming finishes so the kid can type the
  // next answer without clicking. `disabled` strips focus on submit, so we
  // restore it here. Skipped when atLimit (the input is gone).
  useEffect(() => {
    if (streaming || atLimit) return
    inputRef.current?.focus()
  }, [streaming, atLimit])

  // Answer from an inline [tryit] block in a Dani bubble — same path as
  // typing in the main input, just sourced from the inline field.
  async function submitAnswer(text: string) {
    const trimmed = text.trim()
    if (!trimmed || streaming || atLimit) return
    const next: Turn[] = [...turns, { role: "user", content: trimmed }]
    setTurns(() => next)
    logDevEvent("turn-user", `[tryit] ${trimmed.slice(0, 60)}`)
    await callHint(next)
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || streaming || atLimit) return
    setInput("")
    const next: Turn[] = [...turns, { role: "user", content: text }]
    setTurns(() => next)
    logDevEvent("turn-user", text.slice(0, 80))
    await callHint(next)
  }

  async function askHint() {
    if (streaming || atLimit) return
    const hintText = "Jeg er stadig lidt i tvivl. Kan jeg få et lille hint?"
    const next: Turn[] = [
      ...turns,
      { role: "user", content: hintText },
    ]
    setTurns(() => next)
    logDevEvent("turn-user", "Hint bedt om", { level: aiTurnsBefore(turns) + 1 })
    await callHint(next)
  }

  // Completion screen → celebration
  if (completed) {
    return (
      <CelebrationPanel
        onMoreHomework={onMoreHomework}
        onFinishSession={onFinishSession}
      />
    )
  }

  // Render turns + any in-flight partial as a single list with stable keys.
  // When the stream completes and the partial flips over to `turns`, the
  // bubble at position `turns.length` keeps its key and just changes content.
  // No unmount/remount = no jump.
  const renderTurns: Turn[] =
    streaming && partial
      ? [...turns, { role: "assistant", content: partial }]
      : turns

  return (
    <div
      className="lr-hint-chat"
      style={{
        fontFamily: K.sans,
        color: K.ink,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        margin: "0 auto",
        background: K.bg,
        borderRadius: 24,
        boxShadow:
          "0 1px 0 rgba(31,27,51,0.04), 0 20px 48px -16px rgba(31,27,51,0.14)",
        border: "1px solid rgba(31,27,51,0.04)",
        overflow: "hidden",
      }}
    >
      {/* Task pill at top */}
      <div
        style={{
          padding: "14px 22px 16px",
          borderBottom: "1px solid rgba(31,27,51,0.06)",
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: K.ink2,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          Opgave
        </div>
        <div
          style={{
            fontFamily: K.serif,
            fontSize: 20,
            fontWeight: 600,
            color: K.ink,
            marginTop: 4,
            lineHeight: 1.25,
          }}
        >
          {task.text}
        </div>
      </div>

      {/* Scrollable conversation — render turns + pending-partial as one
          list so the streaming bubble keeps its React key when it commits
          to turns (prevents the "jump" on stream-end). */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "22px 22px 14px",
        }}
      >
        {renderTurns.map((t, i) =>
          t.role === "assistant" ? (
            <DaniMessage key={i} content={t.content} onAnswer={submitAnswer} />
          ) : (
            <UserMessage key={i}>{t.content}</UserMessage>
          )
        )}
        {streaming && !partial && <DaniTyping />}
      </div>

      {/* Bottom input + action bar */}
      <div
        style={{
          padding: "14px 22px 22px",
          borderTop: "1px solid rgba(31,27,51,0.06)",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {atLimit ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              background: K.skySoft,
              borderRadius: 14,
              padding: "12px 14px",
              fontSize: 13,
              color: K.ink,
            }}
          >
            <span>Du har gjort det flot. Klar til at afslutte?</span>
            <button
              type="button"
              onClick={() => onComplete(turns)}
              style={{
                border: "none",
                background: K.coral,
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                padding: "8px 14px",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Afslut
            </button>
          </div>
        ) : (
          <>
            {!isExplain && assistantTurns >= WARN_AT && (
              <p style={{ margin: 0, fontSize: 12, color: K.coral }}>
                Du er tæt på grænsen. Få mere ud af dit næste svar.
              </p>
            )}
            <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={isExplain ? "Spørg om noget …" : "Skriv dit svar …"}
                disabled={streaming}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 46,
                  border: `1.5px solid rgba(31,27,51,0.1)`,
                  background: streaming ? "rgba(31,27,51,0.03)" : "#fff",
                  borderRadius: 12,
                  padding: "0 14px",
                  fontSize: 16,
                  fontWeight: 500,
                  fontFamily: K.sans,
                  color: K.ink,
                  outline: "none",
                  transition: "all 0.2s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = K.coral)}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(31,27,51,0.1)")}
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                style={{
                  height: 46,
                  padding: "0 18px",
                  borderRadius: 12,
                  border: "none",
                  background: input.trim() && !streaming ? K.ink : "#D8D3C4",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: input.trim() && !streaming ? "pointer" : "default",
                  fontFamily: "inherit",
                  transition: "background 0.2s",
                }}
              >
                Send
              </button>
            </form>

            <div style={{ display: "flex", gap: 10 }}>
              <BigBtn
                tone="ghost"
                onClick={askHint}
                style={{ flex: 1 }}
                icon={<IdeaIcon size={18} color={K.ink} />}
                disabled={streaming}
              >
                {assistantTurns <= 1 ? "Giv mig et hint" : "Endnu et hint"}
              </BigBtn>
              {assistantTurns >= 1 && (
                <BigBtn tone="coral" onClick={() => onComplete(turns)} style={{ flex: 1 }}>
                  Opgave løst ✓
                </BigBtn>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Message bubbles ──────────────────────────────────────────────────────

function DaniMessage({
  content,
  onAnswer,
}: {
  content: string
  onAnswer?: (value: string) => void
}) {
  const { type } = useCompanion()
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
      <div style={{ flexShrink: 0 }}>
        <Companion type={type ?? DEFAULT_COMPANION} mood="happy" size={44} />
      </div>
      <div
        style={{
          background: K.skySoft,
          borderRadius: "4px 18px 18px 18px",
          padding: "12px 14px",
          color: K.ink,
          fontSize: 15,
          lineHeight: 1.5,
          animation: "pop 0.35s",
          maxWidth: "85%",
        }}
      >
        {renderWithBlocks(content, onAnswer)}
      </div>
    </div>
  )
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          background: K.coral,
          color: "#fff",
          borderRadius: "18px 18px 4px 18px",
          padding: "10px 14px",
          fontSize: 15,
          lineHeight: 1.5,
          maxWidth: "85%",
          boxShadow: "0 4px 12px -6px rgba(232,132,106,0.6)",
        }}
      >
        {typeof children === "string" ? <RichText text={children} /> : children}
      </div>
    </div>
  )
}

function DaniTyping() {
  const { type } = useCompanion()
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
      <div style={{ flexShrink: 0 }}>
        <Companion type={type ?? DEFAULT_COMPANION} mood="thinking" size={44} />
      </div>
      <div
        style={{
          background: K.skySoft,
          borderRadius: "4px 18px 18px 18px",
          padding: "14px 16px",
          display: "inline-flex",
          gap: 5,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: 999,
              background: "rgba(31,27,51,0.4)",
              animation: "loading-dot 1.4s ease-in-out infinite",
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Shared button ───────────────────────────────────────────────────────

function BigBtn({
  children,
  onClick,
  tone = "coral",
  style = {},
  icon,
  disabled = false,
}: {
  children: React.ReactNode
  onClick: () => void
  tone?: "coral" | "ghost" | "ink"
  style?: React.CSSProperties
  icon?: React.ReactNode
  disabled?: boolean
}) {
  const bg = tone === "coral" ? K.coral : tone === "ink" ? K.ink : "#fff"
  const fg = tone === "ghost" ? K.ink : "#fff"
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#D8D3C4" : bg,
        color: disabled ? "rgba(31,27,51,0.5)" : fg,
        border: tone === "ghost" ? `1.5px solid ${K.ink}20` : "none",
        height: 48,
        borderRadius: 999,
        padding: "0 20px",
        fontFamily: "inherit",
        fontSize: 15,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow:
          tone === "coral" && !disabled
            ? "0 6px 16px -6px rgba(232,132,106,0.6), inset 0 -2px 0 rgba(0,0,0,0.08)"
            : "none",
        transition: "transform 0.12s ease",
        ...style,
      }}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      {icon}
      {children}
    </button>
  )
}

// ─── Markdown-ish rendering ──────────────────────────────────────────────

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
                return (
                  <strong key={j} style={{ fontWeight: 700 }}>
                    {part.slice(2, -2)}
                  </strong>
                )
              }
              return <span key={j}>{part}</span>
            })}
          </span>
        )
      })}
    </>
  )
}

// ─── Celebration screen (prototype-matched) ──────────────────────────────

function CelebrationPanel({
  onMoreHomework,
  onFinishSession,
}: {
  onMoreHomework: () => void
  onFinishSession: () => void
}) {
  const { type } = useCompanion()
  const companionType = type ?? DEFAULT_COMPANION
  const companion = companionByType(companionType)
  const confettiColors = [K.coral, K.butter, K.sky, K.mint, K.plum, companion.accent]
  return (
    <div
      style={{
        fontFamily: K.sans,
        color: K.ink,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        height: "100%",
        width: "100%",
        padding: "40px 24px 32px",
        position: "relative",
        overflow: "hidden",
        // Match HintChat's card treatment so the done screen sits in the
        // same rounded panel on desktop. On mobile the parent gives it full
        // width, so the card corners still "fit" the viewport.
        background: K.bg,
        borderRadius: 24,
        boxShadow:
          "0 1px 0 rgba(31,27,51,0.04), 0 20px 48px -16px rgba(31,27,51,0.14)",
        border: "1px solid rgba(31,27,51,0.04)",
      }}
    >
      {/* Soft radial glow behind the companion — fades INTO the card bg
          (K.bg) so the gradient edge is invisible against the panel. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 520px 380px at 50% 28%, ${K.butterSoft} 0%, ${K.bg} 80%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: -20,
            left: `${(i * 37) % 100}%`,
            width: 8,
            height: 12,
            borderRadius: 2,
            background: confettiColors[i % confettiColors.length],
            animation: `fall ${2 + (i % 3) * 0.4}s ${i * 0.08}s linear infinite`,
            transform: `rotate(${i * 23}deg)`,
          }}
        />
      ))}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ position: "relative" }}>
          <Sparkles count={8} color={companion.accent} />
          <Companion type={companionType} mood="cheer" size={140} bobbing />
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: K.serif,
              fontSize: 32,
              fontWeight: 700,
              color: K.ink,
              letterSpacing: -0.5,
            }}
          >
            Du klarede det!
          </div>
          <div
            style={{
              fontSize: 15,
              color: K.ink2,
              marginTop: 8,
              maxWidth: 260,
              lineHeight: 1.4,
            }}
          >
            Og det bedste: <b>du</b> fandt svaret. Jeg viste dig bare stierne.
          </div>
        </div>

      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: "100%",
          maxWidth: 420,
          zIndex: 1,
        }}
      >
        <BigBtn tone="coral" onClick={onMoreHomework} style={{ width: "100%" }}>
          Næste opgave
        </BigBtn>
        <BigBtn tone="ghost" onClick={onFinishSession} style={{ width: "100%" }}>
          Jeg er færdig for i dag
        </BigBtn>
      </div>
    </div>
  )
}

