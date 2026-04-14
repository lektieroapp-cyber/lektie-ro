"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import daMessages from "@/messages/da.json"
import { type Locale } from "@/lib/i18n/config"
import { Select } from "@/components/ui/Select"

const MESSAGES: Record<Locale, typeof daMessages> = { da: daMessages }

// `showSkip=true` on first-run dashboard only. On the Forældre Ro "add a
// child" page we hide it because the user has already committed to adding.
export function OnboardingForm({
  locale,
  showSkip = false,
}: {
  locale: Locale
  showSkip?: boolean
}) {
  const m = MESSAGES[locale].onboarding
  const router = useRouter()

  const [name, setName] = useState("")
  const [grade, setGrade] = useState<number | "">("")
  const [interests, setInterests] = useState("")
  const [specialNeeds, setSpecialNeeds] = useState("")
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle")

  function skip() {
    const maxAge = 60 * 60 * 24 * 30
    document.cookie = `lr_onboarding_skipped=1; path=/; max-age=${maxAge}; samesite=lax`
    router.refresh()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (grade === "") return
    setStatus("submitting")
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        grade,
        interests: interests.trim() || undefined,
        special_needs: specialNeeds.trim() || undefined,
      }),
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
        {m.title}
      </h2>
      <p className="mt-2 text-sm text-muted">{m.subtitle}</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="child-name" className="text-sm font-semibold text-ink">
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
          <label htmlFor="child-grade" className="text-sm font-semibold text-ink">
            {m.gradeLabel}
          </label>
          <Select
            id="child-grade"
            required
            value={grade}
            onChange={v => setGrade(v)}
            placeholder={m.gradePlaceholder}
            ariaLabel={m.gradeLabel}
            options={[
              { value: 0, label: m.gradeKindergarten },
              ...Array.from({ length: 10 }, (_, i) => i + 1).map(n => ({
                value: n,
                label: m.gradeOption.replace("{n}", String(n)),
              })),
            ]}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="child-interests" className="text-sm font-semibold text-ink">
            {m.interestsLabel}
          </label>
          <input
            id="child-interests"
            type="text"
            maxLength={200}
            value={interests}
            onChange={e => setInterests(e.target.value)}
            placeholder={m.interestsPlaceholder}
            className="rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-xs text-muted">{m.interestsHint}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="child-special-needs" className="text-sm font-semibold text-ink">
            {m.specialNeedsLabel}
          </label>
          <textarea
            id="child-special-needs"
            rows={3}
            maxLength={300}
            value={specialNeeds}
            onChange={e => setSpecialNeeds(e.target.value)}
            placeholder={m.specialNeedsPlaceholder}
            className="rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-[15px] resize-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-xs text-muted">{m.specialNeedsHint}</p>
        </div>

        <button
          type="submit"
          disabled={status === "submitting" || !name.trim() || grade === ""}
          className="mt-2 w-full rounded-btn bg-primary px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "submitting" ? m.submitting : m.submit}
        </button>

        {status === "error" && (
          <p className="text-sm text-coral-deep">{m.error}</p>
        )}
      </form>

      {showSkip && (
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
      )}
    </div>
  )
}
