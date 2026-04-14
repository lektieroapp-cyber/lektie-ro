"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type Tone = "default" | "admin"

const TONE_STYLES: Record<Tone, { active: string; idle: string; iconIdle: string }> = {
  default: {
    active: "bg-blue-tint text-blue-soft",
    idle: "text-ink/70 hover:bg-blue-tint/50 hover:text-ink",
    iconIdle: "text-ink/60 hover:bg-blue-tint/50",
  },
  admin: {
    active: "bg-coral-deep/10 text-coral-deep",
    idle: "text-coral-deep/80 hover:bg-coral-deep/10 hover:text-coral-deep",
    iconIdle: "text-coral-deep hover:bg-coral-deep/10",
  },
}

export function NavLink({
  href,
  icon,
  label,
  iconOnly = false,
  tone = "default",
  badge,
}: {
  href: string
  icon: React.ReactNode
  label: string
  iconOnly?: boolean
  tone?: Tone
  badge?: string
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + "/")
  const styles = TONE_STYLES[tone]

  if (iconOnly) {
    return (
      <Link
        href={href}
        prefetch
        aria-label={label}
        title={label}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-card transition ${
          active ? styles.active : styles.iconIdle
        }`}
      >
        <span aria-hidden>{icon}</span>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      prefetch
      className={`flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition ${
        active ? styles.active : styles.idle
      }`}
    >
      <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded-chip bg-coral-deep/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-coral-deep">
          {badge}
        </span>
      )}
    </Link>
  )
}
