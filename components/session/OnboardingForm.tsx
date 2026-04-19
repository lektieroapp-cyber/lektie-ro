"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import daMessages from "@/messages/da.json"
import { type Locale } from "@/lib/i18n/config"
import { Select } from "@/components/ui/Select"
import { AvatarButton, AvatarPickerModal } from "@/components/children/AvatarPicker"
import { DEFAULT_COMPANION, type CompanionType } from "@/components/mascot/types"

const MESSAGES: Record<Locale, typeof daMessages> = { da: daMessages }

export function OnboardingForm({ locale }: { locale: Locale }) {
  const m = MESSAGES[locale].onboarding
  const router = useRouter()

  const [companion, setCompanion] = useState<CompanionType>(DEFAULT_COMPANION)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [name, setName] = useState("")
  const [grade, setGrade] = useState<number | "">("")
  const [interests, setInterests] = useState("")
  const [specialNeeds, setSpecialNeeds] = useState("")
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle")

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
        companion_type: companion,
        interests: interests.trim() || undefined,
        special_needs: specialNeeds.trim() || undefined,
      }),
    })
    if (!res.ok) {
      setStatus("error")
      return
    }
    router.push(`/${locale}/parent/profiles`)
  }

  return (
    <div
      className="rounded-card bg-white p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h2
        className="text-2xl font-bold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {m.title}
      </h2>
      <p className="mt-1 text-sm text-muted">{m.subtitle}</p>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">

        {/* Avatar + name on same row */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              {m.avatarLabel}
            </label>
            <AvatarButton value={companion} onClick={() => setAvatarOpen(true)} />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label htmlFor="child-name" className="text-xs font-semibold uppercase tracking-wide text-muted">
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
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {avatarOpen && (
          <AvatarPickerModal
            value={companion}
            onChange={setCompanion}
            onClose={() => setAvatarOpen(false)}
          />
        )}

        {/* Grade */}
        <div className="flex flex-col gap-1">
          <label htmlFor="child-grade" className="text-xs font-semibold uppercase tracking-wide text-muted">
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

        {/* Interests + special needs side by side on wider screens */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="child-interests" className="text-xs font-semibold uppercase tracking-wide text-muted">
              {m.interestsLabel}
            </label>
            <input
              id="child-interests"
              type="text"
              maxLength={200}
              value={interests}
              onChange={e => setInterests(e.target.value)}
              placeholder={m.interestsPlaceholder}
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="child-special-needs" className="text-xs font-semibold uppercase tracking-wide text-muted">
              {m.specialNeedsLabel}
            </label>
            <input
              id="child-special-needs"
              type="text"
              maxLength={300}
              value={specialNeeds}
              onChange={e => setSpecialNeeds(e.target.value)}
              placeholder={m.specialNeedsPlaceholder}
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "submitting" || !name.trim() || grade === ""}
          className="w-full cursor-pointer rounded-btn bg-primary px-6 py-2.5 text-[14px] font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "submitting" ? m.submitting : m.submit}
        </button>

        {status === "error" && (
          <p className="text-sm text-coral-deep">{m.error}</p>
        )}
      </form>
    </div>
  )
}
