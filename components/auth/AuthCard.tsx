"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { type Locale } from "@/lib/i18n/config"
import daMessages from "@/messages/da.json"

type Mode = "login" | "signup"

const MESSAGES: Record<Locale, typeof daMessages> = { da: daMessages }

// Feature flag. Flip this to re-enable Google sign-in once we're ready.
// Controlled via env so you can still test the real flow locally by setting
// NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true in .env.local.
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"

export function AuthCard({
  mode,
  locale,
}: {
  mode: Mode
  locale: Locale
}) {
  const m = MESSAGES[locale].auth
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle")
  const [error, setError] = useState("")

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setStatus("submitting")

    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            `/${locale}/parent/dashboard`
          )}`,
        },
      })
      if (err) {
        setStatus("error")
        setError(
          err.message.toLowerCase().includes("registered") ? m.errorExists : m.errorGeneric
        )
        return
      }
      setStatus("sent")
      return
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setStatus("error")
      setError(m.errorCredentials)
      return
    }
    router.push(`/${locale}/parent/dashboard`)
    router.refresh()
  }

  async function handleGoogle() {
    setError("")
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          `/${locale}/parent/dashboard`
        )}`,
      },
    })
  }

  if (status === "sent") {
    return (
      <div className="rounded-card bg-white p-8 text-center" style={{ boxShadow: "var(--shadow-card-lg)" }}>
        <h2
          className="text-2xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {m.checkEmailTitle}
        </h2>
        <p className="mt-3 text-sm text-muted">
          {m.checkEmailBody.replace("{email}", email)}
        </p>
      </div>
    )
  }

  const title = mode === "login" ? m.loginTitle : m.signupTitle
  const subtitle = mode === "login" ? m.loginSubtitle : m.signupSubtitle
  const submitLabel = mode === "login" ? m.submitLogin : m.submitSignup

  return (
    <div className="rounded-card bg-white p-6 md:p-8" style={{ boxShadow: "var(--shadow-card-lg)" }}>
      <h1
        className="text-3xl font-bold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted">{subtitle}</p>

      <button
        type="button"
        onClick={GOOGLE_ENABLED ? handleGoogle : undefined}
        disabled={!GOOGLE_ENABLED}
        aria-disabled={!GOOGLE_ENABLED}
        title={!GOOGLE_ENABLED ? "Kommer snart" : undefined}
        className={`mt-6 flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-[15px] font-medium ${
          GOOGLE_ENABLED
            ? "border-ink/15 bg-white text-ink hover:bg-canvas cursor-pointer"
            : "border-ink/10 bg-canvas/50 text-muted cursor-not-allowed"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden className={GOOGLE_ENABLED ? "" : "opacity-50"}>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3-11.3-7.3l-6.5 5C9.5 39.7 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.1 4-3.8 5.3l6.2 5.2C41.3 35.4 44 30.1 44 24c0-1.2-.1-2.3-.4-3.5z" />
        </svg>
        <span>{m.google}</span>
        {!GOOGLE_ENABLED && (
          <span className="rounded-chip bg-muted/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Kommer snart
          </span>
        )}
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-ink/10" />
        {m.divider}
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      <form onSubmit={handleEmail} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink" htmlFor="auth-email">
            {m.email}
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink" htmlFor="auth-password">
            {m.password}
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          disabled={status === "submitting"}
          className="mt-2 w-full rounded-btn bg-primary px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "submitting" ? m.submitting : submitLabel}
        </button>

        {error && <p className="text-sm text-coral-deep">{error}</p>}
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? m.switchToSignup : m.switchToLogin}{" "}
        <Link
          href={mode === "login" ? `/${locale}` : `/${locale}/login`}
          className="text-blue-soft font-medium hover:underline"
        >
          {mode === "login" ? m.switchToSignupLink : m.switchToLoginLink}
        </Link>
      </p>
    </div>
  )
}
