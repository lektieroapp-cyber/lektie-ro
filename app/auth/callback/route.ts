import { NextResponse, type NextRequest } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { defaultLocale } from "@/lib/i18n/config"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as "magiclink" | "signup" | "email" | "recovery" | "invite" | null
  const next = searchParams.get("next") || `/${defaultLocale}/parent/dashboard`

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
      return response
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (error) return fail(`verifyOtp: ${error.message}`)
      return response
    }

    return fail("no_code_or_token")
  } catch (err) {
    return fail(`exception: ${err instanceof Error ? err.message : "unknown"}`)
  }
}
