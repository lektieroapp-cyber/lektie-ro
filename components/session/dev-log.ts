"use client"

// Tiny event bus for the admin-only DevLog overlay. Any component in the
// kid flow can push an event; the overlay subscribes and shows the last N.
// Ephemeral — no persistence, no server calls. Zero cost in prod (admin-gated).

export type DevEventKind =
  | "stage"       // stage transition (e.g. idle → thinking)
  | "upload"      // file uploaded to storage
  | "solve"       // /api/solve returned
  | "subject"     // subject picked / corrected
  | "task"        // task picked
  | "mode"        // hint mode picked
  | "turn-user"   // kid sent a message
  | "turn-ai"     // AI turn finished streaming
  | "ai-error"    // stream failed / fell back
  | "complete"    // task completed
  | "info"        // free-form note

export type DevEvent = {
  id: number
  ts: number
  kind: DevEventKind
  msg: string
  /** optional structured payload rendered as JSON in the overlay */
  data?: Record<string, unknown>
}

const listeners = new Set<(e: DevEvent) => void>()
let nextId = 1

export function logDevEvent(kind: DevEventKind, msg: string, data?: Record<string, unknown>) {
  const e: DevEvent = { id: nextId++, ts: Date.now(), kind, msg, data }
  listeners.forEach(fn => fn(e))
}

export function subscribeDevLog(fn: (e: DevEvent) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
