import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { defaultLocale, locales } from "@/lib/i18n/config"

const DEV_BYPASS = process.env.NODE_ENV === "development" && process.env.DEV_BYPASS_AUTH === "true"
const AUTH_DISABLED = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const LOCALE_PREFIXES = new Set<string>(locales as readonly string[])

function pathHasLocale(pathname: string): boolean {
  const seg = pathname.split("/")[1]
  return !!seg && LOCALE_PREFIXES.has(seg)
}

function isBypassPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  )
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (isBypassPath(pathname)) return NextResponse.next()

  // Locale enforcement: prepend defaultLocale if missing.
  if (!pathHasLocale(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`
    return NextResponse.redirect(url, 307)
  }

  if (DEV_BYPASS) return NextResponse.next()

  const [, locale, ...rest] = pathname.split("/")
  const subPath = "/" + rest.join("/")

  const protectedSubPaths = ["/parent", "/admin"]
  const isProtected = protectedSubPaths.some(p => subPath === p || subPath.startsWith(p + "/"))
  const isAuthPage = subPath === "/login" || subPath === "/signup"

  if (AUTH_DISABLED) {
    if (isProtected) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
    return NextResponse.next()
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session && isProtected) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  if (session && isAuthPage) {
    return NextResponse.redirect(new URL(`/${locale}/parent/dashboard`, request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Run on everything except asset/special paths handled inside proxy via isBypassPath.
    "/((?!_next/|_vercel/|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
}
