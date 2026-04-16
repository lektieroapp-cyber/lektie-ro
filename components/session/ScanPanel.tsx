"use client"

import { useEffect, useState } from "react"

const CameraIcon = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

const DropIcon = (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" />
    <polyline points="6 11 12 5 18 11" />
    <path d="M5 21h14" />
  </svg>
)

function dragHasFile(e: DragEvent): boolean {
  if (!e.dataTransfer) return false
  for (const item of e.dataTransfer.items) {
    if (item.kind === "file") return true
  }
  return e.dataTransfer.types?.includes("Files") ?? false
}

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

  // Document-level paste listener: Cmd/Ctrl+V anywhere grabs a clipboard image.
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

  // Document-level drag/drop: drop a file ANYWHERE on the page while the
  // scan panel is mounted. Without this, the browser would open the dropped
  // file in a new tab as soon as the user misses the small card target.
  useEffect(() => {
    let counter = 0 // dragenter/leave fire on every child boundary; counter compensates

    function onDragEnter(e: DragEvent) {
      if (!dragHasFile(e)) return
      counter++
      setDragging(true)
    }
    function onDragLeave(e: DragEvent) {
      if (!dragHasFile(e)) return
      counter = Math.max(0, counter - 1)
      if (counter === 0) setDragging(false)
    }
    function onDragOver(e: DragEvent) {
      if (!dragHasFile(e)) return
      e.preventDefault() // required for drop to fire
    }
    function onDrop(e: DragEvent) {
      if (!dragHasFile(e)) return
      e.preventDefault()
      counter = 0
      setDragging(false)
      const file = e.dataTransfer?.files?.[0]
      if (file && file.type.startsWith("image/")) onFile(file)
    }

    window.addEventListener("dragenter", onDragEnter)
    window.addEventListener("dragleave", onDragLeave)
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("drop", onDrop)
    return () => {
      window.removeEventListener("dragenter", onDragEnter)
      window.removeEventListener("dragleave", onDragLeave)
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("drop", onDrop)
    }
  }, [onFile])

  return (
    <>
      <button
        type="button"
        onClick={onSelect}
        className="group w-full cursor-pointer rounded-card bg-white px-6 py-8 text-center transition hover:shadow-xl md:px-8 md:py-16"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:scale-110 group-hover:bg-primary/20">
          {CameraIcon}
        </div>
        <p
          className="mt-4 text-lg font-bold text-ink md:text-xl"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          Tag et billede af din opgave
        </p>
        <p className="mt-1 text-sm text-muted">
          Tryk her eller træk et billede ind
        </p>
        {error && (
          <p className="mt-3 text-sm text-coral-deep">{error}</p>
        )}
      </button>

      {/* Full-page drop overlay: shows whenever a file is dragged anywhere. */}
      {dragging && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-primary/25 backdrop-blur-sm"
        >
          <div
            className="pointer-events-none flex flex-col items-center gap-3 rounded-card border-4 border-dashed border-white/80 bg-primary/40 px-12 py-10 text-white"
            style={{ boxShadow: "0 12px 48px rgba(0,0,0,0.2)" }}
          >
            {DropIcon}
            <p
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
            >
              Slip dit billede hvor som helst
            </p>
            <p className="text-sm text-white/85">PNG, JPG, HEIC eller skærmbillede.</p>
          </div>
        </div>
      )}
    </>
  )
}
