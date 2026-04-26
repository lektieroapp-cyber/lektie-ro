"use client"

import { useEffect, useRef } from "react"
import { armAudioUnlock, getPlaybackAudio } from "@/lib/voice/audio-unlock"
import { stripForTts } from "@/lib/voice/tts-text"
import { K } from "./design-tokens"
import { shortFallback } from "./TaskPicker"
import type { ConversationMode, Task } from "./types"

// Brief acknowledgment shown when the kid took a photo and only ONE task
// was extracted. Auto-advances into the hint flow after a short beat so
// the transition feels guided ("Dani found something — let's start") rather
// than jarring (camera → boom, in a chat).
//
// Voice mode: speaks the line via /api/tts so the kid hears Dani name the
// task before the conversation begins.
// Text mode: silent splash, same auto-advance timing.
//
// The "Lad os starte!" button is the explicit-skip path — kids who tap
// it cut the wait short. The auto-timeout always wins eventually so
// nobody gets stuck staring at a static screen.

const AUTO_ADVANCE_MS = 2600

export function TaskFoundPanel({
  task,
  subject,
  conversationMode,
  onContinue,
}: {
  task: Task
  subject?: string | null
  conversationMode: ConversationMode
  onContinue: () => void
}) {
  const advancedRef = useRef(false)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const title = task.title || shortFallback(task.text)
  const spokenLine = `Jeg fandt en opgave: ${title}. Lad os gå i gang.`

  // Single-shot continue helper that ignores follow-up calls. Both the
  // timer and the user click can race; whichever wins fires once.
  const advance = () => {
    if (advancedRef.current) return
    advancedRef.current = true
    if (audioElRef.current) {
      try { audioElRef.current.pause() } catch {}
    }
    onContinue()
  }

  // Auto-advance timer.
  useEffect(() => {
    armAudioUnlock()
    const t = window.setTimeout(advance, AUTO_ADVANCE_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Voice mode: kick off TTS in parallel with the auto-advance timer.
  // We deliberately do NOT extend the auto-advance to wait for audio to
  // finish — the TTS line is short and the timer pacing was tuned to feel
  // right with or without audio. If audio outlasts the splash the next
  // screen just plays the tail; we pause it on advance() to be safe.
  useEffect(() => {
    if (conversationMode !== "voice") return
    let cancelled = false
    ;(async () => {
      try {
        const tts = stripForTts(spokenLine, { subject: subject ?? null })
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: tts, subject }),
        })
        if (!res.ok || cancelled) return
        const blob = await res.blob()
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        const audio = getPlaybackAudio()
        audioElRef.current = audio
        audio.onended = () => URL.revokeObjectURL(url)
        audio.onerror = () => URL.revokeObjectURL(url)
        audio.src = url
        audio.play().catch(() => {
          // Browser blocked playback — splash still auto-advances. The
          // first hint will start speaking after the kid's already on
          // that surface and a gesture has been collected by then.
          URL.revokeObjectURL(url)
        })
      } catch {
        // TTS failure is non-fatal here: the splash is primarily visual.
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-card bg-white p-7 text-center md:p-10"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <span
        aria-hidden
        className="inline-flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: K.mintSoft }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
          <path
            d="M5 14.5L11 20L23 8"
            stroke={K.mintDeep}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </span>
      <p
        className="mt-4 text-sm font-semibold uppercase tracking-wider"
        style={{ color: K.mintDeep }}
      >
        Jeg fandt en opgave
      </p>
      <h2
        className="mt-2 text-2xl font-bold text-ink md:text-3xl"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {title}
      </h2>
      <p className="mt-3 text-sm text-muted">Lad os gå i gang om et øjeblik …</p>

      <button
        type="button"
        onClick={advance}
        className="mt-5 rounded-btn px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
        style={{ background: K.mint, color: K.ink }}
      >
        Lad os starte!
      </button>
    </div>
  )
}
