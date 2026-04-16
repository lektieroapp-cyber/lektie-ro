import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "crypto"

// Cycles through one math, one Danish, one English demo per session.
let callCount = 0

export async function POST(_request: NextRequest) {
  await new Promise(r => setTimeout(r, 1200))

  const sessionId = randomUUID()
  const mock = MOCK_PROBLEMS[callCount % MOCK_PROBLEMS.length]
  callCount++

  return NextResponse.json({
    sessionId,
    subject: mock.subject,
    grade: mock.grade,
    tasks: mock.tasks,
    mocked: true,
  })
}

const MOCK_PROBLEMS = [
  {
    subject: "matematik",
    grade: 3,
    tasks: [
      { id: "t1", text: "Regn ud: 24 + 17", type: "addition" },
      { id: "t2", text: "Regn ud: 36 − 19", type: "subtraction" },
      { id: "t3", text: "Hvor mange æbler er der i alt, hvis Lærke har 5 og Jonas har 8?", type: "word-problem" },
    ],
  },
  {
    subject: "dansk",
    grade: 4,
    tasks: [
      { id: "t1", text: "Hvad handler teksten om? Skriv med dine egne ord.", type: "reading" },
      { id: "t2", text: "Find tre tillægsord i teksten.", type: "grammar" },
      { id: "t3", text: "Sæt komma i sætningen: 'Da vi kom hjem var hunden glad'.", type: "grammar" },
    ],
  },
  {
    subject: "engelsk",
    grade: 5,
    tasks: [
      { id: "t1", text: "Translate: 'Hunden løber i parken'.", type: "translation" },
      { id: "t2", text: "Write a sentence using the word 'yesterday'.", type: "composition" },
      { id: "t3", text: "Fill in: 'She ___ (go) to school every day.'", type: "grammar" },
    ],
  },
]
