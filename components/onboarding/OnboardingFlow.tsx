"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { type Locale } from "@/lib/i18n/config"
import { Select } from "@/components/ui/Select"
import { AvatarButton, AvatarPickerModal } from "@/components/children/AvatarPicker"
import { DEFAULT_COMPANION, type CompanionType } from "@/components/mascot/types"

type Step = "welcome" | "child"

export function OnboardingFlow({
  locale,
  firstName,
}: {
  locale: Locale
  firstName: string
}) {
  const [step, setStep] = useState<Step>("welcome")

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <a href={`/${locale}`} className="animate-fade-in mb-10 block">
        <img src="/logo_with_text.png" alt="LektieRo" className="h-12 w-auto" />
      </a>

      {/* Step indicator */}
      <div className="animate-fade-in mb-8 flex items-center gap-2" style={{ animationDelay: "60ms" }}>
        <StepDot active={step === "welcome"} done={step === "child"} label="1" />
        <div className="h-px w-8 bg-ink/15" />
        <StepDot active={step === "child"} done={false} label="2" />
      </div>

      <div className="animate-fade-up w-full max-w-md" style={{ animationDelay: "120ms" }}>
        {step === "welcome" && (
          <WelcomeStep firstName={firstName} onNext={() => setStep("child")} />
        )}
        {step === "child" && (
          <ChildStep locale={locale} onBack={() => setStep("welcome")} />
        )}
      </div>
    </div>
  )
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition-colors ${
        done
          ? "bg-primary text-ink"
          : active
          ? "bg-primary text-ink"
          : "bg-ink/10 text-muted"
      }`}
    >
      {done ? "✓" : label}
    </div>
  )
}

function WelcomeStep({ firstName, onNext }: { firstName: string; onNext: () => void }) {
  return (
    <div className="rounded-card bg-white p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4 text-5xl">👋</div>
      <h1
        className="text-3xl font-bold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {firstName ? `Hej ${firstName}!` : "Velkommen!"}
      </h1>
      <p className="mt-3 text-[15px] text-muted leading-relaxed">
        Lad os opsætte LektieRo, så dit barn kan komme i gang.<br />
        Det tager kun et minut.
      </p>

      <ul className="mt-6 space-y-3 text-left">
        {[
          { icon: "📸", text: "Dit barn snapper et foto af lektien" },
          { icon: "💡", text: "LektieRo guider med hints — aldrig det færdige svar" },
          { icon: "🎯", text: "Tilpasset dit barns klassetrin og interesser" },
        ].map(({ icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-[14px] text-ink/80">
            <span className="text-xl leading-none">{icon}</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onNext}
        className="mt-8 w-full cursor-pointer rounded-btn bg-primary px-6 py-3 text-[15px] font-bold text-ink transition hover:bg-primary-hover"
      >
        Opret barnets profil →
      </button>
    </div>
  )
}

function ChildStep({ locale, onBack }: { locale: Locale; onBack: () => void }) {
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
    <div className="rounded-card bg-white p-8" style={{ boxShadow: "var(--shadow-card)" }}>
      <h2
        className="text-2xl font-bold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        Hvem skal bruge LektieRo?
      </h2>
      <p className="mt-1 text-[14px] text-muted">Fortæl os lidt om dit barn.</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        {/* Avatar + name */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Avatar</label>
            <AvatarButton value={companion} onClick={() => setAvatarOpen(true)} />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label htmlFor="ob-name" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Navn
            </label>
            <input
              id="ob-name"
              type="text"
              required
              maxLength={40}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Barnets fornavn"
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {avatarOpen && (
          <AvatarPickerModal value={companion} onChange={setCompanion} onClose={() => setAvatarOpen(false)} />
        )}

        {/* Grade */}
        <div className="flex flex-col gap-1">
          <label htmlFor="ob-grade" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Klasse
          </label>
          <Select
            id="ob-grade"
            required
            value={grade}
            onChange={v => setGrade(v)}
            placeholder="Vælg klasse"
            ariaLabel="Klasse"
            options={[
              { value: 0, label: "0. klasse" },
              ...Array.from({ length: 10 }, (_, i) => i + 1).map(n => ({
                value: n,
                label: `${n}. klasse`,
              })),
            ]}
          />
        </div>

        {/* Interests + special needs */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="ob-interests" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Interesser
            </label>
            <input
              id="ob-interests"
              type="text"
              maxLength={200}
              value={interests}
              onChange={e => setInterests(e.target.value)}
              placeholder="Minecraft, fodbold …"
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ob-needs" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Særlige hensyn
            </label>
            <input
              id="ob-needs"
              type="text"
              maxLength={300}
              value={specialNeeds}
              onChange={e => setSpecialNeeds(e.target.value)}
              placeholder="ADHD, ordblindhed …"
              className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {status === "error" && (
          <p className="text-sm text-coral-deep">Noget gik galt. Prøv igen.</p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer rounded-lg border border-ink/15 px-4 py-2.5 text-[14px] text-muted hover:text-ink"
          >
            ← Tilbage
          </button>
          <button
            type="submit"
            disabled={status === "submitting" || !name.trim() || grade === ""}
            className="flex-1 cursor-pointer rounded-btn bg-primary px-6 py-2.5 text-[14px] font-bold text-ink transition hover:bg-primary-hover disabled:opacity-50"
          >
            {status === "submitting" ? "Opretter …" : "Kom i gang →"}
          </button>
        </div>
      </form>
    </div>
  )
}
