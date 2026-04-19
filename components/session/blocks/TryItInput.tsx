"use client"

import { useState } from "react"
import { K } from "../design-tokens"

// Prøv-det-felt — inline answer field inside the AI bubble. The value types
// into local state; "Tjek" pushes it into the parent chat as a user message.
// Ported from tier1-components.jsx (T1.4), simplified to three client states.

type Props = {
  placeholder?: string
  onSubmit?: (value: string) => void
}

type UiState = "idle" | "focused" | "typing"

export function TryItInput({ placeholder = "Skriv dit bud", onSubmit }: Props) {
  const [value, setValue] = useState("")
  const [state, setState] = useState<UiState>("idle")

  function handleSubmit() {
    const v = value.trim()
    if (!v || !onSubmit) return
    onSubmit(v)
    setValue("")
    setState("idle")
  }

  const focus = state === "focused" || state === "typing"
  const borderColor = focus ? K.coral : K.ink + "1A"

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 340,
        margin: "12px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: 6,
          paddingLeft: 16,
          background: K.card,
          border: `1.5px solid ${borderColor}`,
          borderRadius: 14,
          boxShadow: focus ? `0 0 0 6px ${K.coral}1A` : "none",
          transition: "all 180ms ease-out",
        }}
      >
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={e => {
            setValue(e.target.value)
            setState(e.target.value ? "typing" : "focused")
          }}
          onFocus={() => setState(value ? "typing" : "focused")}
          onBlur={() => setState("idle")}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={{
            flex: 1,
            minHeight: 32,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: K.serif,
            fontWeight: 600,
            fontSize: 18,
            color: K.ink,
            width: 0,
          }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim()}
          style={{
            height: 38,
            padding: "0 18px",
            borderRadius: 999,
            border: "none",
            background: value.trim() ? K.ink : K.ink + "AA",
            color: "#fff",
            fontFamily: K.sans,
            fontWeight: 700,
            fontSize: 13,
            cursor: value.trim() ? "pointer" : "default",
          }}
        >
          Tjek
        </button>
      </div>
    </div>
  )
}
