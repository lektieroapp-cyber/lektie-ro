export default function UsersLoading() {
  return (
    <div className="mt-10">
      {/* Search */}
      <div className="flex justify-end">
        <div className="h-10 w-64 rounded-lg bg-ink/5 animate-pulse" />
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-card bg-white" style={{ boxShadow: "var(--shadow-card)" }}>
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-blue-tint/40 text-muted">
            <tr>
              {["Email", "Rolle", "Abonnement", "Barn oprettet", "Tilmeldt", "Sidst aktiv", ""].map(h => (
                <th key={h} className="px-5 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="animate-pulse">
            {Array.from({ length: 4 }, (_, i) => (
              <tr key={i} className="border-t border-ink/5">
                <td className="px-5 py-3"><div className="h-4 w-40 rounded bg-ink/5" /></td>
                <td className="px-5 py-3"><div className="h-7 w-20 rounded-md bg-ink/5" /></td>
                <td className="px-5 py-3"><div className="h-5 w-14 rounded-full bg-ink/5" /></td>
                <td className="px-5 py-3"><div className="h-4 w-8 rounded bg-ink/5" /></td>
                <td className="px-5 py-3"><div className="h-4 w-20 rounded bg-ink/5" /></td>
                <td className="px-5 py-3"><div className="h-4 w-20 rounded bg-ink/5" /></td>
                <td className="px-5 py-3"><div className="h-4 w-8 rounded bg-ink/5" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
