// Local development convenience. When DEV_BYPASS_AUTH=true we short-circuit
// every auth check and pretend a parent admin is signed in so you can hit
// /da/parent/dashboard, /da/parent/overview, and /da/admin without going
// through Supabase. Wired into proxy.ts and the protected layouts.
//
// NEVER let this fire in production: gated on NODE_ENV === "development"
// AND the explicit env opt-in.

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

export const DEV_USER: DevUser = {
  id: "00000000-0000-0000-0000-000000000dev",
  email: "dev@lektiero.dk",
}

export const DEV_PROFILE: DevProfile = {
  id: DEV_USER.id,
  display_name: "Dev",
  role: "admin", // give yourself admin nav too while bypassing
}
