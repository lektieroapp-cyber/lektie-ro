"use client"

import { useState } from "react"

export function CopyHtmlButton({ html }: { html: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle")

  async function onClick() {
    try {
      await navigator.clipboard.writeText(html)
      setState("copied")
      setTimeout(() => setState("idle"), 1800)
    } catch {
      setState("error")
      setTimeout(() => setState("idle"), 1800)
    }
  }

  const label =
    state === "copied" ? "Kopieret ✓" : state === "error" ? "Kunne ikke kopiere" : "Kopier HTML"

  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-btn border px-3 py-1.5 text-xs font-semibold transition ${
        state === "copied"
          ? "border-success/40 bg-success/10 text-success"
          : "border-ink/15 bg-white text-ink hover:border-primary/50 hover:text-mint-deep"
      }`}
    >
      {label}
    </button>
  )
}
