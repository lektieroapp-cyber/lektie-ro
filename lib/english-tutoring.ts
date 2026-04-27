// Per-child preference for which language Dani uses when tutoring engelsk.
//
// Stored on `children.english_tutoring_language`. The DB allows three values
// but the prompt + UI logic only cares about `danish` vs `english` — `auto`
// is resolved against the child's grade right before we hand the value off.

export const ENGLISH_TUTORING_LANGUAGES = ["auto", "danish", "english"] as const
export type EnglishTutoringLanguage = (typeof ENGLISH_TUTORING_LANGUAGES)[number]

export function isEnglishTutoringLanguage(
  value: unknown,
): value is EnglishTutoringLanguage {
  return typeof value === "string"
    && (ENGLISH_TUTORING_LANGUAGES as readonly string[]).includes(value)
}

/**
 * Resolves `auto` to a concrete language using the kid's grade.
 *
 * Danish curriculum picks up English in earnest around 4.–5. klasse. Below
 * that, English homework still needs heavy Danish scaffolding so the kid
 * understands the task at all. From grade 5 we tilt toward English narration
 * so the lesson actually exposes them to the target language.
 */
export function resolveEnglishTutoringLanguage(
  pref: EnglishTutoringLanguage | null | undefined,
  grade: number | null | undefined,
): "danish" | "english" {
  if (pref === "danish" || pref === "english") return pref
  if (typeof grade === "number" && grade >= 5) return "english"
  return "danish"
}
