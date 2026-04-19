"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AvatarButton, AvatarPickerModal } from "./AvatarPicker"
import { COMPANIONS, DEFAULT_COMPANION, type CompanionType } from "@/components/mascot/types"
import { Select } from "@/components/ui/Select"

type Child = {
  id: string
  name: string
  grade: number
  avatar_emoji: string | null
  companion_type: string | null
  interests: string | null
  special_needs: string | null
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
  const [status, setStatus] = useState<SaveStatus>("idle")

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
  }, [companion, name, grade, interests, specialNeeds])

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
