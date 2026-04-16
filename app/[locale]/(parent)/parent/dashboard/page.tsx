import { notFound } from "next/navigation"
import { SessionFlow } from "@/components/session/SessionFlow"
import { isLocale } from "@/lib/i18n/config"
import { getSessionUser } from "@/lib/auth/session"
import { getActiveChild } from "@/lib/auth/active-child"

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

  const childName = activeChild?.name?.split(" ")[0] ?? user.displayName?.split(" ")[0] ?? null
  const childEmoji = activeChild?.avatar_emoji ?? null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 w-full max-w-2xl flex-1 flex-col self-center">
        <SessionFlow
          isAdmin={user.role === "admin"}
          activeChildId={activeChildId}
          childName={childName}
          childEmoji={childEmoji}
        />
      </div>
    </div>
  )
}
