"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"
import { Select } from "@/components/ui/Select"
import { RANGE_OPTIONS, type RangeKey } from "./range"

// Time-range filter for the parent overview page. Server Component reads the
// chosen range from the URL search params; this client widget writes the
// selection back to the URL via router.replace so the page re-renders with
// new data. router.replace + scroll:false avoids history pollution and keeps
// scroll position stable.
//
// Default range is "30d" — resolved server-side; this component just
// renders the active value.

export function RangeSelector({ current }: { current: RangeKey }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function onChange(next: RangeKey) {
    const sp = new URLSearchParams(params?.toString() ?? "")
    if (next === "30d") sp.delete("range")
    else sp.set("range", next)
    // Reset pagination when the window changes — old page indices may no
    // longer exist in the new range.
    sp.delete("page")
    const qs = sp.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    startTransition(() => {
      router.replace(url, { scroll: false })
    })
  }

  return (
    <div className="inline-flex items-center gap-2 text-sm text-muted">
      <span>Periode:</span>
      <div className={`min-w-[10rem] ${pending ? "opacity-60 pointer-events-none" : ""}`}>
        <Select<RangeKey>
          value={current}
          onChange={onChange}
          options={[...RANGE_OPTIONS]}
          ariaLabel="Vælg periode"
        />
      </div>
    </div>
  )
}
