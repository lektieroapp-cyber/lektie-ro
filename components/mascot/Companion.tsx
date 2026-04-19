"use client"

import { useState } from "react"
import { Dani } from "./Dani"
import { companionByType } from "./types"
import type { CompanionMood, CompanionType } from "./types"

// Renders the kid's chosen companion by loading the SVG file registered in
// COMPANIONS (components/mascot/types.ts → `file` field). If the file is
// missing, falls back to the inline Dani for `lion` and an empty pill for
// other animals.

type Props = {
  type: CompanionType
  mood?: CompanionMood
  size?: number
  bobbing?: boolean
  thinking?: boolean
  className?: string
}

export function Companion({
  type,
  mood = "happy",
  size = 80,
  bobbing = false,
  thinking = false,
  className = "",
}: Props) {
  const [failed, setFailed] = useState(false)
  const meta = companionByType(type)
  // encodeURI handles non-ASCII filenames like lektiero-bjørn.svg.
  const src = `/mascots/${encodeURI(meta.file)}`

  if (failed) {
    if (type === "octopus" || type === "lion") {
      return (
        <Dani
          mood={mood}
          size={size}
          bobbing={bobbing}
          thinking={thinking}
          className={className}
        />
      )
    }
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "#E8E1EF",
          display: "inline-block",
        }}
      />
    )
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "inline-block",
        animation: bobbing ? "daniBob 2.8s ease-in-out infinite" : undefined,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        draggable={false}
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          display: "block",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
      {thinking && (
        <div
          style={{
            position: "absolute",
            top: -6,
            right: -14,
            animation: "daniThink 1.6s ease-in-out infinite",
          }}
        >
          <svg width="30" height="24" viewBox="0 0 30 24">
            <circle cx="8" cy="18" r="3" fill="#fff" stroke="#2C2138" strokeWidth="1.5" />
            <circle cx="14" cy="12" r="4" fill="#fff" stroke="#2C2138" strokeWidth="1.5" />
            <circle cx="22" cy="8" r="6" fill="#fff" stroke="#2C2138" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  )
}

export { Sparkles } from "./Dani"
