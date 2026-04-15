export type GradeCurriculum = {
  /** Core concepts taught at this grade level. */
  concepts: string[]
  /** Mistakes kids commonly make at this level. */
  commonMistakes: string[]
  /** Key subject-specific terms with plain-language explanations. */
  terms: Record<string, string>
  /** Tips for the AI on how to scaffold guidance at this level. */
  approachHints: string[]
}

export type Subject = "matematik" | "dansk" | "engelsk"
