"use client"

import { useMemo, useState } from "react"

export type WaitlistRow = {
  email: string
  locale: string
  created_at: string
  hasAccount: boolean
}

type Filter = "all" | "waiting" | "joined"

export function WaitlistTable({ rows }: { rows: WaitlistRow[] }) {
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")

  const counts = useMemo(() => {
    const joined = rows.filter(r => r.hasAccount).length
    return { all: rows.length, joined, waiting: rows.length - joined }
  }, [rows])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(r => {
      if (filter === "joined" && !r.hasAccount) return false
      if (filter === "waiting" && r.hasAccount) return false
      if (q && !r.email.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, filter, query])

  return (
    <div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-card border border-ink/10 bg-white p-1">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            Alle <Count n={counts.all} />
          </FilterChip>
          <FilterChip active={filter === "waiting"} onClick={() => setFilter("waiting")}>
            Venter <Count n={counts.waiting} />
          </FilterChip>
          <FilterChip active={filter === "joined"} onClick={() => setFilter("joined")}>
            Har konto <Count n={counts.joined} />
          </FilterChip>
        </div>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Søg efter email …"
          className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-64"
        />
      </div>

      <div
        className="mt-4 overflow-x-auto rounded-card bg-white"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-blue-tint/40 text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Sprog</th>
              <th className="px-5 py-3 font-medium">Tilmeldt</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(row => (
              <tr key={row.email} className="border-t border-ink/5">
                <td className="px-5 py-3 text-ink">{row.email}</td>
                <td className="px-5 py-3">
                  {row.hasAccount ? (
                    <span className="inline-flex items-center gap-1.5 rounded-chip bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-success">
                      <span aria-hidden>✓</span> Har konto
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-chip bg-amber-pill/40 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink/70">
                      Venter
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-muted uppercase">{row.locale}</td>
                <td className="px-5 py-3 text-muted">
                  {new Date(row.created_at).toLocaleString("da-DK")}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted">
                  Ingen tilmeldinger matcher.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-card px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-blue-tint text-blue-soft" : "text-ink/60 hover:text-ink"
      }`}
    >
      {children}
    </button>
  )
}

function Count({ n }: { n: number }) {
  return <span className="ml-1 text-[11px] font-bold text-ink/40">{n}</span>
}
