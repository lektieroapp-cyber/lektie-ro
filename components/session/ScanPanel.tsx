"use client"

import { useEffect, useState } from "react"
import { Companion } from "@/components/mascot/Companion"
import { useCompanion } from "@/components/mascot/CompanionContext"
import { DEFAULT_COMPANION } from "@/components/mascot/types"
import { K } from "./design-tokens"

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
  childName,
  completedCount = 0,
  onFinish,
}: {
  onSelect: () => void
  onFile: (file: File) => void
  error?: string | null
  childName?: string | null
  /** Tasks completed in this session (>0 shows a subtle pill + finish link) */
  completedCount?: number
  /** Click handler for "Færdig for i dag" text link — only rendered if provided */
  onFinish?: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const [hover, setHover] = useState(false)

  // Paste anywhere: Cmd/Ctrl+V grabs a clipboard image.
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

  // Drag/drop anywhere: file lands on the page → process it.
  useEffect(() => {
    let counter = 0
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
      e.preventDefault()
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

  const { type: companionType } = useCompanion()
  const greeting = childName ? `Hej ${childName}!` : "Klar til lektier?"
  const subhead =
    completedCount > 0
      ? `${completedCount} ${completedCount === 1 ? "opgave" : "opgaver"} klaret i dag — godt gået!`
      : "Klar til at løse noget sjovt i dag?"

  return (
    <div className="w-full" style={{ fontFamily: K.sans, color: K.ink }}>
      <div
        style={{
          maxWidth: 440,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Companion greeting */}
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <Companion
            type={companionType ?? DEFAULT_COMPANION}
            mood="cheer"
            size={108}
            bobbing
          />
          <h1
            style={{
              margin: "8px 0 2px",
              fontFamily: K.serif,
              fontSize: 30,
              fontWeight: 600,
              color: K.ink,
              letterSpacing: -0.3,
            }}
          >
            {greeting}
          </h1>
          <p style={{ margin: 0, color: K.ink2, fontSize: 15 }}>
            {subhead}
          </p>
        </div>

        {/* Photo capture card — warm dashed border */}
        <button
          type="button"
          onClick={onSelect}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "block",
            textAlign: "left",
            fontFamily: "inherit",
          }}
        >
          <div
            style={{
              background: K.card,
              borderRadius: 24,
              padding: 28,
              border: `2px dashed ${hover ? K.coral : "#E5DFD1"}`,
              transition: "all 0.2s ease",
              boxShadow: hover
                ? "0 20px 36px -12px rgba(232,132,106,0.28)"
                : K.shadowCard,
              transform: hover ? "translateY(-2px)" : undefined,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                padding: "18px 0",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${K.coralSoft} 0%, ${K.butterSoft} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.04)",
                  transform: hover ? "rotate(-4deg) scale(1.05)" : "rotate(-2deg)",
                  transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M4 10h5l2-3h10l2 3h5v16H4z"
                    stroke={K.coral}
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                  <circle cx="16" cy="17" r="5" stroke={K.coral} strokeWidth="2.2" />
                  <circle cx="16" cy="17" r="1.5" fill={K.coral} />
                </svg>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: K.serif,
                    fontSize: 20,
                    fontWeight: 600,
                    color: K.ink,
                  }}
                >
                  Tag et billede af din opgave
                </div>
                <div style={{ color: K.ink2, fontSize: 14, marginTop: 4 }}>
                  Lige meget hvor rodet — jeg skal nok finde ud af det!
                </div>
              </div>
            </div>
            {error && (
              <p style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: K.coral }}>
                {error}
              </p>
            )}
          </div>
        </button>

        {/* Footer reassurance — shown only on a fresh session.
            Once the kid has solved at least one task they know the deal;
            repeating "we never give the answer" becomes noise. */}
        {completedCount === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              background: K.plumSoft,
              borderRadius: 16,
              color: "#5A3F7A",
              fontSize: 13,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="7" stroke="#5A3F7A" strokeWidth="1.5" fill="none" />
              <path
                d="M8 4v4l2 2"
                stroke="#5A3F7A"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            <span>
              Jeg viser dig aldrig svaret. Vi løser opgaven <b>sammen</b>.
            </span>
          </div>
        )}

        {/* End-of-day button — ghost tone so it doesn't compete with the
            coral photo card, but still follows the main button shape so
            it reads as a real action. Only rendered after ≥1 task solved. */}
        {onFinish && (
          <button
            type="button"
            onClick={onFinish}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 999,
              background: "#fff",
              color: K.ink,
              border: `1.5px solid ${K.ink}20`,
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              transition: "transform 0.12s ease, border-color 0.15s",
              boxShadow: "0 1px 0 rgba(31,27,51,0.04), 0 6px 18px -12px rgba(31,27,51,0.18)",
            }}
            onMouseDown={e => (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            Færdig for i dag
          </button>
        )}
      </div>

      {/* Full-page drop overlay */}
      {dragging && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${K.coral}40`,
            backdropFilter: "blur(4px)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              borderRadius: 24,
              border: "4px dashed rgba(255,255,255,0.8)",
              background: `${K.coral}66`,
              padding: "40px 48px",
              color: "#fff",
              boxShadow: "0 12px 48px rgba(0,0,0,0.2)",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <polyline points="6 11 12 5 18 11" />
              <path d="M5 21h14" />
            </svg>
            <p style={{ fontFamily: K.serif, fontSize: 22, fontWeight: 600, margin: 0 }}>
              Slip dit billede hvor som helst
            </p>
            <p style={{ fontSize: 13, margin: 0, opacity: 0.85 }}>
              PNG, JPG, HEIC eller skærmbillede.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
