"use client"

import { useState } from "react"
import { type Locale } from "@/lib/i18n/config"
import daMessages from "@/messages/da.json"

type Status = "idle" | "submitting" | "success" | "duplicate" | "error"

const MESSAGES: Record<Locale, typeof daMessages> = {
  da: daMessages,
}

export function WaitlistForm({ locale }: { locale: Locale }) {
  const m = MESSAGES[locale].waitlist
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState<string>("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg("")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error")
      setErrorMsg(m.errorEmail)
      return
    }
    setStatus("submitting")
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus("error")
        setErrorMsg(m.errorGeneric)
        return
      }
      if (json.alreadyJoined) {
        setStatus("duplicate")
        return
      }
      setStatus("success")
    } catch {
      setStatus("error")
      setErrorMsg(m.errorGeneric)
    }
  }

  if (status === "success" || status === "duplicate") {
    const title = status === "success" ? m.successTitle : m.duplicateTitle
    const body = status === "success" ? m.successBody : m.duplicateBody
    return (
      <div className="rounded-card bg-canvas p-5 text-center">
        <p className="text-lg font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm text-muted">{body}</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <label htmlFor="waitlist-email" className="sr-only">
        {m.emailPlaceholder}
      </label>
      <input
        id="waitlist-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder={m.emailPlaceholder}
        className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-btn bg-primary px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
      >
        {status === "submitting" ? m.submitting : m.submit}
      </button>
      {status === "error" && errorMsg && (
        <p className="text-sm text-coral-deep">{errorMsg}</p>
      )}
    </form>
  )
}
