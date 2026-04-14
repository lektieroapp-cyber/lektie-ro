import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "crypto"

// Mock vision extraction. Real version will fetch the image from Supabase
// Storage and send it to Azure OpenAI gpt-4o. Shape matches what the real
// endpoint will return so the client doesn't need to change.
export async function POST(_request: NextRequest) {
  // Simulate model latency.
  await new Promise(r => setTimeout(r, 1200))

  const sessionId = randomUUID()
  const mock = MOCK_PROBLEMS[Math.floor(Math.random() * MOCK_PROBLEMS.length)]

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
    ],
  },
  {
    subject: "engelsk",
    grade: 5,
    tasks: [
      { id: "t1", text: "Translate: 'Hunden løber i parken'.", type: "translation" },
      { id: "t2", text: "Write a sentence using the word 'yesterday'.", type: "composition" },
    ],
  },
]
