// Local development convenience. When DEV_BYPASS_AUTH=true we short-circuit
// every auth check and pretend a parent admin is signed in.
//
// The tricky part: children.parent_id → profiles.id → auth.users.id means
// the dev user must actually exist in those tables for DB writes (like
// onboarding submit) to succeed. ensureDevUserExists handles that.
//
// Two ways to pin the dev user:
//
//   1. Auto (default): we create a deterministic UUID in auth.users + profiles
//      on first request. Works if migration 001 + service role key are set up.
//
//   2. Manual (escape hatch): set DEV_USER_ID=<real-uuid> + DEV_USER_EMAIL=<email>
//      in .env.local pointing at an existing user you've signed up via the
//      normal flow. ensureDevUserExists becomes a no-op.
//
// Gated on NODE_ENV === "development" AND DEV_BYPASS_AUTH === "true". Never
// fires in `next build` / Vercel Production.

import { createAdminClient } from "./supabase/admin"

export const DEV_BYPASS_AUTH =
  process.env.NODE_ENV === "development" && process.env.DEV_BYPASS_AUTH === "true"

export type DevUser = {
  id: string
  email: string
}

export type DevProfile = {
  id: string
  display_name: string
  role: "admin" | "parent"
}

// Deterministic default. Overridable via env for the escape-hatch case.
const DEFAULT_DEV_ID = "deadbeef-dead-beef-dead-beefdeadbeef"
const DEFAULT_DEV_EMAIL = "dev@lektiero.dk"

export const DEV_USER: DevUser = {
  id: process.env.DEV_USER_ID?.trim() || DEFAULT_DEV_ID,
  email: process.env.DEV_USER_EMAIL?.trim() || DEFAULT_DEV_EMAIL,
}

export const DEV_PROFILE: DevProfile = {
  id: DEV_USER.id,
  display_name: "Dev",
  role: "admin",
}

// Tracks what we already verified. `null` = untried, `true` = good, `false` = gave up.
let ensureState: "pending" | "ok" | "failed" = "pending"
let ensureError: string | null = null

export function getDevEnsureStatus() {
  return { state: ensureState, error: ensureError }
}

// Escape-hatch shortcut: if the caller has told us which user to pretend to be,
// skip the auto-create entirely.
const USER_ID_EXPLICIT = !!process.env.DEV_USER_ID

export async function ensureDevUserExists(): Promise<void> {
  if (!DEV_BYPASS_AUTH) return
  if (ensureState === "ok") return

  if (USER_ID_EXPLICIT) {
    // Trust the caller. We assume that user already exists in auth.users + profiles.
    ensureState = "ok"
    return
  }

  const admin = createAdminClient()

  // Step 1: does an auth.users row already exist at our deterministic id?
  //         If yes, we're done with auth.users — skip createUser entirely.
  try {
    const { data: existing } = await admin.auth.admin.getUserById(DEV_USER.id)
    if (!existing?.user) {
      // Not there. Create with the explicit id. Supabase's API accepts this.
      const { error: createErr } = await admin.auth.admin.createUser({
        id: DEV_USER.id,
        email: DEV_USER.email,
        email_confirm: true,
        password: `dev-bypass-${crypto.randomUUID()}`,
        user_metadata: { full_name: DEV_PROFILE.display_name },
      })
      if (createErr) {
        const msg = createErr.message.toLowerCase()
        const alreadyExists =
          msg.includes("registered") || msg.includes("already") || msg.includes("duplicate")
        if (!alreadyExists) {
          ensureState = "failed"
          ensureError = `auth.createUser: ${createErr.message}`
          console.warn(`[dev-user] ${ensureError}`)
          return
        }
      }
    }
  } catch (err) {
    ensureState = "failed"
    ensureError = `auth lookup: ${err instanceof Error ? err.message : "unknown"}`
    console.warn(`[dev-user] ${ensureError}`)
    return
  }

  // Step 2: profile row. Trigger on auth.users insert should have created it,
  // but upsert to guarantee role=admin.
  const { error: upsertErr } = await admin.from("profiles").upsert(
    {
      id: DEV_USER.id,
      display_name: DEV_PROFILE.display_name,
      role: DEV_PROFILE.role,
    },
    { onConflict: "id" }
  )
  if (upsertErr) {
    ensureState = "failed"
    ensureError = `profiles.upsert: ${upsertErr.message}`
    console.warn(`[dev-user] ${ensureError}`)
    return
  }

  ensureState = "ok"
  ensureError = null
  console.log(`[dev-user] ensured ${DEV_USER.email} (${DEV_USER.id})`)
}
