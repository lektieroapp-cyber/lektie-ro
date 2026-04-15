"use client"

const AVATARS = [
  "🦁", "🐯", "🐻", "🦊", "🐼", "🐨", "🐸", "🦋",
  "🦄", "🐬", "🦅", "🦉", "🐢", "🐙", "🦈", "🐺",
  "🐮", "🦖", "🐧", "🦕",
]

export function AvatarPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (emoji: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {AVATARS.map(emoji => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji)}
          className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-2xl transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
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
  )
}
