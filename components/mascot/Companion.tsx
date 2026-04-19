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
  className?: string
}

export function Companion({
  type,
  mood = "happy",
  size = 80,
  bobbing = false,
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
    </div>
  )
}

export { Sparkles } from "./Dani"
