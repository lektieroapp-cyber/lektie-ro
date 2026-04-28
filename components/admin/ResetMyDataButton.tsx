"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

// Localhost-only quick-reset for the logged-in admin's own tasks +
// sessions. Mirrors `scripts/reset-user-tasks.mjs` so the admin can
// re-test the upload → bundle → tutor flow without leaving the app.
// Server-side endpoint enforces NODE_ENV=development; this button is
// also only rendered from the admin page when dev-mode, but the
// endpoint check is the actual gate.

export function ResetMyDataButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function reset() {
    if (!confirm(
      "Slet alle dine egne opgaver + sessions?\n\n" +
      "Profil + børn + abonnement bevares. Du kan teste flowet fra " +
      "scratch bagefter.",
    )) return
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/reset-my-tasks", { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        setResult(`Fejl: ${json.error ?? res.status}`)
        return
      }
      setResult(`Slettede ${json.tasksDeleted} opgaver og ${json.sessionsDeleted} sessions.`)
      router.refresh()
    } catch (err) {
      setResult(`Fejl: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={reset}
        disabled={busy}
        className="rounded-btn border border-clay/30 bg-white px-4 py-2 text-sm font-semibold text-clay transition hover:bg-clay/10 cursor-pointer disabled:opacity-50"
      >
        {busy ? "Sletter …" : "Nulstil mine opgaver + sessions"}
      </button>
      {result && (
        <span className="text-sm text-ink/70">{result}</span>
      )}
    </div>
  )
}
