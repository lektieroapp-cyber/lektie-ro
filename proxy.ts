import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { defaultLocale, locales } from "@/lib/i18n/config"

const DEV_BYPASS =
  process.env.VERCEL_ENV !== "production" &&
  process.env.NODE_ENV === "development" &&
  process.env.DEV_BYPASS_AUTH === "true"
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

// Known scanner / recon paths. Automated bots constantly probe every public
// domain for these. None exist in our app, but without this denylist the
// locale prepender 307s them all to /da/... before Next can 404 — wasteful
// and noisy in logs. Short-circuit to a clean 404 here.
const SCANNER_PATTERNS: RegExp[] = [
  /^\/\./,                       // any dotfile path: .env, .git, .svn, .vscode, ...
  /^\/(Dockerfile|Procfile)$/i,
  /^\/server-(info|status)$/i,
  /^\/_cat\//,                   // Elasticsearch
  /^\/graphql$/i,
  /^\/(v\d+\/)?api[-_]docs/i,
  /^\/swagger(\.json|\.yaml|-ui)?$/i,
  /^\/api\/(shared|internal|v\d+\/docs)\//i,
  /^\/(aws|src|app|config|private|secret|tmp)\//i,
  /^\/wp-(admin|login|content|includes)/i, // WordPress scanners
  /^\/phpmyadmin/i,
]

function isScannerProbe(pathname: string): boolean {
  return SCANNER_PATTERNS.some(r => r.test(pathname))
}

// Well-known files that crawlers occasionally ask for under a locale prefix.
// 301 them to the canonical root path so they get indexed. Generated from
// the supported locales list so adding sv/nb later picks these up for free.
const CRAWLER_CANONICAL_MAP: Map<string, string> = new Map(
  (locales as readonly string[]).flatMap(l => [
    [`/${l}/robots.txt`, "/robots.txt"] as const,
    [`/${l}/sitemap.xml`, "/sitemap.xml"] as const,
    [`/${l}/favicon.ico`, "/favicon.ico"] as const,
  ])
)

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Safety net: if Supabase silently falls back to Site URL after OAuth
  // (because its allowlist didn't match our `redirectTo`), we still catch
  // the PKCE `?code=...` here and route it through our proper callback.
  // Protects against misconfigured Supabase Redirect URLs.
  const oauthCode = request.nextUrl.searchParams.get("code")
  if (oauthCode && !pathname.startsWith("/auth/")) {
    const url = new URL("/auth/callback", request.url)
    url.searchParams.set("code", oauthCode)
    return NextResponse.redirect(url, 307)
  }

  // Bot/scanner probes: respond 404 immediately, skip all other handling.
  if (isScannerProbe(pathname)) {
    return new NextResponse(null, { status: 404 })
  }

  // Crawlers sometimes prepend a locale to well-known files. Send them to
  // the canonical root so they actually find robots/sitemap.
  const crawlerRedirect = CRAWLER_CANONICAL_MAP.get(pathname)
  if (crawlerRedirect) {
    return NextResponse.redirect(new URL(crawlerRedirect, request.url), 301)
  }

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

  // Use getUser() rather than getSession() so the access token is actually
  // validated server-side. getSession() only reads the cookie locally and
  // can lie if the token is expired — leading to a redirect loop where
  // proxy thinks "logged in", layout's getUser() says "no", redirect, repeat.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && isProtected) {
    return withRefreshedCookies(
      NextResponse.redirect(new URL(`/${locale}/login`, request.url)),
      response
    )
  }

  if (user && isAuthPage) {
    return withRefreshedCookies(
      NextResponse.redirect(new URL(`/${locale}/parent/dashboard`, request.url)),
      response
    )
  }

  // Pass the just-validated user to downstream server components via request
  // headers. Layouts/pages call getSessionUser() which reads these instead of
  // hitting Supabase a second time. Saves one ~30-50ms round-trip per nav.
  if (user) {
    const forwardHeaders = new Headers(request.headers)
    forwardHeaders.set("x-lr-user-id", user.id)
    if (user.email) forwardHeaders.set("x-lr-user-email", user.email)
    forwardHeaders.set("x-lr-user-meta", JSON.stringify(user.user_metadata ?? {}))
    const next = NextResponse.next({ request: { headers: forwardHeaders } })
    // Carry any refreshed Supabase cookies onto the new response.
    response.cookies.getAll().forEach(c => next.cookies.set(c.name, c.value))
    return next
  }

  return response
}

// Carry the refreshed Supabase auth cookies onto a redirect response. Without
// this, NextResponse.redirect() returns a fresh response that drops the
// updated cookies from setAll() — the browser follows the redirect with the
// stale cookie, middleware sees no session, and ping-pongs between protected
// routes and /login forever.
function withRefreshedCookies(target: NextResponse, source: NextResponse): NextResponse {
  source.cookies.getAll().forEach(c => {
    target.cookies.set(c.name, c.value)
  })
  return target
}

export const config = {
  matcher: [
    // Run on everything except asset/special paths handled inside proxy via isBypassPath.
    "/((?!_next/|_vercel/|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
}
