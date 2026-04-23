"use client"

import { useEffect, useState } from "react"

// Dev-only floating thumbnail of the current homework photo. Shown while the
// admin is in the hint flow so we can glance at the original image without
// leaving the chat. Click to maximize → full-screen lightbox; Esc or click
// anywhere to minimize.
//
// Rendered by SessionFlow only when showDevTools is true. zIndex tuned to
// sit above chat content but below the audio-debug panel (which is a
// diagnostic readout that should stay on top).

export function ImagePreviewPanel({ url }: { url: string }) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [expanded])

  if (expanded) {
    return (
      <div
        role="dialog"
        aria-label="Lektie-billede forstørret"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Lektie-billede"
          onError={() => {
            console.error("[ImagePreviewPanel] image failed to load:", url)
          }}
          style={{
            maxWidth: "100%",
            maxHeight: "calc(100% - 60px)",
            borderRadius: 10,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            background: "rgba(255,255,255,0.05)",
          }}
        />
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="Luk"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: 999,
            border: "none",
            background: "rgba(255,255,255,0.18)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden>
            <path
              d="M3 3l8 8M11 3l-8 8"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 11,
            fontFamily: "monospace, ui-monospace",
            letterSpacing: 0.5,
            userSelect: "none",
          }}
        >
          Tryk × eller ESC for at minimere
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      aria-label="Se lektie-billede"
      title="Klik for at forstørre"
      style={{
        position: "fixed",
        bottom: 14,
        left: 14,
        zIndex: 90,
        width: 96,
        height: 72,
        padding: 0,
        border: "2px solid rgba(255,255,255,0.8)",
        borderRadius: 10,
        cursor: "zoom-in",
        background: `center/cover no-repeat url(${url})`,
        boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "scale(1.05)"
        e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,0,0,0.35)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "scale(1)"
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)"
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: -6,
          right: -6,
          background: "#1F2D1A",
          color: "#fff",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.5,
          padding: "2px 6px",
          borderRadius: 999,
          fontFamily: "monospace, ui-monospace",
        }}
      >
        DEV
      </span>
    </button>
  )
}
