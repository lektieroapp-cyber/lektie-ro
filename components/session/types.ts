export type Task = {
  id: string
  text: string
  type: string
}

export type SolveResponse = {
  sessionId: string
  subject: string | null
  /** AI's confidence in the subject detection. "low" → prompt the user. */
  subjectConfidence?: "high" | "medium" | "low"
  /**
   * @deprecated Not populated from photo analysis anymore. Grade comes from
   * the child's profile — read `activeChild.grade` instead. Kept on the type
   * for backwards-compatibility with old sessions.
   */
  grade?: number | null
  tasks: Task[]
  /**
   * Populated when tasks is empty to explain why (in Danish, kid-friendly).
   * Null tasks with no reason → fall back to generic "prøv igen".
   */
  reason?: "not_homework" | "unreadable" | "no_tasks" | null
  /** Optional short AI note shown in the subject picker when confidence is low. */
  detectionNotes?: string | null
  mocked?: boolean
}

export type Turn = {
  role: "user" | "assistant"
  content: string
}

export type HintMode = "explain" | "hint"
