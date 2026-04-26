"use client"

// Mobile browsers (iOS Safari, Android Chrome) block audio.play() unless the
// call is made synchronously inside a user-gesture handler. Our TTS pipeline
// fires play() deep behind await fetch() chains — by then the gesture context
// is gone and the play() promise rejects with NotAllowedError.
//
// Unlock strategy (battle-tested pattern, used by Howler.js et al):
//   1. armAudioUnlock() attaches a one-shot listener for the first user gesture.
//   2. On that gesture we (a) create + resume() an AudioContext and (b) play a
//      1-sample silent buffer through it. iOS Safari treats this as the page
//      acquiring "media engagement" — every subsequent <audio>.play() on the
//      page is allowed without further gestures.
//   3. getPlaybackAudio() returns a single long-lived HTMLAudioElement. iOS
//      retains play-permission per-element, so reusing one element across all
//      TTS paths (HintChat pump, HintChat speakText, VoiceTaskChoice,
//      VoiceSubjectChoice) is the only reliable pattern. New Audio() instances
//      created mid-stream can re-trip the restrictions.
//
// The previous version played a muted silent WAV via an <audio> element. iOS
// only grants element-level activation on UNMUTED playback, so muted audio
// satisfied the ad-blocker but didn't actually unlock anything — voice worked
// in the first component (which created its own new Audio()) but failed in
// later ones. The AudioContext path side-steps that quirk entirely.

let armed = false
let unlocked = false
let primedEl: HTMLAudioElement | null = null
let audioContext: AudioContext | null = null

function attemptUnlock() {
  if (unlocked) return
  try {
    const Ctx: typeof AudioContext | undefined =
      (typeof window !== "undefined" && (window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext)) || undefined
    if (Ctx && !audioContext) audioContext = new Ctx()
    if (audioContext && audioContext.state === "suspended") {
      void audioContext.resume()
    }
    if (audioContext) {
      const buffer = audioContext.createBuffer(1, 1, 22050)
      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(audioContext.destination)
      source.start(0)
    }
    // Also touch the shared HTMLAudioElement inside the gesture so iOS
    // registers element-level activation on it specifically — load() is
    // a no-op when there's no src but counts as a gesture-bound interaction.
    if (!primedEl) primedEl = new Audio()
    primedEl.preload = "auto"
    try { primedEl.load() } catch {}
    unlocked = true
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
//
// Defensive: ensure the element is unmuted at full volume every time we hand
// it out. An earlier revision of this file primed with `muted = true` to
// bypass autoplay restrictions, which silently broke ALL real TTS playback
// for users still running cached client code. Forcing muted=false + volume=1
// here means we never regress that way again, even if a future caller mutates
// these properties for barge-in or fade-out purposes and forgets to restore.
export function getPlaybackAudio(): HTMLAudioElement {
  if (!primedEl) {
    primedEl = new Audio()
    primedEl.preload = "auto"
  }
  primedEl.muted = false
  primedEl.volume = 1
  return primedEl
}
