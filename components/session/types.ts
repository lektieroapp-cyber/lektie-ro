export type Task = {
  id: string
  /** Short action-headline shown in the task picker (e.g. "Mål linjerne",
   *  "Beskriv dit hjem"). Kid-facing — the full wordy instruction stays
   *  in `text` for the AI. Extractor aims for ≤5 words. */
  title?: string
  /** Full instruction as written on the page. Passed into the hint prompt
   *  so Dani has verbatim context, but not shown on the picker (too long). */
  text: string
  type: string
  /** What the kid LEARNS from doing this task — ONE sentence, pedagogical
   *  goal not administrative ("Øv at aflæse lineal + skrive som decimaltal",
   *  not "løs opgaverne"). Injected into the hint prompt so Dani orients
   *  the kid around the concept instead of just grinding sub-items. */
  goal?: string
  /** True when the task requires the kid to write, draw, measure, colour,
   *  or mark physically on paper — things that can't be solved via chat
   *  alone (grade 1-2 math symmetry + bar charts, grade 5 engelsk "write
   *  regular verbs in red", grade 6 dansk dictation). Hint flow flips its
   *  stance from "solve with me" to "I'll help you understand, you do it
   *  on paper". Undefined = classic chat-solvable task. */
  needsPaper?: boolean
  /** Ordered sub-items for multi-step exercise groups. For a single-question
   *  task this is omitted/empty. Dani walks the kid through these in order
   *  during the hint flow. */
  steps?: TaskStep[]
  /** Free-form extractor notes for Dani's reference only (never rendered
   *  to the kid). Used for constraints, target answers visible on the page,
   *  or anything the other fields can't carry. */
  context?: string
}

export type TaskStep = {
  /** Short label shown on screen — often a letter, a number, or a pair like "A+B". */
  label: string
  /** What the kid should actually do for this step. */
  prompt: string
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
  /** Real Azure usage for the dev cost panel. Null if mocked or omitted. */
  usage?: {
    promptTokens: number
    completionTokens: number
    model: string
  } | null
}

export type Turn = {
  role: "user" | "assistant"
  content: string
}

/**
 * How the kid prefers to interact with Dani in this session.
 *   text  — type answers, read replies. AI stays quiet.
 *   voice — full bot-agent loop: AI speaks, mic auto-opens, kid speaks, loop.
 *           The visual blocks still render on screen as reinforcement.
 *
 * Chosen on ScanPanel before the first photo. Persisted per-browser in
 * localStorage under lr_convo_mode.
 */
export type ConversationMode = "text" | "voice"

/**
 * How much of a task the kid actually finished when the session ended.
 *   completed — all steps marked done (or [progress done="all"] emitted)
 *   partial   — some steps done, kid stopped mid-way
 *   abandoned — zero steps done; kid bailed
 *
 * Feeds the difficulty scoring in /api/session PATCH and — once we add the
 * column — becomes a dedicated field in the sessions row. For now it's
 * logged in the dev log and passed as metadata so we don't lose the signal.
 */
export type CompletionStatus = {
  kind: "completed" | "partial" | "abandoned"
  stepsDone: number
  stepsTotal: number
}
