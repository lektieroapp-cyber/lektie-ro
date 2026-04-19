"use client"

import { useEffect, useRef, useState } from "react"
import { Companion, Sparkles } from "@/components/mascot/Companion"
import { useCompanion } from "@/components/mascot/CompanionContext"
import { companionByType, DEFAULT_COMPANION } from "@/components/mascot/types"
import { IdeaIcon } from "@/components/icons/ModeIcons"
import { logDevEvent } from "./dev-log"
import { K } from "./design-tokens"
import type { HintMode, SolveResponse, Task, Turn } from "./types"

const MAX_TURNS = 8
const WARN_AT = 6

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
    const start = performance.now()
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
        acc += decoder.decode(value, { stream: true })
        setPartial(acc)
      }
      setTurns(prev => [...prev, { role: "assistant", content: acc }])
      setPartial("")
      logDevEvent("turn-ai", acc.slice(0, 80) + (acc.length > 80 ? "…" : ""), {
        chars: acc.length,
        ms: Math.round(performance.now() - start),
        mocked,
      })
    } catch (err) {
      logDevEvent("ai-error", `Hint fejlede: ${(err as Error).message}`)
    } finally {
      setStreaming(false)
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
    const hintText = "Jeg er stadig lidt i tvivl — kan jeg få et lille hint?"
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

  const pipCount = Math.max(3, Math.min(5, assistantTurns + 1))

  return (
    <div
      style={{
        fontFamily: K.sans,
        color: K.ink,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
        background: K.bg,
      }}
    >
      {/* Task pill at top with step pips */}
      <div
        style={{
          padding: "10px 18px 14px",
          borderBottom: "1px solid rgba(31,27,51,0.06)",
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
          <div style={{ flex: 1, height: 1, background: "rgba(31,27,51,0.08)" }} />
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: pipCount }).map((_, i) => {
              const past = i < assistantTurns
              const current = i === assistantTurns && !completed
              return (
                <div
                  key={i}
                  style={{
                    width: current ? 18 : 6,
                    height: 6,
                    borderRadius: 999,
                    background: past ? K.mint : current ? K.coral : "#E5DFD1",
                    transition: "all 0.3s",
                  }}
                />
              )
            })}
          </div>
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

      {/* Scrollable conversation */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "18px 18px 10px",
        }}
      >
        {turns.map((t, i) =>
          t.role === "assistant" ? (
            <DaniMessage key={i}>{t.content}</DaniMessage>
          ) : (
            <UserMessage key={i}>{t.content}</UserMessage>
          )
        )}
        {streaming && partial && <DaniMessage>{partial}</DaniMessage>}
        {streaming && !partial && <DaniTyping />}
      </div>

      {/* Bottom input + action bar */}
      <div
        style={{
          padding: "12px 16px 18px",
          borderTop: "1px solid rgba(31,27,51,0.06)",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {firstExplainDone ? (
          // Explain mode: after first reply, choose path
          <div style={{ display: "flex", gap: 10 }}>
            <BigBtn tone="ghost" onClick={() => onComplete(turns)} style={{ flex: 1 }}>
              Prøv nu selv
            </BigBtn>
            <BigBtn tone="coral" onClick={onSwitchToHint} style={{ flex: 1 }}>
              Jeg har brug for hjælp
            </BigBtn>
          </div>
        ) : atLimit ? (
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
                  Jeg har det!
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

function DaniMessage({ children }: { children: React.ReactNode }) {
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
        {typeof children === "string" ? <RichText text={children} /> : children}
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
        <Companion type={type ?? DEFAULT_COMPANION} mood="thinking" size={44} thinking />
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
      }}
    >
      {/* Soft radial glow behind the companion — fades to the surrounding
          page canvas so there's no visible panel edge on desktop. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 520px 380px at 50% 28%, ${K.butterSoft} 0%, var(--color-canvas) 80%)`,
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
            Og det bedste — <b>du</b> fandt svaret. Jeg viste dig bare stierne.
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

