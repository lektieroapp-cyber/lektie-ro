import { cache } from "react"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { DEV_BYPASS_AUTH, DEV_PROFILE, DEV_USER, ensureDevUserExists } from "@/lib/dev-user"
import { createAdminClient } from "@/lib/supabase/admin"

export type SessionUser = {
  id: string
  email: string | null
  displayName: string
  role: "parent" | "admin"
  passwordSet: boolean
}

// Cached per-request via React's request memo. Reads the user identity from
// headers set by proxy.ts (avoids a second Supabase round-trip per page).
// Falls back to a real auth.getUser() call if the headers aren't there
// (e.g. routes the proxy didn't run on, or local dev edge cases).
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

  // Fast path: middleware already validated the user. Skip auth round-trip,
  // only fetch the profile row for role/display_name.
  if (headerUserId) {
    const admin = createAdminClient()
    const { data: profile } = await admin
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
        // ignore malformed header, defaults to false
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

  // Slow path: middleware didn't run for this route, or no user. Validate
  // directly. Same Supabase RLS-aware client we used before.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log("[session] no user found (no header, no session)")
    return null
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle()

  const finalRole = (profile?.role as SessionUser["role"]) ?? "parent"
  if (profileErr) {
    console.log(`[session] profile fetch error ${profileErr.code}:${profileErr.message}`)
  }

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name || user.email?.split("@")[0] || "dig",
    role: finalRole,
    passwordSet: user.user_metadata?.password_set === true,
  }
})
