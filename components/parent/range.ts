// Server-side bits of the range filter. Kept in a non-"use client" module
// so the Server Component overview page can import isRangeKey() without
// tripping Next's "client function called from server" check.
//
// The actual RangeSelector widget lives next to this file as a client
// component and imports the types from here.

export type RangeKey = "7d" | "30d" | "90d" | "1y" | "all"

export const RANGE_OPTIONS: ReadonlyArray<{ value: RangeKey; label: string }> = [
  { value: "7d",  label: "Sidste 7 dage" },
  { value: "30d", label: "Sidste 30 dage" },
  { value: "90d", label: "Sidste 3 måneder" },
  { value: "1y",  label: "Sidste år" },
  { value: "all", label: "Alle tider" },
]

export function isRangeKey(v: string | null | undefined): v is RangeKey {
  return v === "7d" || v === "30d" || v === "90d" || v === "1y" || v === "all"
}
