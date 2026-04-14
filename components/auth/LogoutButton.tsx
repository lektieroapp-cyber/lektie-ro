"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { type Locale } from "@/lib/i18n/config"

export function LogoutButton({
  locale,
  label,
  icon,
}: {
  locale: Locale
  label: string
  icon?: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()

  async function onClick() {
    await supabase.auth.signOut()
    router.push(`/${locale}`)
    router.refresh()
  }

  if (icon) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium text-ink/70 hover:bg-blue-tint/50 hover:text-ink"
      >
        <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center">
          {icon}
        </span>
        <span>{label}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-btn border border-ink/10 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-canvas"
    >
      {label}
    </button>
  )
}
