"use client"

import { useEffect, useRef, useState } from "react"
import { armAudioUnlock, getPlaybackAudio } from "@/lib/voice/audio-unlock"
import { startBargeInDetector } from "@/lib/voice/barge-in-detector"
import { startPcmRecorder, type PcmRecorderHandle } from "@/lib/voice/pcm-recorder"
import { startSilenceDetector } from "@/lib/voice/silence-detector"
import { modelIdFromDeployment } from "@/lib/ai-pricing"
import { pushCostEvent } from "@/lib/dev-cost"
import { K } from "./design-tokens"

// Voice-mode subject picker. Speaks "Er det matematik, dansk eller engelsk?"
// (or with a confirmation variant when the vision pass had a low-confidence
// guess) and listens for the kid's answer. The visual subject cards stay
// rendered behind this chip as a fallback — if matching fails, kid just taps.
//
// Rendered only when conversationMode === "voice". Auto-runs on mount.

type Phase =
  | "idle"
  | "speaking"
  | "listening"
  | "transcribing"
  | "matching"
  | "picked"
  | "error"

const SUBJECTS = [
  { id: "matematik", label: "Matematik" },
  { id: "dansk", label: "Dansk" },
  { id: "engelsk", label: "Engelsk" },
] as const

export function VoiceSubjectChoice({
  guess,
  onPick,
}: {
  /** The vision pass's best-guess subject (only passed when confidence was
   *  low enough that we're asking). When present we start the question with
   *  "Er det [guess]?" so the kid can confirm with a simple "ja". */
  guess?: string | null
  onPick: (subjectKey: string) => void
}) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [transcript, setTranscript] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const pcmRecRef = useRef<PcmRecorderHandle | null>(null)
  const vadCleanupRef = useRef<(() => void) | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const bargeInCleanupRef = useRef<(() => void) | null>(null)
  const bargeInFiredRef = useRef(false)

  useEffect(() => {
    armAudioUnlock()
    // AbortController per mount — survives React strict-mode's mount →
    // cleanup → remount without stranding the voice flow.
    const ctrl = new AbortController()
    void runFlow(ctrl.signal)
    return () => {
      ctrl.abort()
      if (audioElRef.current) {
        try { audioElRef.current.pause() } catch {}
        audioElRef.current = null
      }
      bargeInCleanupRef.current?.()
      bargeInCleanupRef.current = null
      vadCleanupRef.current?.()
      vadCleanupRef.current = null
      const handle = pcmRecRef.current
      pcmRecRef.current = null
      if (handle) void handle.stop().catch(() => {})
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runFlow(signal: AbortSignal) {
    if (signal.aborted) return
    // Open mic in parallel so barge-in can listen while Dani speaks. See
    // VoiceTaskChoice for the full rationale — same pattern.
    const streamPromise = openMicStream()
    await speak(buildQuestion(guess ?? null), signal, streamPromise)
    if (signal.aborted) return
    const stream = await streamPromise.catch(() => null)
    if (!stream) return
    await recordAndMatch(signal, stream)
  }

  async function openMicStream(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      })
      streamRef.current = stream
      return stream
    } catch {
      setPhase("error")
      setErrorMsg("Mikrofon blev afvist. Tryk på et fag.")
      return null
    }
  }

  async function speak(
    text: string,
    signal: AbortSignal,
    streamPromise: Promise<MediaStream | null>
  ) {
    setPhase("speaking")
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal,
      })
      if (signal.aborted) return
      if (!res.ok) {
        setPhase("error")
        setErrorMsg("Kunne ikke spille spørgsmål — tryk på et fag.")
        return
      }
      const blob = await res.blob()
      if (signal.aborted) return
      pushCostEvent({
        kind: "tts",
        provider: res.headers.get("x-voice-provider") === "elevenlabs" ? "elevenlabs" : "azure",
        chars: text.length,
      })
      const url = URL.createObjectURL(blob)
      const audio = getPlaybackAudio()
      audioElRef.current = audio
      void streamPromise.then(stream => {
        if (!stream || signal.aborted || bargeInFiredRef.current) return
        bargeInCleanupRef.current = startBargeInDetector(stream, {
          speechThreshold: 0.06,
          sustainMs: 250,
          confirmMs: 600,
          falseAlarmQuietMs: 400,
          onTentative: () => {
            if (audioElRef.current) {
              try { audioElRef.current.pause() } catch {}
            }
          },
          onConfirmed: () => {
            bargeInFiredRef.current = true
            if (audioElRef.current) {
              try { audioElRef.current.pause() } catch {}
            }
          },
          onFalseAlarm: () => {
            if (audioElRef.current && audioElRef.current.paused) {
              audioElRef.current.play().catch(() => {})
            }
          },
        })
      })
      await new Promise<void>(resolve => {
        let resolved = false
        let bargeTimer: number | null = null
        const done = () => {
          if (resolved) return
          resolved = true
          if (bargeTimer !== null) window.clearInterval(bargeTimer)
          audio.onended = null
          audio.onerror = null
          URL.revokeObjectURL(url)
          resolve()
        }
        audio.onended = done
        audio.onerror = done
        audio.src = url
        audio.play().catch(done)
        if (signal.aborted) done()
        else signal.addEventListener("abort", done, { once: true })
        bargeTimer = window.setInterval(() => {
          if (bargeInFiredRef.current) done()
        }, 40)
      })
      bargeInCleanupRef.current?.()
      bargeInCleanupRef.current = null
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setPhase("error")
      setErrorMsg("Der opstod en fejl. Tryk på et fag.")
    }
  }

  async function recordAndMatch(signal: AbortSignal, stream: MediaStream) {
    setPhase("listening")
    try {
      if (signal.aborted) {
        stream.getTracks().forEach(t => t.stop())
        return
      }
      const pcm = await startPcmRecorder(stream, { sampleRate: 16000 })
      pcmRecRef.current = pcm

      vadCleanupRef.current = startSilenceDetector(stream, {
        onStop: async (reason, stats) => {
          if (signal.aborted) return
          vadCleanupRef.current?.()
          vadCleanupRef.current = null
          const handle = pcmRecRef.current
          pcmRecRef.current = null
          if (!handle) return
          const blob = await handle.stop()
          stream.getTracks().forEach(t => t.stop())
          streamRef.current = null
          if (reason === "empty" || stats.speechMs < 250) {
            setPhase("error")
            setErrorMsg("Jeg hørte dig ikke. Tryk på et fag.")
            return
          }
          setPhase("transcribing")
          const text = await transcribe(blob, signal)
          if (signal.aborted) return
          if (!text) {
            setPhase("error")
            setErrorMsg("Kunne ikke forstå. Tryk på et fag.")
            return
          }
          setTranscript(text)
          setPhase("matching")

          // Fast-path: "ja" / "jep" / "korrekt" confirms the guess.
          if (guess && confirmsGuess(text)) {
            setPhase("picked")
            onPick(guess)
            return
          }

          const picked = await matchSubject(text, signal)
          if (signal.aborted) return
          if (picked) {
            setPhase("picked")
            onPick(picked)
            return
          }
          setPhase("error")
          setErrorMsg("Ikke sikker hvilket fag. Tryk på et.")
        },
      })
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setPhase("error")
      setErrorMsg(`Mic: ${(err as Error).message}`)
    }
  }

  const shownTranscript = transcript && phase !== "idle" ? transcript : null
  const accent =
    phase === "listening"
      ? K.clay
      : phase === "speaking"
        ? K.mintDeep
        : phase === "error"
          ? K.clay
          : K.mintDeep

  return (
    <div
      role="status"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "10px 14px",
        borderRadius: 14,
        background: phase === "error" ? K.claySoft : K.mintSoft,
        border: `1px solid ${phase === "error" ? `${K.clay}33` : K.mintEdge}`,
        fontSize: 13,
        color: K.ink,
        fontFamily: K.sans,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 700,
          color: accent,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: accent,
            animation:
              phase === "speaking" || phase === "listening"
                ? "voiceDotPulse 1.4s ease-in-out infinite"
                : "none",
          }}
        />
        {phaseLabel(phase)}
      </div>
      {shownTranscript && (
        <div style={{ fontSize: 12, color: K.ink2, fontStyle: "italic" }}>
          &ldquo;{shownTranscript}&rdquo;
        </div>
      )}
      {errorMsg && (
        <div style={{ fontSize: 12, color: K.clay }}>{errorMsg}</div>
      )}
      <style>{`
        @keyframes voiceDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(0.72); }
        }
      `}</style>
    </div>
  )
}

function buildQuestion(guess: string | null): string {
  const label = SUBJECTS.find(s => s.id === guess)?.label
  if (label) {
    return `Jeg tror det er ${label.toLowerCase()}. Er det rigtigt? Ellers sig matematik, dansk eller engelsk.`
  }
  return "Hvilket fag er det? Matematik, dansk eller engelsk?"
}

// Confirmation phrase matcher — catches "ja", "jep", "nemlig", "korrekt",
// "rigtigt" at the start or as a standalone word. Deliberately conservative:
// "ja, det er dansk" should NOT auto-confirm the guess, because the kid has
// specified a different subject. We let the AI match pick that up below.
function confirmsGuess(transcript: string): boolean {
  const t = transcript.toLowerCase().trim()
  // If they named another subject, don't treat as confirmation.
  for (const s of SUBJECTS) {
    if (t.includes(s.id)) return false
  }
  return /^(ja|jep|nemlig|jo|jaa)\b/.test(t) || /\b(korrekt|rigtigt)\b/.test(t)
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case "speaking": return "Dani spørger …"
    case "listening": return "Lytter efter dit svar"
    case "transcribing": return "Skriver det du sagde …"
    case "matching": return "Finder faget …"
    case "picked": return "Godt — vi går i gang"
    case "error": return "Tryk på et fag i stedet"
    default: return "Lige om lidt …"
  }
}

async function transcribe(blob: Blob, signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch("/api/stt", {
      method: "POST",
      headers: { "Content-Type": blob.type || "audio/wav" },
      body: blob,
      signal,
    })
    if (!res.ok) return null
    // PCM 16 kHz mono 16-bit WAV = 32000 bytes/sec; subtract the 44-byte header.
    const audioSec = Math.max(0, (blob.size - 44) / 32000)
    pushCostEvent({ kind: "stt", provider: "azure", audioSec })
    const j = (await res.json()) as { text?: string }
    return j.text ?? null
  } catch {
    return null
  }
}

// Reuses the task-matcher endpoint — it handles arbitrary id/title/text
// options, not just homework tasks. Subjects are passed as pseudo-tasks.
async function matchSubject(
  transcript: string,
  signal: AbortSignal
): Promise<string | null> {
  try {
    const res = await fetch("/api/match-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        tasks: SUBJECTS.map(s => ({
          id: s.id,
          title: s.label,
          text: s.label,
        })),
      }),
      signal,
    })
    if (!res.ok) return null
    const j = (await res.json()) as {
      taskId?: string | null
      usage?: {
        promptTokens: number
        completionTokens: number
        model: string
      } | null
    }
    if (j.usage) {
      pushCostEvent({
        kind: "hint",
        promptTokens: j.usage.promptTokens,
        completionTokens: j.usage.completionTokens,
        model: modelIdFromDeployment(j.usage.model),
      })
    }
    return j.taskId ?? null
  } catch {
    return null
  }
}
