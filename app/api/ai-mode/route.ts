import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { AI_MODE_COOKIE, getAIMode } from "@/lib/ai-mode"
import { isAzureConfigured } from "@/lib/azure"
import { getSessionUser } from "@/lib/auth/session"
import { DEV_BYPASS_AUTH } from "@/lib/dev-user"

const patchSchema = z.object({
  mode: z.enum(["live", "test"]),
})

// GET — returns the current mode + whether live is actually reachable +
// per-var diagnostic so the dev panel can show which Vercel env is missing.
export async function GET() {
  const mode = await getAIMode()
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT ?? ""
  return NextResponse.json({
    mode,
    liveAvailable: isAzureConfigured(),
    checks: {
      endpoint: !!endpoint,
      key: !!process.env.AZURE_OPENAI_KEY,
      deployment: !!process.env.AZURE_OPENAI_DEPLOYMENT,
      aiModeEnv: process.env.AI_MODE ?? null,
      // Show the endpoint host only (not the full URL) — helps verify shape
      // without leaking anything sensitive.
      endpointHost: endpoint ? safeHost(endpoint) : null,
    },
  })
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host
  } catch {
    return "invalid_url"
  }
}

// PATCH — admin-only, sets the cookie override. Effect scoped to this browser.
export async function PATCH(request: NextRequest) {
  if (!DEV_BYPASS_AUTH) {
    const user = await getSessionUser()
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
  }

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 })
  }

  const res = NextResponse.json({ mode: parsed.data.mode })
  res.cookies.set(AI_MODE_COOKIE, parsed.data.mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
  })
  return res
}
