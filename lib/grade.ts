// Grade-based age gating.
//
// Mirrors the language-lock threshold used in the homework flow: kids in
// grade 4 and below get the simpler "you do homework, parent puts the
// tasks on the board" experience. From grade 5 onward they can self-start
// tasks (upload photos, take Snak/Skriv toggle, etc).
//
// Same threshold as `isYoungKidLocked` in components/session/SessionFlow.tsx
// — kept as a single constant so we don't drift if the cutoff changes.

export const KID_AGE_LOCK_MAX_GRADE = 4

/** True when the kid is old enough to upload their own homework photos. */
export function kidCanCreateTasks(grade: number | null | undefined): boolean {
  if (grade == null) return false
  return grade > KID_AGE_LOCK_MAX_GRADE
}
