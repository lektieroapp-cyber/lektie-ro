"use client"

import { useEffect, useRef } from "react"

// Grouped by vibe — easy to extend with new categories later.
const AVATAR_GROUPS = [
  {
    label: "Vildt",
    emojis: ["🦁", "🐯", "🐺", "🦊", "🐻", "🦝", "🦈", "🦖"],
  },
  {
    label: "Magisk",
    emojis: ["🦄", "🐉", "🦋", "🦅", "🦉", "🐙", "🐬", "🦩"],
  },
  {
    label: "Hyggeligt",
    emojis: ["🐼", "🐨", "🐸", "🐧", "🐢", "🐮", "🐹", "🐰"],
  },
]

const ALL_AVATARS = AVATAR_GROUPS.flatMap(g => g.emojis)

export function AvatarButton({
  value,
  onClick,
}: {
  value: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-blue-tint text-2xl transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/40"
      aria-label="Skift avatar"
    >
      {value}
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-white">
        ✏️
      </span>
    </button>
  )
}

export function AvatarPickerModal({
  value,
  onChange,
  onClose,
}: {
  value: string
  onChange: (emoji: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref}
        className="w-full max-w-sm rounded-card bg-white p-5"
        style={{ boxShadow: "0 16px 48px rgba(30,42,58,0.18)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ink">Vælg avatar</h3>
          <button type="button" onClick={onClose}
            className="cursor-pointer text-lg text-muted hover:text-ink leading-none">
            ✕
          </button>
        </div>

        {AVATAR_GROUPS.map(group => (
          <div key={group.label} className="mb-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.emojis.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => { onChange(emoji); onClose() }}
                  className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-xl transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    value === emoji
                      ? "bg-primary/15 ring-2 ring-primary"
                      : "bg-ink/5 hover:bg-ink/10"
                  }`}
                  aria-label={emoji}
                  aria-pressed={value === emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { ALL_AVATARS }
