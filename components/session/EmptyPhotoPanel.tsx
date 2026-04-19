"use client"

import { Companion } from "@/components/mascot/Companion"
import { useCompanion } from "@/components/mascot/CompanionContext"
import { DEFAULT_COMPANION } from "@/components/mascot/types"
import { K } from "./design-tokens"
import type { SolveResponse } from "./types"

type Reason = NonNullable<SolveResponse["reason"]>

const HEADLINE: Record<Reason, string> = {
  not_homework: "Det her ser ikke ud som lektier",
  unreadable: "Jeg kan ikke læse billedet",
  no_tasks: "Jeg kunne ikke finde nogen opgaver",
}

const BODY: Record<Reason, string> = {
  not_homework:
    "Prøv igen med et billede af en opgave. Gerne så teksten er klar og skarp.",
  unreadable:
    "Billedet er lidt for sløret eller mørkt. Prøv igen i bedre lys, helt fra oven.",
  no_tasks:
    "Der er ingen egentlige opgaver på billedet. Fik du det hele med?",
}

export function EmptyPhotoPanel({
  reason,
  detectionNotes,
  onRetry,
}: {
  reason: Reason
  detectionNotes?: string | null
  onRetry: () => void
}) {
  const { type: companionType } = useCompanion()

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
        gap: 20,
        paddingTop: 12,
        textAlign: "center",
      }}
    >
      <Companion
        type={companionType ?? DEFAULT_COMPANION}
        mood="wonder"
        size={96}
        bobbing
      />

      <div>
        <h2
          style={{
            margin: 0,
            fontFamily: K.serif,
            fontSize: 24,
            fontWeight: 600,
            color: K.ink,
            letterSpacing: -0.3,
          }}
        >
          {HEADLINE[reason]}
        </h2>
        <p
          style={{
            margin: "6px 0 0",
            color: K.ink2,
            fontSize: 15,
            lineHeight: 1.5,
            maxWidth: 360,
          }}
        >
          {BODY[reason]}
        </p>
        {detectionNotes && (
          <p
            style={{
              margin: "10px auto 0",
              padding: "8px 14px",
              background: K.butterSoft,
              borderRadius: 12,
              color: "#6A5210",
              fontSize: 13,
              lineHeight: 1.45,
              maxWidth: 360,
            }}
          >
            {detectionNotes}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onRetry}
        style={{
          background: K.coral,
          color: "#fff",
          border: "none",
          borderRadius: 999,
          height: 52,
          padding: "0 28px",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          boxShadow:
            "0 6px 16px -6px rgba(232,132,106,0.6), inset 0 -2px 0 rgba(0,0,0,0.08)",
        }}
      >
        Tag et nyt billede
      </button>
    </div>
  )
}
