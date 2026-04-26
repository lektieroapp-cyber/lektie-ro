"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export type TestImageRow = {
  sessionId: string
  imagePath: string
  /** Null when we couldn't sign a URL — could be auto-delete, missing upload,
   *  or a storage error. See signedUrlError for the actual reason. */
  signedUrl: string | null
  /** Raw per-path error from Supabase storage.createSignedUrls. Null when the
   *  URL came back fine. Shown as debug info on missing-image tiles. */
  signedUrlError: string | null
  subject: string | null
  grade: number | null
  problemText: string | null
  problemType: string | null
  childName: string | null
  parentEmail: string | null
  createdAt: string
}

export function TestImagesGrid({
  rows,
  locale,
}: {
  rows: TestImageRow[]
  locale: string
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white/60 p-8 text-center text-sm text-muted">
        Ingen sessioner med billeder endnu. Upload et billede via dashboardet for
        at se det her.
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(r => (
        <TestImageCard key={r.sessionId} row={r} locale={locale} />
      ))}
    </div>
  )
}

function TestImageCard({ row, locale }: { row: TestImageRow; locale: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const unavailable = !row.signedUrl
  const ageMin = (Date.now() - new Date(row.createdAt).getTime()) / 60_000
  // 24h bucket lifecycle + a small grace window. Anything younger than this
  // that's missing a URL is NOT "auto-deleted" — it's a real storage issue
  // (upload didn't land, RLS blocked the read, etc.) and we shouldn't
  // pretend otherwise.
  const looksAutoDeleted = unavailable && ageMin > 24 * 60 - 15
  const missingLabel = !unavailable
    ? null
    : looksAutoDeleted
      ? "Auto-slettet (over 24 t gammel)"
      : "Billede mangler (ikke en auto-sletning)"
  const when = formatRelative(row.createdAt)
  const reuseHref = unavailable
    ? "#"
    : `/${locale}/parent/dashboard?testImage=${encodeURIComponent(row.imagePath)}`

  async function handleDelete() {
    // Quick confirm — this wipes the session, turns, and storage object. No
    // undo, but the bucket auto-deletes in 24h anyway so the risk is low.
    const preview = row.problemText?.slice(0, 50) ?? "sessionen"
    if (!window.confirm(`Slet "${preview}" og det tilhørende billede?`)) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/test-images/${row.sessionId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      router.refresh()
    } catch (err) {
      setDeleting(false)
      setDeleteError((err as Error).message)
    }
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
        unavailable ? "border-ink/5 opacity-60" : "border-ink/10 hover:shadow-md"
      } ${deleting ? "pointer-events-none opacity-40" : ""}`}
    >
      <div className="relative aspect-[4/3] bg-ink/5">
        {row.signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.signedUrl}
            alt={row.problemText ?? "Homework photo"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-3 text-center text-[11px] text-muted">
            <div>{missingLabel}</div>
            {row.signedUrlError && (
              <div
                className="max-w-full truncate font-mono text-[10px] text-muted/80"
                title={row.signedUrlError}
              >
                {row.signedUrlError}
              </div>
            )}
            <div
              className="max-w-full truncate font-mono text-[10px] text-muted/60"
              title={row.imagePath}
            >
              {row.imagePath}
            </div>
          </div>
        )}
        {row.subject && (
          <span className="absolute left-2 top-2 rounded-chip bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-ink">
            {row.subject}
            {row.grade != null ? ` · ${row.grade}. kl.` : ""}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="line-clamp-2 min-h-[2.5rem] text-[13px] font-medium text-ink">
          {row.problemText ?? <span className="text-muted">Ingen opgave-tekst</span>}
        </div>

        <div className="flex flex-wrap gap-1 text-[11px] text-muted">
          {row.childName && <span>👶 {row.childName}</span>}
          {row.parentEmail && <span>· {row.parentEmail}</span>}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-[11px] text-muted">{when}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Slet billede og session"
              className="rounded-chip bg-ink/5 px-2 py-1 text-[11px] font-semibold text-muted hover:bg-coral/10 hover:text-coral disabled:opacity-50"
              title="Slet session + billede"
            >
              {deleting ? "Sletter…" : "Slet"}
            </button>
            {unavailable ? (
              <span
                className="rounded-chip bg-ink/5 px-2 py-1 text-[11px] text-muted"
                title={looksAutoDeleted ? "Over 24 timer (lifecycle-slettet)" : "Billede mangler i storage"}
              >
                {looksAutoDeleted ? "Udløbet" : "Mangler"}
              </span>
            ) : (
              <Link
                href={reuseHref}
                className="rounded-chip bg-ink px-3 py-1 text-[11px] font-semibold text-white hover:bg-ink/90"
              >
                Brug dette →
              </Link>
            )}
          </div>
        </div>
        {deleteError && (
          <div className="mt-1 text-[11px] text-coral">Fejl: {deleteError}</div>
        )}
      </div>
    </div>
  )
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMin = Math.round((Date.now() - then) / 60_000)
  if (diffMin < 1) return "lige nu"
  if (diffMin < 60) return `${diffMin} min siden`
  const h = Math.round(diffMin / 60)
  if (h < 24) return `${h} t siden`
  const d = Math.round(h / 24)
  return `${d} dag${d === 1 ? "" : "e"} siden`
}
