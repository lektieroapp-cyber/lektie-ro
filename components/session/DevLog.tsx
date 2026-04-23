"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { subscribeDevLog, type DevEvent } from "./dev-log"
import type { HintMode, SolveResponse, Task, Turn } from "./types"

const MAX_EVENTS = 40

const KIND_META: Record<DevEvent["kind"], { color: string; label: string }> = {
  stage:     { color: "#8C7B9F", label: "STAGE" },
  upload:    { color: "#5C8BA8", label: "UPLOAD" },
  solve:     { color: "#3E8A6A", label: "SOLVE" },
  subject:   { color: "#3A5F7A", label: "SUBJECT" },
  task:      { color: "#556048", label: "TASK" },
  mode:      { color: "#8A4230", label: "MODE" },
  "turn-user": { color: "#1F2D1A", label: "→ USER" },
  "turn-ai":   { color: "#7ACBA2", label: "← AI" },
  "ai-error":  { color: "#C97962", label: "ERROR" },
  complete:  { color: "#4F8E6B", label: "DONE" },
  info:      { color: "#556048", label: "INFO" },
}

export function DevLog({
  stage,
  solve,
  task,
  mode,
  turns,
  completedTasks,
}: {
  stage: string
  solve: SolveResponse | null
  task: Task | null
  mode: HintMode | null
  turns: Turn[]
  completedTasks: number
}) {
  const [open, setOpen] = useState(true)
  const [events, setEvents] = useState<DevEvent[]>([])
  const [aiMode, setAiMode] = useState<"live" | "test" | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Subscribe to the event bus.
  useEffect(() => {
    return subscribeDevLog(ev => {
      setEvents(prev => {
        const next = [...prev, ev]
        return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next
      })
    })
  }, [])

  // Fetch current AI mode on mount + when stage changes (in case it flipped).
  useEffect(() => {
    let cancelled = false
    fetch("/api/ai-mode")
      .then(r => r.json())
      .then(d => { if (!cancelled) setAiMode(d.mode) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [stage])

  // Auto-scroll to latest event.
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [events])

  const turnCount = turns.length
  const aiTurnCount = useMemo(() => turns.filter(t => t.role === "assistant").length, [turns])

  return (
    <div
      className="fixed top-4 right-4 z-[60] font-mono text-[11px]"
      style={{ width: open ? 340 : 120 }}
    >
      <div
        className="flex cursor-pointer items-center justify-between rounded-t-lg bg-ink px-3 py-1.5 text-white"
        onClick={() => setOpen(o => !o)}
        title="Klik for at folde sammen"
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              aiMode === "live" ? "bg-coral-deep animate-pulse" : "bg-muted"
            }`}
          />
          <span className="text-[10px] font-bold tracking-wider">
            {open ? "DEV LOG" : "DEV"}
          </span>
          {aiMode && (
            <span
              className={`ml-1 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${
                aiMode === "live" ? "bg-coral-deep text-white" : "bg-white/15 text-white/80"
              }`}
            >
              {aiMode}
            </span>
          )}
        </span>
        <span className="text-white/60 text-[10px]">{open ? "⌃" : "⌄"}</span>
      </div>

      {open && (
        <div className="rounded-b-lg border border-ink/10 bg-white/95 backdrop-blur">
          {/* Current state */}
          <div className="border-b border-ink/5 px-3 py-2 leading-[1.6]">
            <Row k="stage" v={stage} color="#8C7B9F" />
            <Row k="subject" v={solve?.subject ?? "—"} color="#3A5F7A" />
            <Row k="grade" v={solve ? String(solve.grade) : "—"} color="#556048" />
            <Row
              k="task"
              v={task ? truncate(task.text, 42) : "—"}
              color="#3E8A6A"
            />
            <Row k="mode" v={mode ?? "—"} color="#8A4230" />
            <Row k="turns" v={`${aiTurnCount} / ${turnCount}`} color="#1F2D1A" />
            <Row k="done" v={String(completedTasks)} color="#4F8E6B" />
            {solve?.mocked && (
              <div className="mt-1 rounded bg-butter-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#556048]">
                MOCKED SOLVE
              </div>
            )}
          </div>

          {/* Event log */}
          <div
            ref={bodyRef}
            className="max-h-[240px] overflow-y-auto px-3 py-2 text-[10.5px] leading-[1.45]"
          >
            {events.length === 0 ? (
              <p className="text-muted italic">Ingen events endnu…</p>
            ) : (
              events.map(ev => {
                const meta = KIND_META[ev.kind]
                return (
                  <div key={ev.id} className="flex gap-1.5 py-0.5">
                    <span className="shrink-0 text-ink/40 tabular-nums">
                      {formatTime(ev.ts)}
                    </span>
                    <span
                      className="shrink-0 font-bold"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="min-w-0 break-words text-ink/85">
                      {ev.msg}
                      {ev.data && Object.keys(ev.data).length > 0 && (
                        <span className="ml-1 text-ink/45">
                          {Object.entries(ev.data)
                            .map(([k, v]) => `${k}=${formatValue(v)}`)
                            .join(" ")}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-ink/5 px-3 py-1.5 text-[10px] text-muted">
            <span>{events.length} events</span>
            <div className="flex items-center gap-2">
              <CopyConversationButton
                turns={turns}
                events={events}
                stage={stage}
                taskTitle={task?.text ?? null}
              />
              <button
                type="button"
                onClick={() => setEvents([])}
                className="cursor-pointer text-[10px] font-semibold text-muted hover:text-coral-deep"
              >
                Ryd
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ k, v, color }: { k: string; v: string; color: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-14 shrink-0 text-[10px] font-semibold uppercase" style={{ color }}>
        {k}
      </span>
      <span className="min-w-0 truncate text-ink/90">{v}</span>
    </div>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "null"
  if (typeof v === "string") return v.length > 20 ? v.slice(0, 19) + "…" : v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  return JSON.stringify(v).slice(0, 30)
}

// Copy-to-clipboard for the whole conversation so we can paste into a bug
// report and learn from stuck / broken sessions. Kept in-memory only —
// nothing persisted, nothing sent anywhere.
function CopyConversationButton({
  turns,
  events,
  stage,
  taskTitle,
}: {
  turns: Turn[]
  events: DevEvent[]
  stage: string
  taskTitle: string | null
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const header = `=== LektieRo session log ===
timestamp: ${new Date().toISOString()}
stage: ${stage}
task: ${taskTitle ?? "(none)"}
turns: ${turns.length}
events: ${events.length}
`

    const turnsBlock = turns.length === 0
      ? "\n(no conversation yet)\n"
      : "\n--- CONVERSATION ---\n" +
        turns
          .map((t, i) => {
            const who = t.role === "assistant" ? "DANI" : "KID "
            return `\n[${String(i + 1).padStart(2, "0")}] ${who}\n${t.content.trim()}\n`
          })
          .join("")

    const eventsBlock = events.length === 0
      ? ""
      : "\n--- EVENTS ---\n" +
        events
          .map(ev => {
            const time = formatTime(ev.ts)
            const data = ev.data
              ? " " +
                Object.entries(ev.data)
                  .map(([k, v]) => `${k}=${formatValue(v)}`)
                  .join(" ")
              : ""
            return `[${time}] ${ev.kind.toUpperCase().padEnd(10)} ${ev.msg}${data}`
          })
          .join("\n") +
        "\n"

    const text = header + turnsBlock + eventsBlock

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API blocked (insecure origin etc) — fall back to a
      // temporary textarea so the admin can still manually copy.
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand("copy")
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      } catch {}
      document.body.removeChild(ta)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`cursor-pointer text-[10px] font-semibold ${
        copied ? "text-mint-deep" : "text-muted hover:text-ink"
      }`}
      title="Kopiér hele samtalen + events som tekst"
    >
      {copied ? "✓ Kopieret" : "Kopiér log"}
    </button>
  )
}
