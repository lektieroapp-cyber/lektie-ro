"use client"

import { useState } from "react"

export type UserRow = {
  id: string
  email: string
  role: "parent" | "admin"
  subscription: "free"
  hasKid: boolean
  createdAt: string
  lastSignIn: string | null
  /** Total AI-backed sessions for this parent's kids. */
  sessions: number
  /** Estimated cost-to-date in DKK based on session + turn counts. */
  estCostDkk: number
}

export function UsersTable({ rows: initial }: { rows: UserRow[] }) {
  const [rows, setRows] = useState(initial)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const visible = query.trim()
    ? rows.filter(u => u.email.toLowerCase().includes(query.trim().toLowerCase()))
    : rows

  async function handleRoleChange(id: string, role: "parent" | "admin") {
    setUpdatingRole(id)
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      setRows(r => r.map(u => u.id === id ? { ...u, role } : u))
    } else {
      alert("Rolleændring fejlede. Prøv igen.")
    }
    setUpdatingRole(null)
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Slet brugeren ${email}?\n\nDette sletter kontoen og alle tilknyttede data. Kan ikke fortrydes.`)) return
    setDeleting(id)
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    if (res.ok) {
      setRows(r => r.filter(u => u.id !== id))
    } else {
      alert("Sletning fejlede. Prøv igen.")
    }
    setDeleting(null)
  }

  return (
    <div>
      <div className="mt-4 flex justify-end">
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
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-blue-tint/40 text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Rolle</th>
              <th className="px-5 py-3 font-medium">Abonnement</th>
              <th className="px-5 py-3 font-medium">Barn oprettet</th>
              <th className="px-5 py-3 font-medium">Tilmeldt</th>
              <th className="px-5 py-3 font-medium">Sidst aktiv</th>
              <th className="px-5 py-3 font-medium text-right">Sessions</th>
              <th className="px-5 py-3 font-medium text-right">AI-pris</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(u => (
              <tr key={u.id} className="border-t border-ink/5">
                <td className="px-5 py-3 text-ink">{u.email}</td>
                <td className="px-5 py-3">
                  <select
                    value={u.role}
                    disabled={updatingRole === u.id}
                    onChange={e => handleRoleChange(u.id, e.target.value as "parent" | "admin")}
                    className="cursor-pointer rounded-md border border-ink/15 bg-white px-2 py-1 text-[13px] text-ink focus:border-primary focus:outline-none disabled:opacity-40"
                  >
                    <option value="parent">Forælder</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex rounded-chip bg-ink/5 px-2.5 py-0.5 text-[11px] font-medium text-muted">
                    Gratis
                  </span>
                </td>
                <td className="px-5 py-3">
                  {u.hasKid ? (
                    <span className="inline-flex items-center gap-1 font-medium text-success">
                      <span aria-hidden>✓</span> Ja
                    </span>
                  ) : (
                    <span className="text-muted">Nej</span>
                  )}
                </td>
                <td className="px-5 py-3 text-muted">
                  {new Date(u.createdAt).toLocaleDateString("da-DK")}
                </td>
                <td className="px-5 py-3 text-muted">
                  {u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString("da-DK") : "—"}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-ink/80">
                  {u.sessions > 0 ? u.sessions : <span className="text-muted">—</span>}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {u.sessions > 0 ? formatDkk(u.estCostDkk) : <span className="text-muted">—</span>}
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    disabled={deleting === u.id}
                    onClick={() => handleDelete(u.id, u.email)}
                    className="cursor-pointer text-[12px] font-medium text-muted transition hover:text-coral-deep disabled:opacity-40"
                  >
                    {deleting === u.id ? "…" : "Slet"}
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-muted">
                  Ingen brugere matcher.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatDkk(n: number): string {
  if (n < 0.01) return "< 0,01 kr"
  if (n < 1) return `${(n * 100).toFixed(1)} øre`
  if (n < 100) return `${n.toFixed(2)} kr`
  return `${Math.round(n).toLocaleString("da-DK")} kr`
}
