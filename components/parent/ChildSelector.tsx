"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"
import { Select } from "@/components/ui/Select"

// Per-child filter for the parent overview. Mirrors RangeSelector's pattern
// — Server Component reads `?childId=` from search params; this client widget
// writes the selection back to the URL via router.replace so the page
// re-renders filtered to the chosen child.
//
// Default value is "" (= "Alle børn" — no filter), in which case ?childId=
// is dropped from the URL entirely.

type Child = { id: string; name: string }

export function ChildSelector({
  children,
  current,
  allLabel,
  label,
}: {
  children: Child[]
  current: string | null
  allLabel: string
  label: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function onChange(next: string) {
    const sp = new URLSearchParams(params?.toString() ?? "")
    if (!next) sp.delete("childId")
    else sp.set("childId", next)
    // Reset pagination when the filter changes — page indices from the
    // unfiltered list don't apply to a single-child view.
    sp.delete("page")
    const qs = sp.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    startTransition(() => {
      router.replace(url, { scroll: false })
    })
  }

  const options = [
    { value: "", label: allLabel },
    ...children.map(c => ({ value: c.id, label: c.name })),
  ]

  return (
    <div className="inline-flex items-center gap-2 text-sm text-muted">
      <span>{label}:</span>
      <div className={`min-w-[10rem] ${pending ? "opacity-60 pointer-events-none" : ""}`}>
        <Select<string>
          value={current ?? ""}
          onChange={onChange}
          options={options}
          ariaLabel={label}
        />
      </div>
    </div>
  )
}
