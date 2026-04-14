import { NextResponse, type NextRequest } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { defaultLocale } from "@/lib/i18n/config"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as "magiclink" | "signup" | "email" | "recovery" | null
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

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        return NextResponse.redirect(new URL(`/${defaultLocale}/login?error=auth`, request.url))
      }
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (error) {
        return NextResponse.redirect(new URL(`/${defaultLocale}/login?error=auth`, request.url))
      }
    } else {
      return NextResponse.redirect(new URL(`/${defaultLocale}/login?error=auth`, request.url))
    }
  } catch {
    return NextResponse.redirect(new URL(`/${defaultLocale}/login?error=auth`, request.url))
  }

  return response
}
