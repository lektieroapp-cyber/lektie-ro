"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import daMessages from "@/messages/da.json"
import { type Locale } from "@/lib/i18n/config"

const MESSAGES: Record<Locale, typeof daMessages> = { da: daMessages }

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"

function scorePassword(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 8) return 0
  let score = 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++
  if (pw.length >= 12) score++
  return Math.min(score, 3) as 0 | 1 | 2 | 3
}

export function SetPasswordForm({
  locale,
  next,
}: {
  locale: Locale
  next: string
}) {
  const m = MESSAGES[locale].welcome
  const authMsgs = MESSAGES[locale].auth
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle")
  const [error, setError] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setStatus("submitting")

    const { error: err } = await supabase.auth.updateUser({
      password,
      data: { password_set: true },
    })
    if (err) {
      const msg = err.message.toLowerCase()
      const isBreached =
        msg.includes("compromised") ||
        msg.includes("pwned") ||
        msg.includes("leaked") ||
        msg.includes("known") ||
        msg.includes("common") ||
        msg.includes("breach") ||
        msg.includes("found in")
      const isWeak =
        msg.includes("weak") ||
        msg.includes("short") ||
        msg.includes("characters")
      if (isBreached) {
        setError(authMsgs.errorCompromised)
      } else if (isWeak) {
        setError(authMsgs.errorWeak)
      } else {
        setError(m.genericError)
      }
      setStatus("error")
      return
    }

    router.replace(next)
  }

  async function onGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }

  const score = scorePassword(password)
  const strengthLabel =
    password.length === 0
      ? null
      : score <= 1
        ? authMsgs.strengthWeak
        : score === 2
          ? authMsgs.strengthOk
          : authMsgs.strengthStrong
  const strengthColor =
    score <= 1 ? "bg-coral-deep" : score === 2 ? "bg-amber-pill" : "bg-success"
  const strengthLabelColor =
    score <= 1 ? "text-coral-deep" : score === 2 ? "text-ink/70" : "text-success"

  return (
    <div
      className="rounded-card bg-white p-6 md:p-8"
      style={{ boxShadow: "var(--shadow-card-lg)" }}
    >
      <h1
        className="text-3xl font-bold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {m.title}
      </h1>
      <p className="mt-2 text-sm text-muted">{m.subtitle}</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink" htmlFor="pw-new">
            {m.passwordLabel}
          </label>
          <div className="relative">
            <input
              id="pw-new"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 pr-16 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-blue-soft hover:bg-blue-tint/50"
            >
              {show ? m.hidePassword : m.showPassword}
            </button>
          </div>
          {strengthLabel && (
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3].map(i => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= score ? strengthColor : "bg-ink/10"
                    }`}
                  />
                ))}
              </div>
              <span className={`text-xs font-semibold ${strengthLabelColor}`}>
                {strengthLabel}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-coral-deep/20 bg-coral-deep/8 px-4 py-3">
            <p className="text-sm font-medium text-coral-deep">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={status === "submitting" || password.length < 8}
          className="mt-2 w-full rounded-btn bg-primary px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "submitting" ? m.submitting : m.submit}
        </button>
      </form>

      {GOOGLE_ENABLED && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-ink/10" />
            {m.orDivider}
            <span className="h-px flex-1 bg-ink/10" />
          </div>
          <button
            type="button"
            onClick={onGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-[15px] font-medium text-ink hover:bg-canvas"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3-11.3-7.3l-6.5 5C9.5 39.7 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.1 4-3.8 5.3l6.2 5.2C41.3 35.4 44 30.1 44 24c0-1.2-.1-2.3-.4-3.5z" />
            </svg>
            {m.googleCta}
          </button>
          <p className="mt-2 text-center text-xs text-muted">{m.googleHint}</p>
        </>
      )}
    </div>
  )
}
