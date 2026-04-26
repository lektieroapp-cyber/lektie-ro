import { cookies } from "next/headers"
import { isAzureConfigured } from "./azure"

export type AIMode = "live" | "test"
export const AI_MODE_COOKIE = "lr_ai_mode"

/**
 * Resolves the AI mode for a server request.
 *
 * Precedence (first match wins):
 *   0. PRODUCTION HARD-BLOCK — if running on Vercel production AND Azure
 *      is configured, always return "live". The cookie + env overrides
 *      are honored only on preview / dev / local. This guarantees a stale
 *      `lr_ai_mode=test` cookie left over from an admin's dev session
 *      can never cause mock data to leak into the live app.
 *   1. `lr_ai_mode` cookie — "test" | "live". Set by admin dev panel.
 *   2. `AI_MODE` env — "test" | "live".
 *   3. Fallback: "live" if Azure is configured, otherwise "test".
 *
 * In "live" mode the route handlers no longer silently swap to mocks on
 * Azure failure — they return 5xx errors so the bug is visible to the
 * caller instead of looking like a "successful" canned response.
 */
export async function getAIMode(): Promise<AIMode> {
  // Production safeguard: anything serving lektiero.dk forces live as long
  // as Azure is wired up. Removing the cookie escape hatch here is what
  // makes "this should never be possible on live" actually true. Preview /
  // development still honor the cookie so admins can demo without credits.
  if (process.env.VERCEL_ENV === "production" && isAzureConfigured()) {
    return "live"
  }

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
