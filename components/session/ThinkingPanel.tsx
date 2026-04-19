"use client"

import { useEffect, useState } from "react"
import { Companion } from "@/components/mascot/Companion"
import { useCompanion } from "@/components/mascot/CompanionContext"
import { DEFAULT_COMPANION } from "@/components/mascot/types"
import { K } from "./design-tokens"

const PHASES = [
  "Jeg kigger på dit billede…",
  "Jeg leder efter tal og ord…",
  "Nu er jeg næsten igennem…",
] as const

export function ThinkingPanel({
  previewUrl,
  uploading,
}: {
  previewUrl?: string | null
  uploading?: boolean
}) {
  const [phase, setPhase] = useState(0)
  const { type: companionType } = useCompanion()

  useEffect(() => {
    if (uploading) {
      setPhase(0)
      return
    }
    const t1 = setTimeout(() => setPhase(1), 900)
    const t2 = setTimeout(() => setPhase(2), 1800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [uploading])

  return (
    <div
      style={{
        fontFamily: K.sans,
        color: K.ink,
        maxWidth: 440,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        paddingTop: 8,
      }}
    >
      {/* Paper sheet with scan line */}
      <div
        style={{
          position: "relative",
          width: 240,
          height: 280,
          marginTop: 20,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#fff",
            borderRadius: 18,
            boxShadow: "0 20px 48px -12px rgba(31,27,51,0.22), 0 0 0 1px rgba(31,27,51,0.04)",
            transform: "rotate(-3deg)",
            padding: 20,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {previewUrl ? (
            // Real photo preview, rendered inside the paper
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 10,
                opacity: uploading ? 0.55 : 0.85,
                transition: "opacity 0.5s",
              }}
            />
          ) : (
            <>
              <div
                style={{
                  height: 8,
                  background: "#F0EBE0",
                  borderRadius: 999,
                  marginBottom: 14,
                  width: "60%",
                }}
              />
              {["24 + 17 =", "36 – 19 =", "13 × 4 =", "5 æbler…"].map((t, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: K.serif,
                    fontSize: 16,
                    color: "#33304a",
                    marginBottom: 10,
                    opacity: 0.85,
                  }}
                >
                  {i + 1}. {t}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Scan line — animates top from 20 → 240 → 20 on loop */}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: -4,
            right: -4,
            height: 4,
            background: `linear-gradient(90deg, transparent, ${K.coral}, transparent)`,
            boxShadow: `0 0 20px ${K.coral}, 0 0 40px ${K.coral}80`,
            borderRadius: 999,
            animation: "scan 1.8s ease-in-out infinite",
            zIndex: 2,
          }}
        />

        {/* Corner marks */}
        {[
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ].map(([x, y], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              [x ? "right" : "left"]: -10,
              [y ? "bottom" : "top"]: -10,
              width: 20,
              height: 20,
              borderStyle: "solid",
              borderColor: K.coral,
              borderWidth: `${y ? 0 : 3}px ${x ? 0 : 3}px ${y ? 3 : 0}px ${x ? 3 : 0}px`,
              borderRadius: 4,
            }}
          />
        ))}
      </div>

      <Companion type={companionType ?? DEFAULT_COMPANION} mood="thinking" size={72} thinking />

      <div style={{ textAlign: "center", minHeight: 48 }}>
        {PHASES.map((p, i) => (
          <div
            key={i}
            style={{
              fontFamily: K.serif,
              fontSize: 18,
              color: K.ink,
              fontWeight: 500,
              position: i === phase ? "relative" : "absolute",
              left: i === phase ? 0 : -9999,
              opacity: i === phase ? 1 : 0,
              transition: "opacity 0.4s",
            }}
          >
            {p}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: i === phase ? 24 : 8,
              height: 8,
              borderRadius: 999,
              background: i <= phase ? K.coral : "#E5DFD1",
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  )
}
