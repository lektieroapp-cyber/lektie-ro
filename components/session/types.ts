export type Task = {
  id: string
  text: string
  type: string
}

export type SolveResponse = {
  sessionId: string
  subject: string | null
  grade: number
  tasks: Task[]
  mocked?: boolean
}

export type Turn = {
  role: "user" | "assistant"
  content: string
}

export type HintMode = "explain" | "hint"
