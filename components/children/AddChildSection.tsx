"use client"

import { useState } from "react"
import { OnboardingForm } from "@/components/session/OnboardingForm"
import { type Locale } from "@/lib/i18n/config"

const TIER_UPGRADE: Record<string, string> = {
  standard: "Opgrader til Familie-abonnementet for at tilføje op til 4 børn.",
  free: "Du har ikke et aktivt abonnement.",
}

export function AddChildSection({
  locale,
  atLimit,
  tier,
  isAdmin,
}: {
  locale: Locale
  atLimit: boolean
  tier: string
  isAdmin: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  if (atLimit && !isAdmin) {
    return (
      <div className="rounded-card border border-dashed border-ink/15 bg-white/60 p-5 text-center">
        <p className="text-[14px] font-semibold text-ink">Maksimalt antal børn nået</p>
        <p className="mt-1 text-[13px] text-muted">
          {TIER_UPGRADE[tier] ?? "Opgrader dit abonnement for at tilføje flere børn."}
        </p>
        <button type="button" disabled
          className="mt-3 rounded-btn bg-ink/10 px-4 py-2 text-[13px] font-semibold text-muted cursor-not-allowed">
          Opgrader — Kommer snart
        </button>
      </div>
    )
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-card border-2 border-dashed border-ink/15 bg-white/60 py-4 text-[14px] font-medium text-muted transition hover:border-primary/40 hover:text-primary"
      >
        <span className="text-lg leading-none">+</span>
        Tilføj {expanded ? "" : "endnu "}et barn
      </button>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Nyt barn</p>
        <button type="button" onClick={() => setExpanded(false)}
          className="cursor-pointer text-[13px] text-muted hover:text-ink">
          Annuller
        </button>
      </div>
      <OnboardingForm locale={locale} />
    </div>
  )
}
