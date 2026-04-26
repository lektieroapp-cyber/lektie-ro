"use client"

import { useEffect, useRef, useState } from "react"
import { armAudioUnlock, getPlaybackAudio } from "@/lib/voice/audio-unlock"
import { startPcmRecorder, type PcmRecorderHandle } from "@/lib/voice/pcm-recorder"
import { startSilenceDetector } from "@/lib/voice/silence-detector"
import { modelIdFromDeployment } from "@/lib/ai-pricing"
import { pushCostEvent } from "@/lib/dev-cost"
import { K } from "./design-tokens"
import { shortFallback } from "./TaskPicker"
import type { Task } from "./types"

// Voice-mode task picker. Speaks "Jeg fandt N opgaver — første X, anden Y,
// hvilken vil du starte med?" and listens for the kid's answer. Matches the
// transcript against the task list server-side (heuristic + LLM fallback)
// and auto-picks the best match. The visual task cards stay rendered behind
// this chip as a fallback — if matching fails, kid just taps.
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

export function VoiceTaskChoice({
  tasks,
  subject,
  onPick,
}: {
  tasks: Task[]
  /** Subject of the homework — passed to /api/tts so engelsk tasks get the
   *  multilingual voice (Andrew) for correct English pronunciation when the
   *  task title or prompt quotes English words. */
  subject?: string | null
  onPick: (task: Task) => void
}) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [transcript, setTranscript] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const pcmRecRef = useRef<PcmRecorderHandle | null>(null)
  const vadCleanupRef = useRef<(() => void) | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    armAudioUnlock()
    // Each mount gets a fresh AbortController. React strict mode in dev
    // fires mount → cleanup → remount on the same instance; using a local
    // controller (not a persistent ref) means the first mount's flow aborts
    // cleanly via ctrl.abort() and the second mount starts a brand-new
    // flow with an unaborted signal. No stuck "Dani spørger" state.
    const ctrl = new AbortController()
    void runFlow(ctrl.signal)
    return () => {
      ctrl.abort()
      if (audioElRef.current) {
        try { audioElRef.current.pause() } catch {}
        audioElRef.current = null
      }
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
    await speak(buildQuestion(tasks), signal)
    if (signal.aborted) return
    await recordAndMatch(signal)
  }

  async function speak(text: string, signal: AbortSignal) {
    setPhase("speaking")
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, subject }),
        signal,
      })
      if (signal.aborted) return
      if (!res.ok) {
        setPhase("error")
        setErrorMsg("Kunne ikke spille spørgsmål — tryk på en opgave.")
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
      await new Promise<void>(resolve => {
        let resolved = false
        const done = () => {
          if (resolved) return
          resolved = true
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
      })
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setPhase("error")
      setErrorMsg("Der opstod en fejl. Tryk på en opgave.")
    }
  }

  async function recordAndMatch(signal: AbortSignal) {
    setPhase("listening")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      })
      if (signal.aborted) {
        stream.getTracks().forEach(t => t.stop())
        return
      }
      streamRef.current = stream
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
            setErrorMsg("Jeg hørte dig ikke. Tryk på en opgave.")
            return
          }
          setPhase("transcribing")
          const text = await transcribe(blob, signal)
          if (signal.aborted) return
          if (!text) {
            setPhase("error")
            setErrorMsg("Kunne ikke forstå. Tryk på en opgave.")
            return
          }
          setTranscript(text)
          setPhase("matching")
          const taskId = await matchTask(text, tasks, signal)
          if (signal.aborted) return
          if (taskId) {
            const task = tasks.find(t => t.id === taskId)
            if (task) {
              setPhase("picked")
              onPick(task)
              return
            }
          }
          setPhase("error")
          setErrorMsg("Ikke sikker hvilken. Tryk på en opgave.")
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

function buildQuestion(tasks: Task[]): string {
  const countWord = numberWord(tasks.length)
  const parts = tasks.map((t, i) => {
    const label = ordinalWord(i) ?? `nummer ${i + 1}`
    // Same derivation as TaskPicker so voice speaks exactly what the card
    // shows — no "voice said X, card says Y" drift when title is missing.
    const title = t.title || shortFallback(t.text)
    return `${label}: ${title}`
  })
  return `Jeg fandt ${countWord} opgaver. ${parts.join(". ")}. Hvilken vil du starte med?`
}

function numberWord(n: number): string {
  const map = ["nul", "én", "to", "tre", "fire", "fem", "seks"]
  return map[n] ?? String(n)
}

function ordinalWord(i: number): string | null {
  const map = ["først", "derefter", "så", "til sidst"]
  return map[i] ?? null
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case "speaking": return "Dani spørger …"
    case "listening": return "Lytter efter dit valg"
    case "transcribing": return "Skriver det du sagde …"
    case "matching": return "Finder opgaven …"
    case "picked": return "Godt — vi går i gang"
    case "error": return "Prøv at tappe en opgave i stedet"
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
    const audioSec = Math.max(0, (blob.size - 44) / 32000)
    pushCostEvent({ kind: "stt", provider: "azure", audioSec })
    const j = (await res.json()) as { text?: string }
    return j.text ?? null
  } catch {
    return null
  }
}

async function matchTask(
  transcript: string,
  tasks: Task[],
  signal: AbortSignal
): Promise<string | null> {
  try {
    const res = await fetch("/api/match-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        tasks: tasks.map(t => ({
          id: t.id,
          title: t.title,
          goal: t.goal,
          text: t.text,
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
