"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AvatarButton, AvatarPickerModal } from "./AvatarPicker"
import { COMPANIONS, DEFAULT_COMPANION, type CompanionType } from "@/components/mascot/types"
import { Select } from "@/components/ui/Select"
import { type Accommodation, isAccommodation } from "@/lib/accommodations"
import {
  isEnglishTutoringLanguage,
  resolveEnglishTutoringLanguage,
} from "@/lib/english-tutoring"

type Child = {
  id: string
  name: string
  grade: number
  avatar_emoji: string | null
  companion_type: string | null
  interests: string | null
  special_needs: string | null
  accommodations: string[] | null
  english_tutoring_language: string | null
}

type SaveStatus = "idle" | "saving" | "saved" | "error" | "deleting"

const VALID_TYPES = new Set<string>(COMPANIONS.map(c => c.type))
const SAVE_DEBOUNCE_MS = 700

function toCompanion(value: string | null): CompanionType {
  return value && VALID_TYPES.has(value) ? (value as CompanionType) : DEFAULT_COMPANION
}

export function EditChildCard({ child }: { child: Child }) {
  const router = useRouter()
  const [companion, setCompanion] = useState<CompanionType>(toCompanion(child.companion_type))
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [name, setName] = useState(child.name)
  const [grade, setGrade] = useState<number>(child.grade)
  const [interests, setInterests] = useState(child.interests ?? "")
  const [specialNeeds, setSpecialNeeds] = useState(child.special_needs ?? "")
  const initialAccommodations = (child.accommodations ?? []).filter(isAccommodation)
  const [accommodations, setAccommodations] = useState<Accommodation[]>(initialAccommodations)
  // english_tutoring_language: stored as auto/danish/english but the UI
  // collapses to danish/english with the grade-based default pre-selected
  // when nothing is saved yet. Matches EditChildButton's modal behaviour.
  const storedEnglishLang = isEnglishTutoringLanguage(child.english_tutoring_language)
    ? child.english_tutoring_language
    : "auto"
  const [englishLanguage, setEnglishLanguage] = useState<"danish" | "english">(
    storedEnglishLang === "auto"
      ? resolveEnglishTutoringLanguage("auto", child.grade)
      : storedEnglishLang,
  )
  const [status, setStatus] = useState<SaveStatus>("idle")

  function toggleAccommodation(value: Accommodation) {
    setAccommodations(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value],
    )
  }

  // Prevent the first effect run (initial state hydration) from triggering save.
  const firstRun = useRef(true)
  const savedTimeoutRef = useRef<number | undefined>(undefined)

  async function persist() {
    if (!name.trim()) return
    setStatus("saving")
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          grade,
          companion_type: companion,
          interests: interests.trim() || null,
          special_needs: specialNeeds.trim() || null,
          accommodations,
          english_tutoring_language: englishLanguage,
        }),
      })
      if (!res.ok) {
        setStatus("error")
        return
      }
      setStatus("saved")
      // Clear the "saved" pill after a moment, then refresh server data.
      window.clearTimeout(savedTimeoutRef.current)
      savedTimeoutRef.current = window.setTimeout(() => {
        setStatus("idle")
        router.refresh()
      }, 1400)
    } catch {
      setStatus("error")
    }
  }

  // Debounced auto-save on any tracked change. The first run is the initial
  // render with DB-sourced state — we skip it so we don't POST on mount.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    const t = window.setTimeout(persist, SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companion, name, grade, interests, specialNeeds, accommodations, englishLanguage])

  async function remove() {
    if (!confirm(`Slet ${child.name}? Dette kan ikke fortrydes.`)) return
    setStatus("deleting")
    const res = await fetch(`/api/children/${child.id}`, { method: "DELETE" })
    if (res.ok) {
      router.refresh()
    } else {
      setStatus("error")
    }
  }

  return (
    <div
      className="flex flex-col gap-4 rounded-card bg-white p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Avatar
          </label>
          <AvatarButton value={companion} onClick={() => setAvatarOpen(true)} />
          {avatarOpen && (
            <AvatarPickerModal
              value={companion}
              onChange={setCompanion}
              onClose={() => setAvatarOpen(false)}
            />
          )}
        </div>
        <StatusPill status={status} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Navn">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            className="rounded-lg border border-ink/15 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </Field>
        <Field label="Klasse">
          <Select
            value={grade}
            onChange={v => setGrade(Number(v))}
            ariaLabel="Klasse"
            options={[
              { value: 0, label: "0. klasse" },
              ...Array.from({ length: 10 }, (_, i) => i + 1).map(n => ({
                value: n,
                label: `${n}. klasse`,
              })),
            ]}
          />
        </Field>
      </div>

      <Field label="Interesser">
        <input
          type="text"
          value={interests}
          onChange={e => setInterests(e.target.value)}
          maxLength={200}
          placeholder="Minecraft, fodbold, heste …"
          className="rounded-lg border border-ink/15 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </Field>

      <Field label="Tilpasninger">
        <p className="-mt-0.5 mb-1 text-[12px] text-muted">
          Vælg det der gør lektierne nemmere for dit barn.
        </p>
        <div className="flex flex-col gap-2">
          <AccommodationToggle
            checked={accommodations.includes("dyslexia")}
            onChange={() => toggleAccommodation("dyslexia")}
            title="Ordblindhed"
            body="Større, tydeligere tekst overalt."
          />
          <AccommodationToggle
            checked={accommodations.includes("adhd")}
            onChange={() => toggleAccommodation("adhd")}
            title="ADHD"
            body="Reserveret til fremtidige tilpasninger."
          />
        </div>
      </Field>

      <Field label="Sprog ved engelsk-lektier">
        <Select<"danish" | "english">
          value={englishLanguage}
          onChange={v => setEnglishLanguage(v)}
          ariaLabel="Sprog ved engelsk-lektier"
          options={[
            { value: "danish", label: "Dansk" },
            { value: "english", label: "Engelsk" },
          ]}
        />
        <p className="mt-1 text-[12px] text-muted">
          Hvilket sprog Dani skal tale når dit barn har engelsk for. Standard sættes ud fra klassetrin (op til 4. klasse er dansk, fra 5. klasse er engelsk).
        </p>
      </Field>

      <Field label="Særlige hensyn">
        <textarea
          value={specialNeeds}
          onChange={e => setSpecialNeeds(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="ADHD, ordblindhed …"
          className="resize-none rounded-lg border border-ink/15 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </Field>

      <div className="flex items-center justify-end border-t border-ink/5 pt-3">
        <button
          type="button"
          onClick={remove}
          disabled={status === "deleting"}
          className="cursor-pointer text-[13px] font-medium text-muted hover:text-coral-deep disabled:opacity-40"
        >
          {status === "deleting" ? "Sletter …" : "Slet barn"}
        </button>
      </div>
    </div>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

function AccommodationToggle({
  checked,
  onChange,
  title,
  body,
}: {
  checked: boolean
  onChange: () => void
  title: string
  body: string
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-btn border p-3 text-left transition ${
        checked
          ? "border-mint-deep bg-mint-soft"
          : "border-ink/10 bg-white hover:bg-canvas/50"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          checked ? "border-mint-deep bg-mint-deep text-white" : "border-ink/25 bg-white"
        }`}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[11px] text-ink/60">{body}</span>
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
      />
    </label>
  )
}

function StatusPill({ status }: { status: SaveStatus }) {
  if (status === "idle" || status === "deleting") return null

  const config = {
    saving: { label: "Gemmer …", bg: "bg-ink/5", fg: "text-ink/60" },
    saved: { label: "Gemt ✓", bg: "bg-success/15", fg: "text-success" },
    error: { label: "Prøv igen", bg: "bg-coral-deep/10", fg: "text-coral-deep" },
  } as const

  const s = config[status]
  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${s.bg} ${s.fg} transition-opacity`}
      aria-live="polite"
    >
      {s.label}
    </span>
  )
}
