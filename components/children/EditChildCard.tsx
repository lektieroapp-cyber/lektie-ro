"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AvatarPicker } from "./AvatarPicker"
import { Select } from "@/components/ui/Select"

type Child = {
  id: string
  name: string
  grade: number
  avatar_emoji: string | null
  interests: string | null
  special_needs: string | null
}

const GRADE_LABELS = (n: number) => (n === 0 ? "0. klasse" : `${n}. klasse`)

export function EditChildCard({ child }: { child: Child }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [avatar, setAvatar] = useState(child.avatar_emoji ?? "🙂")
  const [name, setName] = useState(child.name)
  const [grade, setGrade] = useState<number | "">(child.grade)
  const [interests, setInterests] = useState(child.interests ?? "")
  const [specialNeeds, setSpecialNeeds] = useState(child.special_needs ?? "")
  const [status, setStatus] = useState<"idle" | "saving" | "deleting">("idle")

  async function save() {
    if (grade === "") return
    setStatus("saving")
    const res = await fetch(`/api/children/${child.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        grade,
        avatar_emoji: avatar,
        interests: interests.trim() || null,
        special_needs: specialNeeds.trim() || null,
      }),
    })
    setStatus("idle")
    if (res.ok) { setEditing(false); router.refresh() }
  }

  async function remove() {
    if (!confirm(`Slet ${child.name}? Dette kan ikke fortrydes.`)) return
    setStatus("deleting")
    const res = await fetch(`/api/children/${child.id}`, { method: "DELETE" })
    setStatus("idle")
    if (res.ok) router.refresh()
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-3 rounded-card bg-white p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-tint text-3xl">
              {child.avatar_emoji ?? "🙂"}
            </span>
            <div>
              <p className="font-semibold text-ink">{child.name}</p>
              <p className="text-sm text-muted">{GRADE_LABELS(child.grade)}</p>
            </div>
          </div>
          <button type="button" onClick={() => setEditing(true)}
            className="cursor-pointer rounded-lg border border-ink/15 px-3 py-1.5 text-[13px] font-medium text-ink/70 hover:border-ink/30 hover:text-ink">
            Rediger
          </button>
        </div>
        {(child.interests || child.special_needs) && (
          <dl className="border-t border-ink/5 pt-3 text-xs text-ink/75">
            {child.interests && (
              <div className="flex gap-2"><dt className="shrink-0 text-muted">Interesser:</dt><dd>{child.interests}</dd></div>
            )}
            {child.special_needs && (
              <div className="mt-1 flex gap-2"><dt className="shrink-0 text-muted">Hensyn:</dt><dd>{child.special_needs}</dd></div>
            )}
          </dl>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-card bg-white p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted uppercase tracking-wide">Avatar</label>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-tint text-2xl">{avatar}</span>
          <AvatarPicker value={avatar} onChange={setAvatar} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">Navn</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={40}
            className="rounded-lg border border-ink/15 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">Klasse</label>
          <Select value={grade} onChange={v => setGrade(v)} ariaLabel="Klasse"
            options={[{ value: 0, label: "0. klasse" }, ...Array.from({ length: 10 }, (_, i) => i + 1).map(n => ({ value: n, label: `${n}. klasse` }))]} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-muted uppercase tracking-wide">Interesser</label>
        <input type="text" value={interests} onChange={e => setInterests(e.target.value)} maxLength={200}
          placeholder="Minecraft, fodbold, heste …"
          className="rounded-lg border border-ink/15 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-muted uppercase tracking-wide">Særlige hensyn</label>
        <textarea value={specialNeeds} onChange={e => setSpecialNeeds(e.target.value)} maxLength={300} rows={2}
          placeholder="ADHD, ordblindhed …"
          className="resize-none rounded-lg border border-ink/15 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ink/5 pt-3">
        <button type="button" onClick={remove} disabled={status === "deleting"}
          className="cursor-pointer text-[13px] font-medium text-muted hover:text-coral-deep disabled:opacity-40">
          {status === "deleting" ? "Sletter …" : "Slet barn"}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(false)}
            className="cursor-pointer rounded-lg border border-ink/15 px-3 py-1.5 text-[13px] text-muted hover:text-ink">
            Annuller
          </button>
          <button type="button" onClick={save} disabled={status === "saving" || !name.trim() || grade === ""}
            className="cursor-pointer rounded-btn bg-primary px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
            {status === "saving" ? "Gemmer …" : "Gem"}
          </button>
        </div>
      </div>
    </div>
  )
}
