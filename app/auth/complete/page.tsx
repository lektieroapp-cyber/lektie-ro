"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// Client-side tail of the OAuth/invite flow when Supabase returns the session
// in the URL fragment (#access_token=...). The fragment is not visible to our
// server route handler — supabase-js running in the browser extracts it and
// sets the session cookie for us via detectSessionInUrl (default: true).

function CompleteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/da/parent/dashboard"
  const [status, setStatus] = useState<"working" | "failed">("working")

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function run() {
      // supabase-js parses window.location.hash on client init. Give it a
      // tick, then check for a live session.
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        if (data.session) {
          router.replace(next)
          return
        }
        await new Promise(r => setTimeout(r, 100))
      }
      setStatus("failed")
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
            Linket er måske udløbet. Prøv at anmode om et nyt fra admin.
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
