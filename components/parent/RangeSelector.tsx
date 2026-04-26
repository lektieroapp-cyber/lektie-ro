"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"
import { RANGE_OPTIONS, type RangeKey } from "./range"

// Time-range filter for the parent overview page. Server Component reads
// the chosen range from the URL search params; this client widget writes
// the selection back to the URL via router.replace so the page re-renders
// with new data. Using replace + scroll:false avoids history pollution
// (each click would otherwise add to back-stack) and keeps the parent's
// scroll position stable.
//
// Default range is "30d" — 30 rolling days. Resolved on the server side;
// this component just renders the active value.

export function RangeSelector({ current }: { current: RangeKey }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function onChange(next: string) {
    const sp = new URLSearchParams(params?.toString() ?? "")
    if (next === "30d") sp.delete("range")
    else sp.set("range", next)
    const qs = sp.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    startTransition(() => {
      router.replace(url, { scroll: false })
    })
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted">
      <span>Periode:</span>
      <select
        value={current}
        onChange={e => onChange(e.target.value)}
        disabled={pending}
        className="rounded-btn border border-ink/15 bg-white px-3 py-1.5 text-sm font-medium text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-mint-deep/40"
      >
        {RANGE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
