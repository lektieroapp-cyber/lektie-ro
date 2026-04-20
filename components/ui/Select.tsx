"use client"

import { useEffect, useId, useRef, useState } from "react"

export type SelectOption<T extends string | number> = {
  value: T
  label: string
}

type Props<T extends string | number> = {
  value: T | ""
  onChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  ariaLabel?: string
  id?: string
  required?: boolean
}

const ChevronIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export function Select<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = "Vælg …",
  ariaLabel,
  id,
  required,
}: Props<T>) {
  const autoId = useId()
  const rootId = id ?? autoId
  const listboxId = `${rootId}-listbox`
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number>(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const selectedIdx = options.findIndex(o => o.value === value)
    setActiveIdx(selectedIdx >= 0 ? selectedIdx : 0)
  }, [open, options, value])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onEsc)
    }
  }, [open])

  useEffect(() => {
    if (open && activeIdx >= 0 && listRef.current) {
      const el = listRef.current.children[activeIdx] as HTMLElement | undefined
      el?.scrollIntoView({ block: "nearest" })
    }
  }, [open, activeIdx])

  function onButtonKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setOpen(true)
    }
  }

  function onListKey(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, options.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === "Home") {
      e.preventDefault()
      setActiveIdx(0)
    } else if (e.key === "End") {
      e.preventDefault()
      setActiveIdx(options.length - 1)
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (activeIdx >= 0) {
        onChange(options[activeIdx].value)
        setOpen(false)
      }
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={rootId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-required={required}
        onClick={() => setOpen(o => !o)}
        onKeyDown={onButtonKey}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-left text-[15px] transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          open ? "border-primary ring-2 ring-primary/20" : ""
        }`}
      >
        <span className={selected ? "text-ink" : "text-muted"}>
          {selected ? selected.label : placeholder}
        </span>
        <span
          aria-hidden
          className={`text-blue-soft transition-transform ${open ? "rotate-180" : ""}`}
        >
          {ChevronIcon}
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onListKey}
          autoFocus
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-ink/10 bg-white py-1 shadow-[0_12px_32px_rgba(31,45,26,0.12)] focus:outline-none"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value
            const isActive = i === activeIdx
            return (
              <li
                key={String(opt.value)}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`cursor-pointer px-3.5 py-2 text-[15px] ${
                  isActive ? "bg-blue-tint/70 text-ink" : "text-ink/85"
                } ${isSelected ? "font-semibold text-blue-soft" : ""}`}
              >
                {opt.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
