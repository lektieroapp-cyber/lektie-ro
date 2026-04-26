"use client"

import { useEffect } from "react"

// Soft-keyboard fix — sizes the app shell off `window.visualViewport.height`
// when (and only when) the keyboard is open. iOS Safari does not shrink dvh
// on keyboard, so without this the bottom input bar slides behind the
// keyboard. We deliberately do NOT sync on small viewport changes (Android
// Chrome's URL-bar retract animation fires `resize` continuously and would
// cause every frame to relayout the shell — the user-perceived "jumping").
// Strategy: track the largest visual viewport height we've seen on this
// page; only when the current height drops well below that (keyboard-sized
// delta, ~150px) do we override the CSS height. The rest of the time the
// shell stays at `100svh` (stable across URL-bar reveal/hide).
const KEYBOARD_DELTA_PX = 150

export function VisualViewportSync() {
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null
    if (!vv) return

    const root = document.documentElement
    let maxH = vv.height

    const sync = () => {
      if (vv.height > maxH) maxH = vv.height
      const keyboardOpen = maxH - vv.height > KEYBOARD_DELTA_PX
      if (keyboardOpen) {
        root.style.setProperty("--lr-app-h", `${vv.height}px`)
        // iOS sometimes scroll-shifts the body to keep the focused input in
        // view — pin it back to 0 so our shell stays flush with the visible
        // area instead of being half-hidden above the viewport.
        if (vv.offsetTop !== 0 || window.scrollY !== 0) {
          window.scrollTo(0, 0)
        }
      } else {
        root.style.removeProperty("--lr-app-h")
      }
    }

    sync()
    vv.addEventListener("resize", sync)
    vv.addEventListener("scroll", sync)
    return () => {
      vv.removeEventListener("resize", sync)
      vv.removeEventListener("scroll", sync)
    }
  }, [])

  return null
}
