"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AvatarButton, AvatarPickerModal } from "@/components/children/AvatarPicker"
import {
  COMPANIONS,
  DEFAULT_COMPANION,
  companionByType,
  type CompanionType,
} from "@/components/mascot/types"
import { ACCOMMODATIONS, type Accommodation, isAccommodation } from "@/lib/accommodations"

const VALID_COMPANIONS = new Set<string>(COMPANIONS.map(c => c.type))
function toCompanion(value: string | null): CompanionType {
  return value && VALID_COMPANIONS.has(value) ? (value as CompanionType) : DEFAULT_COMPANION
}

type Child = {
  id: string
  name: string
  grade: number
  interests: string | null
  special_needs: string | null
  companion_type: string | null
  accommodations: string[] | null
}

type Messages = {
  editChild: string
  editTitle: string
  editName: string
  editGrade: string
  editInterests: string
  editInterestsPlaceholder: string
  editSpecialNeeds: string
  editSpecialNeedsPlaceholder: string
  editAvatar: string
  editAccommodations: string
  editAccommodationsHint: string
  editAccDyslexia: string
  editAccDyslexiaBody: string
  editAccAdhd: string
  editAccAdhdBody: string
  editSave: string
  editSaving: string
  editCancel: string
  editError: string
  gradeKindergarten: string
  gradeLabel: string
}

/**
 * Pencil-icon button anchored to the corner of the parent's child summary
 * card. Opens an inline modal that PATCHes /api/children/[id] then refreshes
 * the server-rendered overview.
 */
export function EditChildButton({
  child,
  messages,
}: {
  child: Child
  messages: Messages
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={messages.editChild}
        aria-label={messages.editChild}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-ink/45 transition hover:bg-ink/5 hover:text-ink cursor-pointer"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      </button>
      {open && (
        <EditChildModal
          child={child}
          messages={messages}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function EditChildModal({
  child,
  messages,
  onClose,
}: {
  child: Child
  messages: Messages
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(child.name)
  const [grade, setGrade] = useState<number>(child.grade)
  const [interests, setInterests] = useState(child.interests ?? "")
  const [specialNeeds, setSpecialNeeds] = useState(child.special_needs ?? "")
  const [companion, setCompanion] = useState<CompanionType>(toCompanion(child.companion_type))
  const [avatarOpen, setAvatarOpen] = useState(false)
  const initialAccommodations = (child.accommodations ?? []).filter(isAccommodation)
  const [accommodations, setAccommodations] = useState<Accommodation[]>(initialAccommodations)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const companionMeta = companionByType(companion)

  function toggleAccommodation(value: Accommodation) {
    setAccommodations(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value],
    )
  }

  // Esc to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, saving])

  // Lock background scroll while open.
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  function gradeOption(n: number) {
    return n === 0
      ? messages.gradeKindergarten
      : messages.gradeLabel.replace("{n}", String(n))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          grade,
          interests: interests.trim() || null,
          special_needs: specialNeeds.trim() || null,
          companion_type: companion,
          accommodations,
        }),
      })
      if (!res.ok) {
        setError(messages.editError)
        setSaving(false)
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError(messages.editError)
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-child-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Luk"
        onClick={() => !saving && onClose()}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm cursor-pointer"
      />
      <div
        className="relative w-full max-w-md rounded-card bg-white p-6 shadow-2xl"
      >
        <h2
          id="edit-child-title"
          className="text-xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {messages.editTitle.replace("{name}", child.name)}
        </h2>
        <form onSubmit={save} className="mt-4 flex flex-col gap-4">
          {/* Avatar picker — same component as the children-management page,
              opened in its own portal so it layers above this modal. */}
          <div className="flex items-center gap-3">
            <AvatarButton value={companion} onClick={() => setAvatarOpen(true)} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">
                {messages.editAvatar}
              </p>
              <p className="text-sm font-medium text-ink">
                {companionMeta.name}
                <span className="ml-1.5 text-xs font-normal text-ink/55">
                  ({companionMeta.species})
                </span>
              </p>
            </div>
          </div>
          {avatarOpen && (
            <AvatarPickerModal
              value={companion}
              onChange={setCompanion}
              onClose={() => setAvatarOpen(false)}
            />
          )}
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink/80">
            {messages.editName}
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              className="rounded-btn border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-mint-deep focus:outline-none focus:ring-2 focus:ring-mint-deep/20"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink/80">
            {messages.editGrade}
            <select
              value={grade}
              onChange={e => setGrade(Number(e.target.value))}
              className="rounded-btn border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-mint-deep focus:outline-none focus:ring-2 focus:ring-mint-deep/20"
            >
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={i}>{gradeOption(i)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink/80">
            {messages.editInterests}
            <input
              type="text"
              value={interests}
              onChange={e => setInterests(e.target.value)}
              maxLength={200}
              placeholder={messages.editInterestsPlaceholder}
              className="rounded-btn border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-mint-deep focus:outline-none focus:ring-2 focus:ring-mint-deep/20"
            />
          </label>
          {/* Structured accommodations — checkbox-style cards. The
              free-text "Særlige hensyn" field below is for narrative
              notes that don't map to a flag. */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink/80">
              {messages.editAccommodations}
            </legend>
            <p className="text-xs text-ink/55">{messages.editAccommodationsHint}</p>
            <div className="mt-1 flex flex-col gap-2">
              <AccommodationToggle
                checked={accommodations.includes("dyslexia")}
                onChange={() => toggleAccommodation("dyslexia")}
                title={messages.editAccDyslexia}
                body={messages.editAccDyslexiaBody}
              />
              <AccommodationToggle
                checked={accommodations.includes("adhd")}
                onChange={() => toggleAccommodation("adhd")}
                title={messages.editAccAdhd}
                body={messages.editAccAdhdBody}
              />
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink/80">
            {messages.editSpecialNeeds}
            <textarea
              value={specialNeeds}
              onChange={e => setSpecialNeeds(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder={messages.editSpecialNeedsPlaceholder}
              className="resize-none rounded-btn border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-mint-deep focus:outline-none focus:ring-2 focus:ring-mint-deep/20"
            />
          </label>
          {error && <p className="text-sm text-clay">{error}</p>}
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-btn border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink/70 transition hover:bg-canvas cursor-pointer disabled:opacity-60"
            >
              {messages.editCancel}
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-btn bg-primary px-5 py-2 text-sm font-semibold text-ink transition hover:opacity-90 cursor-pointer disabled:opacity-60"
            >
              {saving ? messages.editSaving : messages.editSave}
            </button>
          </div>
        </form>
      </div>
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
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink/60">{body}</span>
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
