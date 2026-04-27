// Structured accommodation flags stored on children.accommodations.
//
// Known values are validated at the API edge (no DB CHECK constraint —
// see migration 011). Adding a new flag is two lines here + the UI checkbox.

export const ACCOMMODATIONS = ["dyslexia", "adhd"] as const
export type Accommodation = (typeof ACCOMMODATIONS)[number]

export function isAccommodation(v: unknown): v is Accommodation {
  return typeof v === "string" && (ACCOMMODATIONS as readonly string[]).includes(v)
}

/**
 * Reading-mode is on when the kid benefits from larger / clearer text.
 * Rules:
 *   • Dyslexia accommodation → always on (parent opt-in for older kids).
 *   • Grade 0–2 → on by default (smallest readers haven't built fluency).
 * Parent can override per-kid via the edit modal.
 */
export function shouldUseLargerText(
  accommodations: string[] | null | undefined,
  grade: number | null | undefined,
): boolean {
  if (Array.isArray(accommodations) && accommodations.includes("dyslexia")) {
    return true
  }
  if (typeof grade === "number" && grade <= 2) return true
  return false
}
