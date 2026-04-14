import "server-only"
import { type Locale } from "./config"
import daMessages from "@/messages/da.json"

type Messages = typeof daMessages

const REGISTRY: Record<Locale, Messages> = {
  da: daMessages,
}

export function getMessages(locale: Locale): Messages {
  return REGISTRY[locale] ?? REGISTRY.da
}

// Dot-path lookup helper: t(messages, "hero.title").
export function t(messages: Messages, path: string): string {
  const parts = path.split(".")
  let cur: unknown = messages
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return path
    }
  }
  return typeof cur === "string" ? cur : path
}
