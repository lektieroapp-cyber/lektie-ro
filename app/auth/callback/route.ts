import { NextResponse, type NextRequest } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { defaultLocale } from "@/lib/i18n/config"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as "magiclink" | "signup" | "email" | "recovery" | "invite" | null
  const next = searchParams.get("next") || `/${defaultLocale}/parent/profiles`

  const response = NextResponse.redirect(new URL(next, request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  function fail(reason: string): NextResponse {
    console.error(`[auth/callback] ${reason}`)
    return NextResponse.redirect(
      new URL(`/${defaultLocale}/login?error=${encodeURIComponent(reason)}`, request.url)
    )
  }

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        // Fallback: maybe Supabase already established a session via cookies
        // earlier in the chain (e.g. OAuth double-trip through proxy). If so,
        // just proceed to `next`.
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          console.warn(`[auth/callback] exchangeCodeForSession failed ("${error.message}") but user is signed in → continuing`)
          return response
        }
        return fail(`exchange: ${error.message}`)
      }

      // After a successful exchange, clear the old profile-pick cookie so a
      // previous user's child selection doesn't leak into the new session.
      // (The sign-out of stale sessions happens naturally — exchangeCodeForSession
      // replaces the session cookies. For invite links that land on /auth/complete
      // instead, the explicit signOut there handles it.)
      response.cookies.set("lr_active_child", "", { maxAge: 0, path: "/" })
      return response
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (error) return fail(`verifyOtp: ${error.message}`)
      return response
    }

    // No explicit auth params in the URL. Two possibilities:
    //   1. Supabase already set the session via cookies (invite verify, etc.)
    //   2. Session is in the URL fragment (#access_token=...), which the
    //      server can't see — the implicit flow used by magic-link / invite
    //      in some Supabase configurations.
    //
    // Try 1 first; if no session, bounce to /auth/complete where supabase-js
    // in the browser can extract the fragment. 3xx redirects carry the URL
    // fragment to the Location target (RFC 7231).
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return response

    return NextResponse.redirect(
      new URL(`/auth/complete?next=${encodeURIComponent(next)}`, request.url)
    )
  } catch (err) {
    return fail(`exception: ${err instanceof Error ? err.message : "unknown"}`)
  }
}
