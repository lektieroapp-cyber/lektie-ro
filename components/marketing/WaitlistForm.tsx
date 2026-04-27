"use client"

import { useState } from "react"
import { type Locale } from "@/lib/i18n/config"
import daMessages from "@/messages/da.json"

type Status = "idle" | "submitting" | "success" | "duplicate" | "error"

const MESSAGES: Record<Locale, typeof daMessages> = {
  da: daMessages,
}

export function WaitlistForm({
  locale,
  variant = "stacked",
}: {
  locale: Locale
  /** "stacked": email on top, button below (default).
   *  "inline": single rounded pill — email left, button right. */
  variant?: "stacked" | "inline"
}) {
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

  if (variant === "inline") {
    return (
      <form onSubmit={onSubmit} noValidate className="w-full">
        <div className="flex w-full items-center gap-1 rounded-full border border-ink/10 bg-white p-1.5 shadow-[0_1px_0_rgba(31,45,26,0.04),0_8px_18px_-12px_rgba(31,45,26,0.18)] focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
          <span aria-hidden className="ml-3 inline-flex shrink-0 text-mint-deep">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </span>
          <label htmlFor="waitlist-email-inline" className="sr-only">
            {m.emailPlaceholder}
          </label>
          <input
            id="waitlist-email-inline"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={m.emailPlaceholder}
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[15px] text-ink placeholder:text-ink/45 focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="shrink-0 rounded-full bg-mint-deep px-5 py-2.5 text-[14px] font-bold text-white transition hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {status === "submitting" ? m.submitting : m.submit}
          </button>
        </div>
        {status === "error" && errorMsg && (
          <p className="mt-2 text-sm text-coral-deep">{errorMsg}</p>
        )}
      </form>
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
        className="w-full rounded-btn bg-primary px-6 py-3 text-[15px] font-bold text-ink transition hover:bg-primary-hover disabled:opacity-60"
      >
        {status === "submitting" ? m.submitting : m.submit}
      </button>
      {status === "error" && errorMsg && (
        <p className="text-sm text-coral-deep">{errorMsg}</p>
      )}
    </form>
  )
}
