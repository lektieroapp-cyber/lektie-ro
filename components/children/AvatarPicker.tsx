"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Companion } from "@/components/mascot/Companion"
import { COMPANIONS, companionByType, type CompanionType } from "@/components/mascot/types"

export function AvatarButton({
  value,
  onClick,
}: {
  value: CompanionType
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-12 w-12 cursor-pointer rounded-full transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/40"
      aria-label="Skift avatar"
    >
      {/* Inner circle clips the SVG; pencil badge sits OUTSIDE this clip. */}
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-blue-tint">
        <Companion type={value} size={44} />
      </span>
      <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-[0_2px_4px_rgba(31,45,26,0.2)]">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.5 1.5l3 3L5 14H2v-3z" />
        </svg>
      </span>
    </button>
  )
}

export function AvatarPickerModal({
  value,
  onChange,
  onClose,
}: {
  value: CompanionType
  onChange: (type: CompanionType) => void
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

  const picked = companionByType(value)

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-card bg-white p-5 sm:max-w-2xl sm:p-7"
        style={{ boxShadow: "0 16px 48px rgba(31,45,26,0.18)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-ink sm:text-[18px]">Vælg makker</h3>
          <button type="button" onClick={onClose}
            className="cursor-pointer text-lg text-muted hover:text-ink leading-none">
            ✕
          </button>
        </div>

        <p className="mb-5 text-[13px] text-muted sm:text-[14px]">
          <span className="font-semibold text-ink">{picked.name}</span>{" "}
          <span className="text-ink/60">({picked.species})</span> — {picked.description}
        </p>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
          {COMPANIONS.map(c => {
            const active = value === c.type
            return (
              <button
                key={c.type}
                type="button"
                onClick={() => { onChange(c.type); onClose() }}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/40 sm:gap-2 sm:p-3 ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-ink/5 hover:bg-ink/10"
                }`}
                aria-label={c.name}
                aria-pressed={active}
              >
                <Companion type={c.type} size={72} bobbing={active} />
                <span className="text-[12px] font-semibold text-ink leading-none sm:text-[14px]">
                  {c.name}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted leading-none sm:text-[10px]">
                  {c.species}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
