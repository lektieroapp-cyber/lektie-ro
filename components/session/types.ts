export type Task = {
  id: string
  text: string
  type: string
}

export type SolveResponse = {
  sessionId: string
  subject: string
  grade: number
  tasks: Task[]
  mocked?: boolean
}

export type Turn = {
  role: "user" | "assistant"
  content: string
}
