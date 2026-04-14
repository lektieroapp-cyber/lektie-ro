"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import daMessages from "@/messages/da.json"
import { type Locale } from "@/lib/i18n/config"

const MESSAGES: Record<Locale, typeof daMessages> = { da: daMessages }

const AVATARS = ["🦊", "🐼", "🦁", "🐯", "🐸", "🦄", "🚀", "⚽️", "🎨", "📚", "🐙", "🌟"]

export function OnboardingForm({ locale }: { locale: Locale }) {
  const m = MESSAGES[locale].onboarding
  const router = useRouter()

  const [name, setName] = useState("")
  const [grade, setGrade] = useState<number>(3)
  const [avatar, setAvatar] = useState<string>(AVATARS[0])
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle")

  function skip() {
    // 30-day cookie; dashboard reads it server-side to bypass onboarding.
    const maxAge = 60 * 60 * 24 * 30
    document.cookie = `lr_onboarding_skipped=1; path=/; max-age=${maxAge}; samesite=lax`
    router.refresh()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("submitting")
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), grade, avatar_emoji: avatar }),
    })
    if (!res.ok) {
      setStatus("error")
      return
    }
    router.refresh()
  }

  return (
    <div
      className="rounded-card bg-white p-8 md:p-10"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h2
        className="text-3xl md:text-4xl font-bold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {m.welcomeTitle}
      </h2>
      <p className="mt-3 text-ink/75">{m.welcomeSub}</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="child-name" className="text-sm font-medium text-ink">
            {m.nameLabel}
          </label>
          <input
            id="child-name"
            type="text"
            required
            maxLength={40}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={m.namePlaceholder}
            className="rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="child-grade" className="text-sm font-medium text-ink">
            {m.gradeLabel}
          </label>
          <select
            id="child-grade"
            value={grade}
            onChange={e => setGrade(Number(e.target.value))}
            className="rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value={0}>{m.gradeKindergarten}</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>
                {m.gradeOption.replace("{n}", String(n))}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink">{m.avatarLabel}</span>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map(a => (
              <button
                type="button"
                key={a}
                onClick={() => setAvatar(a)}
                aria-pressed={avatar === a}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-xl transition ${
                  avatar === a
                    ? "border-primary bg-primary/10"
                    : "border-ink/10 bg-white hover:border-primary/40"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "submitting" || !name.trim()}
          className="mt-2 w-full rounded-btn bg-primary px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "submitting" ? m.submitting : m.submit}
        </button>

        {status === "error" && (
          <p className="text-sm text-coral-deep">{m.error}</p>
        )}
      </form>

      <div className="mt-6 border-t border-ink/5 pt-5 text-center">
        <button
          type="button"
          onClick={skip}
          className="text-sm font-medium text-muted underline hover:text-ink"
        >
          {m.skip}
        </button>
        <p className="mt-1 text-xs text-muted">{m.skipHint}</p>
      </div>
    </div>
  )
}
