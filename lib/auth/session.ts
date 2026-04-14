import { cache } from "react"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { DEV_BYPASS_AUTH, DEV_PROFILE, DEV_USER, ensureDevUserExists } from "@/lib/dev-user"

export type SessionUser = {
  id: string
  email: string | null
  displayName: string
  role: "parent" | "admin"
  passwordSet: boolean
}

// Cached per-request via React's request memo. Two paths:
//
//   FAST  — proxy.ts already validated the user via getUser() and forwarded
//           the identity in trusted x-lr-* headers (which are stripped from
//           inbound requests in proxy.ts so spoofing isn't possible). We
//           skip the auth round-trip and only fetch the profile row.
//   SLOW  — middleware didn't run for this route (rare, e.g. bypass paths).
//           Fall back to a real auth.getUser() call.
//
// The profile fetch uses the RLS-aware client even though we trust the
// header — defense in depth: if the header somehow lied, RLS would still
// block reading another user's profile via the self-read policy.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (DEV_BYPASS_AUTH) {
    await ensureDevUserExists()
    return {
      id: DEV_USER.id,
      email: DEV_USER.email,
      displayName: DEV_PROFILE.display_name,
      role: DEV_PROFILE.role,
      passwordSet: true,
    }
  }

  const hdrs = await headers()
  const headerUserId = hdrs.get("x-lr-user-id")
  const headerEmail = hdrs.get("x-lr-user-email")
  const headerMeta = hdrs.get("x-lr-user-meta")

  if (headerUserId) {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", headerUserId)
      .maybeSingle()

    let passwordSet = false
    if (headerMeta) {
      try {
        const meta = JSON.parse(headerMeta) as Record<string, unknown>
        passwordSet = meta.password_set === true
      } catch {
        // ignore malformed header
      }
    }

    return {
      id: headerUserId,
      email: headerEmail || null,
      displayName: profile?.display_name || headerEmail?.split("@")[0] || "dig",
      role: (profile?.role as SessionUser["role"]) ?? "parent",
      passwordSet,
    }
  }

  // Slow path
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle()

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name || user.email?.split("@")[0] || "dig",
    role: (profile?.role as SessionUser["role"]) ?? "parent",
    passwordSet: user.user_metadata?.password_set === true,
  }
})
