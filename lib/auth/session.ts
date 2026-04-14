import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { DEV_BYPASS_AUTH, DEV_PROFILE, DEV_USER, ensureDevUserExists } from "@/lib/dev-user"

export type SessionUser = {
  id: string
  email: string | null
  displayName: string
  role: "parent" | "admin"
  passwordSet: boolean
}

// Cached per-request via React's request memo. The parent/admin layout and
// the pages both call this — with `cache()` it runs once per render and is
// reused, cutting DB round-trips per navigation in half.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (DEV_BYPASS_AUTH) {
    // Create the dev user in auth.users + profiles once per process, so FK
    // constraints on downstream tables (children.parent_id etc.) resolve.
    await ensureDevUserExists()
    return {
      id: DEV_USER.id,
      email: DEV_USER.email,
      displayName: DEV_PROFILE.display_name,
      role: DEV_PROFILE.role,
      passwordSet: true,
    }
  }

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
    displayName:
      profile?.display_name || user.email?.split("@")[0] || "dig",
    role: (profile?.role as SessionUser["role"]) ?? "parent",
    // Flag stored in user_metadata whenever a password is set. Missing/false
    // means they were invited but haven't completed the welcome step.
    passwordSet: user.user_metadata?.password_set === true,
  }
})
