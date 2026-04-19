import { notFound } from "next/navigation"
import { CompanionProvider } from "@/components/mascot/CompanionContext"
import { COMPANIONS, type CompanionType } from "@/components/mascot/types"
import { SessionFlow } from "@/components/session/SessionFlow"
import { isLocale } from "@/lib/i18n/config"
import { getSessionUser } from "@/lib/auth/session"
import { getActiveChild } from "@/lib/auth/active-child"

const VALID_TYPES = new Set<string>(COMPANIONS.map(c => c.type))

export default async function ParentDashboard({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  // Proxy handles all redirects (unauthed, no cookie, no children).
  // Both getSessionUser and getActiveChild are cached per-request —
  // shared with layout, zero extra DB calls.
  const user = (await getSessionUser())!
  const { activeChildId, activeChild } = await getActiveChild(user.id)

  // Kid greeting — use the selected child's name. Never fall back to the
  // parent's display name / email prefix (that's where "Hej smidstrupdaniel!"
  // was sneaking in). If no active child, pass null → ScanPanel shows a
  // generic greeting.
  const childName = activeChild?.name?.split(" ")[0] ?? null
  const childEmoji = activeChild?.avatar_emoji ?? null
  // Grade is the single source of truth from the child profile. If the
  // child has no grade set, leave it null — don't guess from the photo.
  const childGrade = activeChild?.grade ?? null

  // Companion comes from the child's row (migration 007). Null → consumers
  // fall back to DEFAULT_COMPANION (Dani the lion).
  const rawChildCompanion = activeChild?.companion_type
  const initialCompanion: CompanionType | null =
    rawChildCompanion && VALID_TYPES.has(rawChildCompanion)
      ? (rawChildCompanion as CompanionType)
      : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 w-full max-w-2xl flex-1 flex-col self-center lg:max-w-3xl">
        <CompanionProvider initial={initialCompanion} childId={activeChildId}>
          <SessionFlow
            isAdmin={user.role === "admin"}
            activeChildId={activeChildId}
            childName={childName}
            childEmoji={childEmoji}
            childGrade={childGrade}
          />
        </CompanionProvider>
      </div>
    </div>
  )
}
