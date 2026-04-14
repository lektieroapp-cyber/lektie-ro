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
      // If Supabase already managed to set a cookie session earlier in the
      // chain, just proceed.
      const pre = await supabase.auth.getSession()
      if (cancelled) return
      if (pre.data.session) {
        router.replace(next)
        return
      }

      // Otherwise, look for the implicit-flow fragment.
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : ""
      if (!hash) {
        setDetail("ingen token i URL")
        setStatus("failed")
        return
      }

      const params = new URLSearchParams(hash)
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")

      if (!accessToken || !refreshToken) {
        setDetail("token mangler")
        setStatus("failed")
        return
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (cancelled) return

      if (error || !data.session) {
        console.error("[auth/complete] setSession failed:", error?.message)
        setDetail(error?.message || "session kunne ikke gemmes")
        setStatus("failed")
        return
      }

      // Strip the fragment from the browser URL so tokens aren't exposed in
      // history or referrer headers.
      window.history.replaceState(null, "", window.location.pathname + window.location.search)
      router.replace(next)
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
        <div className="max-w-md">
          <p className="text-base text-ink">Kunne ikke færdiggøre login.</p>
          <p className="mt-2 text-sm text-muted">
            {detail ? `Detalje: ${detail}.` : "Linket er måske udløbet."} Prøv at anmode om et nyt fra admin.
          </p>
          <a
            href="/da/login"
            className="mt-6 inline-flex rounded-btn bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
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
