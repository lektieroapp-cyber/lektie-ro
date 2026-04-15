"use client"

import { useState } from "react"

export type UserRow = {
  id: string
  email: string
  role: "parent" | "admin"
  hasKid: boolean
  createdAt: string
  lastSignIn: string | null
}

export function UsersTable({ rows: initial }: { rows: UserRow[] }) {
  const [rows, setRows] = useState(initial)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const visible = query.trim()
    ? rows.filter(u => u.email.toLowerCase().includes(query.trim().toLowerCase()))
    : rows

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
              <th className="px-5 py-3 font-medium">Barn oprettet</th>
              <th className="px-5 py-3 font-medium">Tilmeldt</th>
              <th className="px-5 py-3 font-medium">Sidst aktiv</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(u => (
              <tr key={u.id} className="border-t border-ink/5">
                <td className="px-5 py-3 text-ink">{u.email}</td>
                <td className="px-5 py-3">
                  {u.role === "admin" ? (
                    <span className="inline-flex rounded-chip bg-coral-deep/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-coral-deep">
                      Admin
                    </span>
                  ) : (
                    <span className="text-muted">Forælder</span>
                  )}
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
                <td colSpan={6} className="px-5 py-8 text-center text-muted">
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
