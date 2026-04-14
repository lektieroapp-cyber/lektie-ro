"use client"

import { useEffect, useState } from "react"

const CameraIcon = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

export function ScanPanel({
  onSelect,
  onFile,
  error,
}: {
  onSelect: () => void
  onFile: (file: File) => void
  error?: string | null
}) {
  const [dragging, setDragging] = useState(false)

  // Global paste listener while this panel is mounted (= idle stage).
  // Captures Cmd/Ctrl+V anywhere on the page and grabs the first image.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            onFile(file)
            return
          }
        }
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [onFile])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) onFile(file)
  }

  return (
    <div
      onDragOver={e => {
        e.preventDefault()
        if (!dragging) setDragging(true)
      }}
      onDragLeave={e => {
        // Only clear when leaving the container itself, not a child.
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={handleDrop}
      className={`rounded-card bg-white p-10 md:p-14 text-center transition ${
        dragging ? "ring-4 ring-primary/40 bg-primary/5" : ""
      }`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-soft/15 text-blue-soft">
        {CameraIcon}
      </div>
      <h2
        className="mt-5 text-2xl md:text-3xl font-bold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        Scan din opgave
      </h2>
      <p className="mt-2 max-w-md mx-auto text-muted">
        Vis mig hvad du arbejder på, så hjælper jeg dig med at forstå det.
      </p>
      <button
        type="button"
        onClick={onSelect}
        className="mt-6 inline-flex rounded-btn bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        Tag billede eller vælg fra galleri
      </button>
      <p className="mt-3 text-xs text-muted">
        Du kan også trække et billede hertil, eller trykke{" "}
        <kbd className="rounded border border-ink/15 bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-ink/70">
          Ctrl/Cmd + V
        </kbd>{" "}
        for at indsætte et skærmbillede.
      </p>
      {error ? (
        <p className="mt-3 text-sm text-coral-deep">{error}</p>
      ) : (
        <p className="mt-1 text-[11px] text-muted/80">
          Demo: AI-svar er forhåndsdefinerede indtil Azure kører. Billedet uploades dog rigtigt.
        </p>
      )}
    </div>
  )
}
