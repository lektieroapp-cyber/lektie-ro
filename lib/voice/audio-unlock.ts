"use client"

// Mobile browsers (iOS Safari, Android Chrome) block audio.play() unless the
// call is made synchronously inside a user-gesture handler. Our TTS pipeline
// fires play() deep behind await fetch() chains in pump() — by then the
// gesture context is gone and the play() promise rejects with NotAllowedError.
//
// The fix has two parts:
//   1. armAudioUnlock() attaches a one-shot listener to pointerdown / touchstart
//      / click. The first time the user taps anywhere on the page, we play a
//      silent <audio> clip. After that succeeds, the page has "media engagement"
//      and most browsers permit subsequent programmatic play() calls.
//   2. getPlaybackAudio() returns a single long-lived HTMLAudioElement. iOS
//      Safari retains autoplay permission on the SAME element that was unlocked
//      by the gesture; new Audio() instances can re-trip restrictions even on
//      an unlocked page. Reusing one element for every TTS chunk is the only
//      reliable pattern.

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="

let armed = false
let unlocked = false
let primedEl: HTMLAudioElement | null = null

function attemptUnlock() {
  if (unlocked) return
  try {
    const a = new Audio(SILENT_WAV)
    a.muted = true
    a.preload = "auto"
    primedEl = a
    const p = a.play()
    if (p && typeof p.then === "function") {
      p.then(() => {
        unlocked = true
        try { a.pause() } catch {}
        try { a.currentTime = 0 } catch {}
      }).catch(() => {
        armed = false
        arm()
      })
    } else {
      unlocked = true
    }
  } catch {
    armed = false
  }
}

function arm() {
  if (armed || unlocked) return
  if (typeof window === "undefined") return
  armed = true
  const handler = () => {
    window.removeEventListener("pointerdown", handler)
    window.removeEventListener("touchstart", handler)
    window.removeEventListener("click", handler)
    attemptUnlock()
  }
  const opts: AddEventListenerOptions = { passive: true }
  window.addEventListener("pointerdown", handler, opts)
  window.addEventListener("touchstart", handler, opts)
  window.addEventListener("click", handler, opts)
}

export function armAudioUnlock() {
  arm()
}

export function isAudioUnlocked() {
  return unlocked
}

// Returns a single shared <audio> element to use for ALL TTS playback. The
// element is the one that was primed by the user gesture in attemptUnlock(),
// so iOS Safari treats subsequent play() calls as continuations of that
// permission grant rather than new autoplay attempts.
export function getPlaybackAudio(): HTMLAudioElement {
  if (primedEl) return primedEl
  primedEl = new Audio()
  return primedEl
}
