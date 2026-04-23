import { matematik } from "./matematik"
import { dansk } from "./dansk"
import { engelsk } from "./engelsk"
import { tysk } from "./tysk"
import type { GradeCurriculum, Subject } from "./types"

export type { GradeCurriculum, Subject }

const CURRICULA: Record<Subject, Record<number, GradeCurriculum>> = {
  matematik,
  dansk,
  engelsk,
  tysk,
}

const SUBJECT_ALIASES: Record<string, Subject> = {
  matematik: "matematik",
  math: "matematik",
  maths: "matematik",
  dansk: "dansk",
  danish: "dansk",
  english: "engelsk",
  engelsk: "engelsk",
  tysk: "tysk",
  german: "tysk",
  deutsch: "tysk",
}

/**
 * Returns the curriculum for a subject + grade.
 * Grade is clamped to 1–7. Subject is matched case-insensitively.
 * Returns null when no match (unknown subject or grade 0/8–10).
 */
export function getCurriculum(
  subject: string,
  grade: number,
): GradeCurriculum | null {
  const key = SUBJECT_ALIASES[subject.toLowerCase().trim()]
  if (!key) return null
  const clampedGrade = Math.max(1, Math.min(7, grade))
  return CURRICULA[key][clampedGrade] ?? null
}

/**
 * Formats a curriculum into a compact string for injection into AI prompts.
 */
export function formatCurriculumForPrompt(
  subject: string,
  grade: number,
): string {
  const c = getCurriculum(subject, grade)
  if (!c) return ""

  const parts: string[] = [
    `CURRICULUM CONTEXT (${subject}, ${grade}. klasse):`,
    `Typiske emner på dette niveau: ${c.concepts.slice(0, 4).join(", ")}.`,
    `Hyppige fejl: ${c.commonMistakes.slice(0, 3).join("; ")}.`,
    `Pædagogiske tips: ${c.approachHints.slice(0, 2).join(" / ")}.`,
  ]

  const termEntries = Object.entries(c.terms).slice(0, 4)
  if (termEntries.length > 0) {
    parts.push(
      `Nøgletermer: ${termEntries.map(([k, v]) => `"${k}" = ${v}`).join("; ")}.`,
    )
  }

  return parts.join("\n")
}
