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
  grade: number
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
