"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// Client-side tail of the OAuth/invite flow when Supabase returns the session
// in the URL fragment (#access_token=...). The fragment is invisible to our
// server route handler. We extract it here and manually call setSession so
// the session cookie is persisted and subsequent requests are authenticated.

function CompleteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/da/parent/dashboard"
  const [status, setStatus] = useState<"working" | "failed">("working")
  const [detail, setDetail] = useState<string>("")

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function run() {
      // Parse the fragment first — invite/OAuth tokens always live here.
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : ""
      const params = new URLSearchParams(hash)

      // Supabase signals errors (e.g. expired link) in the fragment too.
      const errorCode = params.get("error_code")
      if (errorCode) {
        setStatus("failed")
        setDetail(errorCode)
        return
      }

      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")

      if (accessToken && refreshToken) {
        // An invite/OAuth token is present. Always use it — even if another
        // user is currently signed in. Signing in via an invite link while
        // already logged in as someone else would otherwise update the wrong
        // account's password. Sign out first, then set the invited session.
        await supabase.auth.signOut()
        if (cancelled) return

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (cancelled) return

        if (error || !data.session) {
          console.error("[auth/complete] setSession failed:", error?.message)
          setStatus("failed")
          setDetail(error?.message ?? "session_error")
          return
        }

        // Strip tokens from URL history so they aren't exposed in referrer headers.
        window.history.replaceState(null, "", window.location.pathname + window.location.search)
        router.replace(next)
        return
      }

      // No token in fragment — check if a cookie session was set upstream
      // (e.g. PKCE flow where the server already exchanged the code).
      const pre = await supabase.auth.getSession()
      if (cancelled) return
      if (pre.data.session) {
        router.replace(next)
        return
      }

      // Nothing to work with.
      setStatus("failed")
      setDetail("no_token")
    }

    run()
    return () => {
      cancelled = true
    }
  }, [next, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center">
      {status === "working" ? (
        <div>
          <div
            aria-hidden
            className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-tint"
          >
            <span className="block h-4 w-4 animate-pulse rounded-full bg-blue-soft" />
          </div>
          <p className="mt-5 text-sm text-muted">Logger dig ind …</p>
        </div>
      ) : (
        <div className="max-w-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-pill text-3xl">
            🔗
          </div>
          <h1
            className="text-2xl font-bold text-ink"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            {detail === "otp_expired" || detail === "no_token"
              ? "Linket er udløbet"
              : "Noget gik galt"}
          </h1>
          <p className="mt-3 text-[15px] text-muted leading-relaxed">
            {detail === "otp_expired" || detail === "no_token" ? (
              <>
                Dit invitationslink er desværre udløbet — de er kun gyldige i 24 timer.{" "}
                Skriv til{" "}
                <a
                  href="mailto:marcuz@lektiero.dk"
                  className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                  marcuz@lektiero.dk
                </a>{" "}
                så sender vi et nyt med det samme.
              </>
            ) : (
              <>
                Vi kunne ikke fuldføre dit login. Prøv at klikke på linket i din invitations-email igen, eller skriv til{" "}
                <a
                  href="mailto:marcuz@lektiero.dk"
                  className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                  marcuz@lektiero.dk
                </a>
                .
              </>
            )}
          </p>
          <a
            href="/da/login"
            className="mt-8 inline-flex rounded-btn bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Tilbage til login
          </a>
        </div>
      )}
    </div>
  )
}

export default function AuthComplete() {
  return (
    <Suspense fallback={null}>
      <CompleteInner />
    </Suspense>
  )
}
