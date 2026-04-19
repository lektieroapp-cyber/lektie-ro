import { cookies } from "next/headers"
import { isAzureConfigured } from "./azure"

export type AIMode = "live" | "test"
export const AI_MODE_COOKIE = "lr_ai_mode"

/**
 * Resolves the AI mode for a server request.
 *
 * Precedence (first match wins):
 *   1. `lr_ai_mode` cookie — "test" | "live". Set by admin dev panel.
 *   2. `AI_MODE` env — "test" | "live".
 *   3. Fallback: "live" if Azure is configured, otherwise "test".
 *
 * Even in "live" mode, the route handler falls back to the mock if the
 * Azure call throws (network, quota, model filter) — the kid always sees
 * a response instead of an error screen.
 */
export async function getAIMode(): Promise<AIMode> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(AI_MODE_COOKIE)?.value
  if (cookieValue === "test" || cookieValue === "live") return cookieValue

  const envValue = process.env.AI_MODE?.toLowerCase()

  // Safety belt: if AI_MODE=live but Azure keys are missing, we'd silently
  // serve mocks to everyone. Log loud so it shows up in Vercel / server logs.
  if (envValue === "live" && !isAzureConfigured()) {
    warnOnce(
      "[ai-mode] AI_MODE=live but AZURE_OPENAI_ENDPOINT/KEY are missing. " +
        "Falling back to test mode — check Vercel env vars.",
    )
    return "test"
  }

  if (envValue === "test") return "test"
  if (envValue === "live") return "live"

  return isAzureConfigured() ? "live" : "test"
}

// Simple warn-once guard so the log isn't spammed on every request.
let warned = false
function warnOnce(msg: string): void {
  if (warned) return
  warned = true
  console.warn(msg)
}
