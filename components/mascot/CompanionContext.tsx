"use client"

import { createContext, useContext, useState } from "react"
import { DEFAULT_COMPANION, type CompanionType } from "./types"

type CompanionContextValue = {
  type: CompanionType | null
  setType: (t: CompanionType) => void
  clear: () => void
}

const Ctx = createContext<CompanionContextValue | null>(null)

/**
 * Source of truth for the active child's companion is the DB (`children.companion_type`
 * → read server-side and passed in as `initial`). Picks made via `setType` are
 * persisted by PATCHing the child row. No device-level cookie fallback — that
 * caused stale companions to leak across sessions when kids hadn't picked yet.
 */
export function CompanionProvider({
  initial,
  childId,
  children,
}: {
  initial?: CompanionType | null
  /** If set, a `setType` call also PATCHes /api/children/[childId]. */
  childId?: string | null
  children: React.ReactNode
}) {
  const [type, setTypeState] = useState<CompanionType | null>(initial ?? null)

  function setType(t: CompanionType) {
    setTypeState(t)
    if (childId) void persistToChild(childId, t)
  }

  function clear() {
    setTypeState(null)
    if (childId) void persistToChild(childId, null)
  }

  return <Ctx.Provider value={{ type, setType, clear }}>{children}</Ctx.Provider>
}

export function useCompanion(): CompanionContextValue {
  const v = useContext(Ctx)
  if (!v) {
    // Graceful default when used outside a provider (e.g. isolated previews).
    return {
      type: DEFAULT_COMPANION,
      setType: () => {},
      clear: () => {},
    }
  }
  return v
}

async function persistToChild(
  childId: string,
  value: CompanionType | null,
): Promise<void> {
  try {
    await fetch(`/api/children/${childId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companion_type: value }),
    })
  } catch (err) {
    console.warn("[companion] save failed:", (err as Error).message)
  }
}
