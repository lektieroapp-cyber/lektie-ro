"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Status = "idle" | "submitting" | "success" | "duplicate" | "error"

export function InviteUserForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorDetail, setErrorDetail] = useState<string>("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("submitting")
    setErrorDetail("")
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    })
    const json = await res.json().catch(() => ({}))
    if (res.status === 409) {
      setStatus("duplicate")
      return
    }
    if (!res.ok) {
      setStatus("error")
      setErrorDetail(json.detail || json.error || "ukendt")
      return
    }
    setStatus("success")
    setEmail("")
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="invite-email" className="text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={e => {
              setEmail(e.target.value)
              if (status !== "idle" && status !== "submitting") setStatus("idle")
            }}
            placeholder="navn@example.dk"
            className="rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={status === "submitting" || !email.trim()}
          className="rounded-btn bg-primary px-6 py-2.5 text-[15px] font-bold text-ink transition hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "submitting" ? "Sender …" : "Inviter"}
        </button>
      </div>

      {status === "success" && (
        <p className="flex items-center gap-2 text-sm text-success">
          <span aria-hidden>✓</span>
          Invitation sendt.
        </p>
      )}
      {status === "duplicate" && (
        <p className="text-sm text-coral-deep">
          Der findes allerede en konto med denne email.
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-coral-deep">
          Fejl: <span className="font-mono text-xs">{errorDetail}</span>
        </p>
      )}
    </form>
  )
}
