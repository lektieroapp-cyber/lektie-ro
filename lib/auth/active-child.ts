import { cache } from "react"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

export type ActiveChild = {
  id: string
  name: string
  grade: number | null
  avatar_emoji: string | null
  companion_type: string | null
}

/**
 * Resolves the active child from the lr_active_child cookie.
 * Cached per-request so layout + page share one DB call.
 */
export const getActiveChild = cache(async (parentId: string): Promise<{
  activeChildId: string | null
  activeChild: ActiveChild | null
}> => {
  const cookieStore = await cookies()
  const activeChildId = cookieStore.get("lr_active_child")?.value ?? null

  if (!activeChildId || activeChildId === "parent") {
    return { activeChildId, activeChild: null }
  }

  const { data } = await createAdminClient()
    .from("children")
    .select("id, name, grade, avatar_emoji, companion_type")
    .eq("id", activeChildId)
    .eq("parent_id", parentId)
    .single()

  return {
    activeChildId,
    activeChild: data ?? null,
  }
})
