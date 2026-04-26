"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Companion, Sparkles } from "@/components/mascot/Companion"
import { useCompanion } from "@/components/mascot/CompanionContext"
import { companionByType, DEFAULT_COMPANION } from "@/components/mascot/types"
import { armAudioUnlock, getPlaybackAudio } from "@/lib/voice/audio-unlock"
import { startBargeInDetector } from "@/lib/voice/barge-in-detector"
import { startPcmRecorder, type PcmRecorderHandle } from "@/lib/voice/pcm-recorder"
import { startSilenceDetector, type DetectorStats } from "@/lib/voice/silence-detector"
import { stripForTts } from "@/lib/voice/tts-text"
import { modelIdFromDeployment, type VoiceProviderId } from "@/lib/ai-pricing"
import { pushCostEvent } from "@/lib/dev-cost"
import { renderWithBlocks } from "./blocks/parse"
import { StepChecklist } from "./StepChecklist"
import { shortFallback } from "./TaskPicker"
import { logDevEvent } from "./dev-log"
import { K } from "./design-tokens"
import { VoiceCanvas } from "./VoiceCanvas"
import type {
  CompletionStatus,
  ConversationMode,
  SolveResponse,
  Task,
  Turn,
} from "./types"

// /api/hint appends "\n[[LR_USAGE:{...}]]" to the end of the streamed text.
// We strip it before display and parse it for the dev cost panel.
const USAGE_SENTINEL_START = "\n[[LR_USAGE:"
const USAGE_SENTINEL_END = "]]"

// Map an `x-voice-provider` response header to a pricing-known provider id.
// The server always sends "azure" or "elevenlabs"; default to azure if a
// future provider lands without rate-card support.
function ttsProviderId(raw: string): VoiceProviderId {
  return raw === "elevenlabs" ? "elevenlabs" : "azure"
}

// Detect Dani's verbal completion celebration in a turn. Fires on phrases
// like "du er **færdig**!" / "du er færdig!" / "godt gået — du er færdig."
// that the prompt uses as the completion template. This is the safety net
// for when Dani forgets to emit [progress done="all"] alongside the words.
//
// Intentionally conservative: we require the exact "du er færdig" phrase
// followed by sentence-ending punctuation, so "spørg mig hvornår du er
// færdig?" (a question) doesn't false-trigger.
const VERBAL_DONE_RE = /du er\s+\*{0,2}færdig\*{0,2}\s*[!.]/i
function hasVerbalCompletion(text: string): boolean {
  return VERBAL_DONE_RE.test(text)
}

function splitUsageSentinel(acc: string): {
  text: string
  usage: { promptTokens: number; completionTokens: number; model: string } | null
} {
  // Defensive: also strip a partially-arrived sentinel so it never flashes
  // on screen between chunks. "[[LR_USAGE" alone is enough to start hiding.
  const partialIdx = acc.indexOf("[[LR_USAGE")
  if (partialIdx === -1) return { text: acc, usage: null }
  // The newline before the sentinel is an artifact, trim it from displayed text.
  const trimEnd = partialIdx > 0 && acc[partialIdx - 1] === "\n" ? partialIdx - 1 : partialIdx
  const text = acc.slice(0, trimEnd)
  const startIdx = acc.indexOf(USAGE_SENTINEL_START)
  if (startIdx === -1) return { text, usage: null }
  const jsonStart = startIdx + USAGE_SENTINEL_START.length
  const endIdx = acc.indexOf(USAGE_SENTINEL_END, jsonStart)
  if (endIdx === -1) return { text, usage: null }
  try {
    const parsed = JSON.parse(acc.slice(jsonStart, endIdx)) as {
      promptTokens: number
      completionTokens: number
      model: string
    }
    return { text, usage: parsed }
  } catch {
    return { text, usage: null }
  }
}

const MAX_TURNS = 25
const WARN_AT = 20
// After this many assistant turns, surface a gentle "are you done?" nudge.
// Most tasks resolve in 3-6 turns; past that the kid may be stuck in a
// STT/miscommunication loop and wants an exit, not more hints.
const FINISH_NUDGE_AT = 6
// Minimum time the typing dots show before any text renders — makes Azure's
// fast-start responses feel less abrupt + gives the "Dani er ved at tænke" beat.
const MIN_THINKING_MS = 700

// Voice is gated so the kid flow degrades to text-only when keys aren't
// provisioned or when we haven't signed off on a production rollout yet.
const VOICE_ENABLED = process.env.NEXT_PUBLIC_VOICE_ENABLED === "true"
const VOICE_ON_STORAGE_KEY = "lr_voice_on"

function aiTurnsBefore(turns: Turn[]): number {
  return turns.filter(t => t.role === "assistant").length
}

export function HintChat({
  task,
  solve,
  turns,
  setTurns,
  childId,
  onComplete,
  onMoreHomework,
  onFinishSession,
  onRequestNewPhoto,
  completed,
  conversationMode = "text",
}: {
  task: Task
  solve: SolveResponse
  turns: Turn[]
  setTurns: (fn: (prev: Turn[]) => Turn[]) => void
  childId?: string
  onComplete: (turns: Turn[], status?: CompletionStatus) => void
  onMoreHomework: () => void
  onFinishSession: () => void
  /** Triggered when the AI emits [needphoto] and the kid taps "Tag nyt billede".
   *  SessionFlow resets state + opens the file picker. Optional — omit and the
   *  retake button renders read-only. */
  onRequestNewPhoto?: () => void
  completed: boolean
  /** "voice" = full bot-agent loop (auto-TTS + auto-mic). "text" = typed UX. */
  conversationMode?: ConversationMode
}) {
  // In voice mode we always speak + auto-open the mic. In text mode we
  // respect the manual 🔊 toggle the kid can flip in the bottom bar.
  const voiceAgent = VOICE_ENABLED && conversationMode === "voice"
  // Localhost-only audio debug panel: lets the dev play back the exact blob
  // the mic captured + see the transcript / status per turn. Renders inside
  // the chat/voice surface so it's visible regardless of which view is up.
  const [showAudioDebug, setShowAudioDebug] = useState(false)
  useEffect(() => {
    const h = typeof window !== "undefined" ? window.location.hostname : ""
    setShowAudioDebug(h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0")
  }, [])
  // Idempotent — SessionFlow arms it earlier; this is a safety net for any
  // path that mounts HintChat without going through SessionFlow.
  useEffect(() => {
    if (VOICE_ENABLED) armAudioUnlock()
  }, [])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [partial, setPartial] = useState("")
  const [voiceOn, setVoiceOn] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  // Live RMS (0..~0.1) from the VAD — used to draw a real mic level meter so
  // the kid can SEE that audio is being picked up. Zero when not recording.
  const [micLevel, setMicLevel] = useState(0)
  // Dev-only debug: URL + metadata for the last recorded mic blob so we can
  // play it back and hear what Azure actually received. Only populated on
  // localhost; the panel is rendered by SessionFlow when showDevTools is on.
  const [lastRecording, setLastRecording] = useState<{
    url: string
    bytes: number
    durMs: number
    peakRms: number
    speechMs: number
    reason: string
    mime: string
    transcript: string | null
    sttStatus: number | null
    sttMs: number | null
  } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inflightRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // Kept for text-mode recording path (still uses MediaRecorder since
  // latency isn't as critical there and kids can review the transcript
  // before sending). Voice-agent mode uses the PCM recorder below.
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const mediaChunksRef = useRef<Blob[]>([])
  const mediaStartedAtRef = useRef<number>(0)
  // PCM recorder for voice-agent mode. Emits 16 kHz mono WAV on stop so
  // Azure Speech gets its native ingest format and doesn't try to transcode
  // webm/opus internally (which was silently dropping most of the audio).
  const pcmRecRef = useRef<PcmRecorderHandle | null>(null)
  const lastStopReasonRef = useRef<"silence" | "max" | "empty" | "error" | "manual" | null>(null)
  const lastStopStatsRef = useRef<DetectorStats | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const spokenUpToRef = useRef(0)
  const vadCleanupRef = useRef<(() => void) | null>(null)
  // Long-lived mic stream — opened on first voice-agent call, reused across
  // every subsequent turn. Avoids the 200-500 ms getUserMedia cost per turn
  // AND is what barge-in needs (has to be already open while Dani speaks).
  const micStreamRef = useRef<MediaStream | null>(null)
  // Barge-in detector active during Dani's TTS playback. One per turn.
  const bargeInCleanupRef = useRef<(() => void) | null>(null)
  // Flipped to true when the kid has CONFIRMED speech onset (not just a
  // tentative pause). Read by the pump() loop to abort remaining TTS + by
  // callHint's finally to skip the normal post-TTS delay before startRecording.
  const bargeInFiredRef = useRef(false)
  // Set during the tentative window between "we heard a spike" and "kid is
  // really talking / really just breathed". Used so we don't accidentally
  // treat a breath-then-silence as a user turn.
  const bargeInTentativeRef = useRef(false)
  // Mirrors `turns` so callbacks fired from async pipelines (STT → submitAnswer,
  // setTimeout-driven mic reopens, barge-in handlers) read the CURRENT history
  // instead of the stale closure value from the render that scheduled them.
  // Without this, the kid's reply is appended to an old array, setTurns()
  // replaces state, and Dani's previous response vanishes — re-triggering the
  // opening "Målet er…" on every turn on multi-step tasks.
  const turnsRef = useRef<Turn[]>(turns)
  useEffect(() => {
    turnsRef.current = turns
  }, [turns])

  // Restore the kid's last voice preference from localStorage. Voice-agent
  // mode overrides this and is always on regardless of the stored value.
  useEffect(() => {
    if (!VOICE_ENABLED) return
    if (voiceAgent) {
      setVoiceOn(true)
      return
    }
    try {
      const stored = window.localStorage.getItem(VOICE_ON_STORAGE_KEY)
      if (stored === "1") setVoiceOn(true)
    } catch {}
  }, [voiceAgent])

  const assistantTurns = turns.filter(t => t.role === "assistant").length
  const atLimit = assistantTurns >= MAX_TURNS

  // Derive step-progression from all assistant turns. The AI emits
  // [progress done="A,B" current="C"] markers as steps are solved; we
  // accumulate them across the whole session. Re-extracted per render so
  // streaming and turn-commit stay in sync. Also scans the in-flight partial
  // so the checklist updates the moment Dani writes `[progress done="A"]`
  // without having to wait for end-of-stream.
  const stepProgress = useMemo(() => {
    const done = new Set<string>()
    let current: string | null = null
    const re = /\[progress(?:\s+done="([^"]*)")?(?:\s+current="([^"]*)")?\s*\]/g
    const sources = turns
      .filter(t => t.role === "assistant")
      .map(t => t.content)
    if (streaming && partial) sources.push(partial)
    for (const src of sources) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(src)) !== null) {
        if (m[1]) {
          m[1]
            .split(",")
            .map(s => s.trim())
            .filter(Boolean)
            .forEach(label => done.add(label))
        }
        if (m[2]) current = m[2].trim()
      }
    }
    return { done, current }
  }, [turns, streaming, partial])

  // Effective step list for the checklist. The extractor sometimes gives
  // us only a single step for composition/template tasks — Dani then
  // invents numbered pseudo-steps in the conversation ("1. hjem-type,
  // 2. etager, 3. rum, 4. møbel") and emits [progress done="1,2"]. When
  // that happens, synthesize a step list from the numeric labels we see
  // in the progress markers so the kid actually sees their 1/4, 2/4, 3/4
  // ticks land at the top of the screen.
  const displayedSteps = useMemo(() => {
    if (task.steps && task.steps.length > 1) return task.steps
    const numeric = [...stepProgress.done, stepProgress.current]
      .filter((v): v is string => !!v && /^\d+$/.test(v))
      .map(v => parseInt(v, 10))
    if (numeric.length === 0) return task.steps ?? null
    const max = Math.max(...numeric, 4)
    const count = Math.max(max, 4)
    // Empty `prompt` — the extractor didn't give us descriptions, and
    // "Trin 1" is redundant with the label. Expanded checklist treats an
    // empty prompt as "label alone" so we don't show "Trin 1 / Trin 1".
    return Array.from({ length: count }, (_, i) => ({
      label: String(i + 1),
      prompt: "",
    }))
  }, [task.steps, stepProgress.done, stepProgress.current])

  // Open the mic stream once, keep it for the whole voice-agent session.
  // Browsers cache the permission so the prompt only appears on first call.
  // Constraints explicitly enable echoCancellation / noiseSuppression / AGC
  // instead of relying on browser defaults which differ across Chrome / Safari.
  async function ensureMicStream(): Promise<MediaStream | null> {
    if (micStreamRef.current) {
      // Stream may have been silently stopped by the browser (tab hidden, device
      // change). Check track liveness and reopen if needed.
      const live = micStreamRef.current
        .getAudioTracks()
        .some(t => t.readyState === "live")
      if (live) return micStreamRef.current
      micStreamRef.current = null
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      })
      micStreamRef.current = stream
      const track = stream.getAudioTracks()[0]
      logDevEvent("info", "Mic-stream åbnet", {
        label: track?.label ?? "?",
        settings: track?.getSettings?.() ? "ok" : "n/a",
      })
      return stream
    } catch (err) {
      logDevEvent("ai-error", `Mic-fejl: ${(err as Error).message}`)
      setVoiceError("Mikrofon blev afvist. Tjek browser-tilladelser.")
      return null
    }
  }

  // Stops all in-flight voice output RIGHT NOW. Called when the task
  // completes, the session ends, voice mode is turned off, or the
  // component unmounts. Without this, audio plays on past the celebration
  // screen because the TTS pump() is still awaiting the current clip.
  function stopVoiceOutput() {
    // Pause + detach audio so the browser releases the decoder thread.
    if (audioElRef.current) {
      try {
        audioElRef.current.pause()
        audioElRef.current.src = ""
      } catch {
        // Non-fatal — we're tearing down anyway.
      }
      audioElRef.current = null
    }
    // Setting the barge-in flag makes pump() break out of its play loop,
    // drain remaining slots (revoking their object URLs), and resolve
    // ttsFinish — the callHint's `await ttsFinish` returns immediately.
    bargeInFiredRef.current = true
    bargeInCleanupRef.current?.()
    bargeInCleanupRef.current = null
    vadCleanupRef.current?.()
    vadCleanupRef.current = null
    if (mediaRecRef.current?.state === "recording") {
      try { mediaRecRef.current.stop() } catch {}
    }
    if (pcmRecRef.current) {
      const handle = pcmRecRef.current
      pcmRecRef.current = null
      // Stop returns a blob promise — discard it, we're aborting the session.
      void handle.stop().catch(() => {})
    }
    setSpeaking(false)
    setRecording(false)
    setMicLevel(0)
  }

  // Minimal unmount cleanup — release the mic + any detectors, but DO NOT
  // flip bargeInFiredRef or pause TTS. React strict mode in dev simulates
  // unmount→remount, and a full stopVoiceOutput() there would kill the very
  // first Dani message in-flight. On a real unmount, the pump's audio
  // element gets GC'd along with the component; slightly leaky but inaudible.
  function releaseMic() {
    bargeInCleanupRef.current?.()
    bargeInCleanupRef.current = null
    vadCleanupRef.current?.()
    vadCleanupRef.current = null
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop())
      micStreamRef.current = null
    }
  }

  // Full teardown — used when the user genuinely leaves the voice session
  // (flips voice mode off). Safe to call even when nothing is playing.
  function closeMicStream() {
    stopVoiceOutput()
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop())
      micStreamRef.current = null
      logDevEvent("info", "Mic-stream lukket")
    }
  }

  // Cleanup on unmount: minimal (just release mic) so strict-mode remount
  // doesn't nuke the ongoing TTS session.
  useEffect(() => {
    return () => { releaseMic() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Voice mode flipped off → full teardown is appropriate.
  useEffect(() => {
    if (!voiceAgent) closeMicStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceAgent])

  // When the task is marked done (Opgave løst ✓, Afslut samtale, session
  // limit reached) we need to kill any in-flight TTS audio immediately —
  // otherwise Dani keeps talking over the celebration screen. The celebration
  // panel renders instead of VoiceCanvas, but the audio element lives on the
  // component instance, not inside the unmounted subtree.
  useEffect(() => {
    if (completed) {
      stopVoiceOutput()
      logDevEvent("info", "Voice-output stoppet — opgave færdig")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed])

  // Kicks off /api/tts for one sentence and resolves with a blob-URL the
  // pump() loop can hand to the shared playback element. We deliberately
  // do NOT create a per-chunk new Audio() — iOS Safari only retains
  // autoplay permission on the single element primed by user gesture
  // (see lib/voice/audio-unlock.ts), so all chunks must share it.
  async function fetchSentenceAudio(
    text: string
  ): Promise<{ url: string } | null> {
    try {
      const ttsStart = performance.now()
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, subject: solve.subject }),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => "")
        logDevEvent("ai-error", `TTS chunk HTTP ${res.status}: ${detail.slice(0, 80)}`)
        return null
      }
      const provider = res.headers.get("x-voice-provider") ?? "?"
      const azureMs = Number(res.headers.get("x-voice-ms") ?? "0")
      const blob = await res.blob()
      const wall = Math.round(performance.now() - ttsStart)
      logDevEvent("info", "TTS ready", {
        provider,
        azureMs,
        wallMs: wall,
        chars: text.length,
        bytes: blob.size,
      })
      pushCostEvent({
        kind: "tts",
        provider: ttsProviderId(provider),
        chars: text.length,
        ms: wall,
      })
      const url = URL.createObjectURL(blob)
      return { url }
    } catch (err) {
      logDevEvent("ai-error", `TTS fetch exception: ${(err as Error).message}`)
      return null
    }
  }

  async function callHint(nextTurns: Turn[]) {
    if (inflightRef.current) return
    inflightRef.current = true
    bargeInFiredRef.current = false
    bargeInTentativeRef.current = false
    setStreaming(true)
    setPartial("")
    const start = performance.now()
    logDevEvent("info", "→ /api/hint", {
      subject: solve.subject,
      turn: aiTurnsBefore(nextTurns) + 1,
      chars: nextTurns.reduce((n, t) => n + t.content.length, 0),
    })

    // Kick off the mic stream in parallel with the LLM fetch — first call
    // pops the permission dialog, subsequent calls are instant. Barge-in
    // requires the stream to be already open when Dani starts speaking.
    if (voiceAgent) {
      void ensureMicStream()
    }

    // In text mode we buffer bytes behind MIN_THINKING_MS so the typing dots
    // get a visible beat. Voice-agent skips the gate entirely — spoken output
    // has its own natural pacing (TTS start-up latency is the gate).
    const useTypingGate = !voiceAgent
    let buffered = ""
    let gateOpen = !useTypingGate
    let firstTokenAt: number | null = null
    const gateTimer = useTypingGate
      ? window.setTimeout(() => {
          gateOpen = true
          if (buffered) setPartial(buffered)
        }, MIN_THINKING_MS)
      : null

    // Voice-agent chunked-TTS pipeline: fire fetches IN PARALLEL as sentence
    // boundaries arrive, play them back in ORDER. Previous impl chained via
    // promise.then which meant sentence N+1's fetch only started after N
    // finished playing — that's where the audible gap between sentences came
    // from. Now the next fetch is already complete and ready to play the
    // moment the current one ends, so playback is gapless (or as close as
    // the browser audio element can get).
    let acc = ""
    let spokenUpTo = 0
    const slots: Array<Promise<{ url: string } | null>> = []
    let playIdx = 0
    let pumping = false
    let streamDone = false
    let ttsFinishResolve: () => void = () => {}
    const ttsFinish = new Promise<void>(r => { ttsFinishResolve = r })

    const tryFinish = () => {
      if (streamDone && playIdx >= slots.length && !pumping) ttsFinishResolve()
    }

    const armBargeIn = () => {
      if (bargeInCleanupRef.current) return
      const stream = micStreamRef.current
      if (!stream) return
      // First-turn orientation is when Dani is framing the task (goal +
      // modality) — a breath-triggered cut there hurts more than mid-
      // exercise back-and-forth. Tighter thresholds protect that moment.
      const isFirstTurn = turnsRef.current.filter(t => t.role === "assistant").length === 0
      bargeInCleanupRef.current = startBargeInDetector(stream, {
        speechThreshold: isFirstTurn ? 0.075 : 0.055,
        sustainMs: isFirstTurn ? 400 : 250,
        confirmMs: isFirstTurn ? 800 : 600,
        falseAlarmQuietMs: 400,
        onTentative: () => {
          bargeInTentativeRef.current = true
          logDevEvent("info", "Barge-in · tentativ — pauser Dani")
          if (audioElRef.current) {
            try { audioElRef.current.pause() } catch {}
          }
        },
        onConfirmed: () => {
          bargeInFiredRef.current = true
          bargeInTentativeRef.current = false
          logDevEvent("info", "Barge-in ▶ bekræftet — kid afbryder Dani")
          if (audioElRef.current) {
            try { audioElRef.current.pause() } catch {}
          }
        },
        onFalseAlarm: () => {
          bargeInTentativeRef.current = false
          logDevEvent("info", "Barge-in · falsk alarm — genoptager Dani")
          // Resume the paused slot from where it stopped. pump()'s
          // bargeTimer is still ticking, but since bargeInFiredRef stayed
          // false, it won't trip done() — playback naturally continues.
          if (audioElRef.current && audioElRef.current.paused) {
            audioElRef.current.play().catch(() => {
              // Browser blocked the resume. Fall through: the bargeTimer
              // + onended will eventually resolve and the queue drains.
            })
          }
          // Re-arm a fresh detector so the kid can still interrupt later
          // in the same utterance.
          bargeInCleanupRef.current = null
          armBargeIn()
        },
      })
    }

    const pump = async () => {
      if (pumping) return
      pumping = true
      // Single shared <audio> element across the whole session — the one
      // primed by the first user tap. Reusing it (vs a fresh new Audio() per
      // chunk) is what keeps iOS Safari from re-blocking play() on chunk 2+.
      const playbackEl = getPlaybackAudio()
      while (playIdx < slots.length) {
        if (bargeInFiredRef.current) break
        const slot = await slots[playIdx]
        playIdx++
        if (!slot) continue
        if (bargeInFiredRef.current) {
          URL.revokeObjectURL(slot.url)
          continue
        }
        audioElRef.current = playbackEl
        setSpeaking(true)
        // Arm barge-in detector on first play (stream may not have been open
        // yet when pump started — ensureMicStream races with first fetch).
        armBargeIn()
        await new Promise<void>(resolve => {
          let resolved = false
          let bargeTimer: number | null = null
          const done = () => {
            if (resolved) return
            resolved = true
            if (bargeTimer !== null) window.clearInterval(bargeTimer)
            playbackEl.onended = null
            playbackEl.onerror = null
            URL.revokeObjectURL(slot.url)
            resolve()
          }
          playbackEl.onended = done
          playbackEl.onerror = done
          playbackEl.src = slot.url
          playbackEl.play().catch((err: Error) => {
            logDevEvent("ai-error", `play() blokeret: ${err.message}`)
            setVoiceError("Browseren blokerede lyd. Tryk på 🦁 for at tale.")
            done()
          })
          // audio.pause() doesn't fire 'ended', so we poll the barge-in flag
          // and resolve as soon as the kid interrupts. 40 ms tick is cheap.
          bargeTimer = window.setInterval(() => {
            if (bargeInFiredRef.current) done()
          }, 40)
        })
      }
      pumping = false
      // Drain any remaining slots (already-fetched but unplayed) to avoid
      // leaking their object URLs when barge-in aborted the queue.
      if (bargeInFiredRef.current) {
        while (playIdx < slots.length) {
          const slot = await slots[playIdx]
          playIdx++
          if (slot) URL.revokeObjectURL(slot.url)
        }
        tryFinish()
        return
      }
      // Race-guard: dispatchChunk may have pushed after our last check.
      if (playIdx < slots.length) {
        void pump()
        return
      }
      tryFinish()
    }

    const dispatchChunk = (sentence: string) => {
      // Subject-aware strip: for engelsk/tysk tasks, **bold** English
      // spans get converted to "..." quotes so the TTS pipeline catches
      // them and wraps in <lang xml:lang="en-US"> for English pronunciation
      // instead of letting Christel fake Danish-accented English.
      const cleaned = stripForTts(sentence, { subject: solve.subject }).trim()
      // Skip fragments with no speakable letters ("1.", "ca.", bare markers).
      if (!cleaned || !/\p{L}/u.test(cleaned)) return
      slots.push(fetchSentenceAudio(cleaned))
      void pump()
    }

    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: solve.sessionId,
          taskText: task.text,
          taskGoal: task.goal ?? null,
          taskSteps: task.steps ?? null,
          taskType: task.type ?? null,
          needsPaper: task.needsPaper ?? null,
          taskContext: task.context ?? null,
          subject: solve.subject,
          turns: nextTurns,
          childId,
          conversationMode,
        }),
      })
      const mocked = res.headers.get("X-Mocked") === "1"
      const reader = res.body?.getReader()
      if (!reader) throw new Error("no stream")
      const decoder = new TextDecoder()
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        acc += chunk
        if (firstTokenAt === null) {
          firstTokenAt = Math.round(performance.now() - start)
          logDevEvent("info", "first token", { ms: firstTokenAt })
        }
        // Strip the dev-cost sentinel from anything we display or speak.
        const display = splitUsageSentinel(acc).text
        if (useTypingGate) {
          if (gateOpen) setPartial(display)
          else buffered = display
        }
        if (voiceAgent) {
          // Dispatch every complete sentence that's arrived since last scan.
          // The first chunk gets an early-comma shortcut so "Okay," starts
          // TTS ~400 ms before the full sentence lands.
          while (true) {
            const isFirst = slots.length === 0 && spokenUpTo === 0
            const boundary = findNextSpeakableBoundary(display, spokenUpTo, {
              allowEarlyComma: isFirst,
            })
            if (boundary < 0) break
            const sentence = display.slice(spokenUpTo, boundary + 1)
            spokenUpTo = boundary + 1
            dispatchChunk(sentence)
          }
        }
      }
      if (gateTimer !== null) window.clearTimeout(gateTimer)

      // Text-mode respects MIN_THINKING_MS tail so the dots don't flash-and-go.
      // Voice mode never waited — first-token latency is already hidden by
      // TTS start-up.
      if (useTypingGate) {
        const elapsed = performance.now() - start
        if (elapsed < MIN_THINKING_MS) {
          await new Promise(r => setTimeout(r, MIN_THINKING_MS - elapsed))
        }
      }

      // Final split: the sentinel arrives in the last chunk. Push the cost
      // event and store only the visible text in the turns history.
      const { text: finalText, usage } = splitUsageSentinel(acc)
      acc = finalText
      if (usage) {
        pushCostEvent({
          kind: "hint",
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          model: modelIdFromDeployment(usage.model),
          ms: Math.round(performance.now() - start),
        })
      }

      setTurns(prev => [...prev, { role: "assistant", content: acc }])
      setPartial("")

      const totalMs = Math.round(performance.now() - start)
      const wordCount = acc.split(/\s+/).filter(Boolean).length
      logDevEvent("turn-ai", acc.slice(0, 80) + (acc.length > 80 ? "…" : ""), {
        chars: acc.length,
        words: wordCount,
        firstTokenMs: firstTokenAt ?? -1,
        totalMs,
        mocked,
      })
      if (wordCount > 70) {
        logDevEvent("ai-error", "⚠ Over 70-ord grænse", { words: wordCount })
      }
    } catch (err) {
      if (gateTimer !== null) window.clearTimeout(gateTimer)
      setPartial("")
      logDevEvent("ai-error", `Hint fejlede: ${(err as Error).message}`)
    } finally {
      setStreaming(false)
      if (voiceAgent) {
        // Block the mount-time speak-effect from double-speaking the turn we
        // just committed — chunked TTS already handled it.
        spokenUpToRef.current = nextTurns.length + 1
        // Flush anything after the last boundary (unterminated final sentence,
        // or a whole response with no periods). Skip tail if kid already
        // barged in — no point fetching more TTS just to throw it away.
        if (!bargeInFiredRef.current) {
          const tail = acc.slice(spokenUpTo).trim()
          if (tail) dispatchChunk(tail)
        }
        streamDone = true
        // Kick the pump one more time so it re-evaluates the queue against
        // streamDone. Handles the "no chunks ever dispatched" edge case too.
        void pump()
        // Wait for the whole queue to drain before opening the mic.
        await ttsFinish
        bargeInCleanupRef.current?.()
        bargeInCleanupRef.current = null
        setSpeaking(false)
        if (!atLimit && !completed) {
          if (bargeInFiredRef.current) {
            // Kid is already talking — skip the 150ms breath and record now.
            bargeInFiredRef.current = false
            void startRecording()
          } else {
            window.setTimeout(() => void startRecording(), 150)
          }
        }
      }
      inflightRef.current = false
    }
  }

  // Kick off first AI message on mount.
  useEffect(() => {
    if (turns.length === 0) {
      callHint([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [turns, partial])

  // Auto-complete when Dani signals the task is done — either via the
  // explicit [progress done="all"] marker (preferred) or via a verbal
  // "du er færdig"-style celebration in the latest turn (safety net for
  // when Dani forgets the marker, which happens on long chats).
  //
  // Without the verbal fallback, a session where Dani says "Godt gået —
  // du er **færdig**!" but skips the marker leaves the kid stranded on
  // the hint screen with no auto-flip to the celebration panel.
  //
  // Dev logging: surface BOTH the detection path AND whether we actually
  // flip completed, so "Dani says done but UI doesn't" bugs are easy to
  // diagnose.
  useEffect(() => {
    if (completed) return
    if (streaming) {
      if (stepProgress.done.has("all")) {
        logDevEvent("info", "Progress done=\"all\" set — awaiting stream end")
      }
      return
    }
    const lastAssistant = [...turns].reverse().find(t => t.role === "assistant")
    const verbalDone = lastAssistant
      ? hasVerbalCompletion(lastAssistant.content)
      : false
    const markerDone = stepProgress.done.has("all")
    if (!markerDone && !verbalDone) return
    logDevEvent("complete", "Auto-complete", {
      via: markerDone ? "progress=all" : "verbal",
      stepsDone: displayedSteps
        ? displayedSteps.filter(s => stepProgress.done.has(s.label)).length
        : 0,
      stepsTotal: displayedSteps?.length ?? 0,
    })
    onComplete(turns, buildCompletionStatus({
      displayedSteps,
      doneSet: stepProgress.done,
      userSignaledDone: true,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepProgress.done, streaming, completed, turns])

  // Log every fresh [progress …] marker as it lands so we can see when
  // Dani is trying to move progress and what the parsed values were.
  // Set-identity-based: only logs on additions, not every render.
  const loggedProgressRef = useRef<string>("")
  useEffect(() => {
    const doneKey = [...stepProgress.done].sort().join(",")
    const signature = `${doneKey}|${stepProgress.current ?? ""}`
    if (signature === loggedProgressRef.current) return
    loggedProgressRef.current = signature
    if (doneKey.length === 0 && !stepProgress.current) return
    logDevEvent("info", "[progress]", {
      done: doneKey || "—",
      current: stepProgress.current ?? "—",
    })
  }, [stepProgress])

  // Computes how much of the task was actually solved. "all" in the done-set
  // (Dani explicitly marked the whole task done) is always "completed"
  // regardless of step count. Otherwise count matching labels — if every
  // step got ticked, it's "completed"; some but not all → "partial"; none →
  // "abandoned" (kid hit done without making progress).
  function buildCompletionStatus(input: {
    displayedSteps: { label: string; prompt: string }[] | null | undefined
    doneSet: Set<string>
    userSignaledDone: boolean
  }): CompletionStatus {
    const steps = input.displayedSteps ?? []
    const stepsTotal = steps.length
    if (input.doneSet.has("all") || (stepsTotal === 0 && input.userSignaledDone)) {
      return { kind: "completed", stepsDone: stepsTotal, stepsTotal }
    }
    const stepsDone = steps.filter(s => input.doneSet.has(s.label)).length
    if (stepsTotal > 0 && stepsDone === stepsTotal) {
      return { kind: "completed", stepsDone, stepsTotal }
    }
    if (stepsDone > 0) return { kind: "partial", stepsDone, stepsTotal }
    return { kind: "abandoned", stepsDone, stepsTotal }
  }

  function completeWithStatus() {
    const status = buildCompletionStatus({
      displayedSteps,
      doneSet: stepProgress.done,
      userSignaledDone: true,
    })
    // Partial completion needs an explicit "yes, stop here" confirmation —
    // it's easy to hit Færdig by accident, and kids shouldn't feel they
    // have to finish 100% to not lose progress. "Completed" goes through
    // unchallenged (they finished; celebrate). "Abandoned" also goes
    // through — the flow already handled their explicit intent to quit.
    if (status.kind === "partial" && status.stepsTotal > 0) {
      const msg =
        `Du har lavet ${status.stepsDone} ud af ${status.stepsTotal} trin.\n\n` +
        `Skal vi stoppe her og gemme det du har gjort? (Det er helt OK — du behøver ikke at lave alt.)`
      if (!window.confirm(msg)) return
    }
    onComplete(turns, status)
  }

  // Re-focus the input as soon as streaming finishes so the kid can type the
  // next answer without clicking. `disabled` strips focus on submit, so we
  // restore it here. Skipped when atLimit (the input is gone).
  useEffect(() => {
    if (streaming || atLimit) return
    inputRef.current?.focus()
  }, [streaming, atLimit])

  // Speak the most recent assistant turn when voice is on. Tracks
  // `spokenUpToRef` so we only speak each turn once — re-renders on partial
  // updates don't re-trigger playback.
  //
  // Voice-agent mode drives TTS inline during streaming (sentence-chunked)
  // so this effect must bail — otherwise we'd re-speak the whole turn on top
  // of the chunks that already played.
  useEffect(() => {
    if (!VOICE_ENABLED || !voiceOn || streaming) return
    if (voiceAgent) return
    if (turns.length <= spokenUpToRef.current) return
    const last = turns[turns.length - 1]
    if (!last || last.role !== "assistant") {
      spokenUpToRef.current = turns.length
      return
    }
    const spokenText = stripForTts(last.content, { subject: solve.subject })
    spokenUpToRef.current = turns.length
    if (!spokenText) {
      // No speakable text (AI emitted only block markers). In voice-agent
      // mode we still need to open the mic so the loop continues.
      kickMicIfAgent()
      return
    }
    void speakText(spokenText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns, streaming, voiceOn])

  // Fallback mic opener — used when TTS can't speak for any reason (HTTP
  // error, autoplay block, empty text). In voice-agent mode the loop must
  // keep moving; in other modes we just leave the field as-is.
  function kickMicIfAgent() {
    if (!voiceAgent || atLimit || completed) return
    window.setTimeout(() => void startRecording(), 100)
  }

  async function speakText(text: string) {
    setVoiceError(null)
    setSpeaking(true)
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, subject: solve.subject }),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => "")
        logDevEvent("ai-error", `TTS fejlede: HTTP ${res.status} ${detail.slice(0, 120)}`)
        setVoiceError(`TTS: HTTP ${res.status}`)
        setSpeaking(false)
        kickMicIfAgent()
        return
      }
      const ms = Number(res.headers.get("x-voice-ms") ?? "0")
      const provider = res.headers.get("x-voice-provider") ?? "?"
      const blob = await res.blob()
      pushCostEvent({
        kind: "tts",
        provider: ttsProviderId(provider),
        chars: text.length,
        ms,
      })
      const url = URL.createObjectURL(blob)
      const el = getPlaybackAudio()
      audioElRef.current = el
      el.src = url
      el.onended = () => {
        URL.revokeObjectURL(url)
        setSpeaking(false)
        if (voiceAgent && !atLimit && !completed) {
          window.setTimeout(() => void startRecording(), 200)
        }
      }
      el.onerror = () => {
        URL.revokeObjectURL(url)
        logDevEvent("ai-error", "Audio element failed to load the TTS blob")
        setVoiceError("Audio kunne ikke afspilles")
        setSpeaking(false)
        kickMicIfAgent()
      }
      try {
        await el.play()
        logDevEvent("info", "TTS ▶", { provider, ms, chars: text.length })
      } catch (playErr) {
        // Autoplay policy / user-gesture requirement rejection is the usual
        // suspect here. Don't dead-end the conversation — log + fall back to
        // mic-open so the kid can keep going.
        logDevEvent(
          "ai-error",
          `play() blokeret: ${(playErr as Error).message}`
        )
        setVoiceError("Browseren blokerede lyd. Tryk på 🦁 for at tale.")
        setSpeaking(false)
        kickMicIfAgent()
      }
    } catch (err) {
      setSpeaking(false)
      setVoiceError((err as Error).message)
      logDevEvent("ai-error", `TTS exception: ${(err as Error).message}`)
      kickMicIfAgent()
    }
  }

  function toggleVoice() {
    setVoiceOn(prev => {
      const next = !prev
      try {
        window.localStorage.setItem(VOICE_ON_STORAGE_KEY, next ? "1" : "0")
      } catch {}
      if (!next && audioElRef.current) {
        audioElRef.current.pause()
        setSpeaking(false)
      }
      return next
    })
  }

  async function startRecording() {
    if (recording || transcribing || streaming) return
    // Text mode: using the mic is the "activation" for audio in text mode.
    // Flip voiceOn so Dani's replies read aloud for the rest of the session.
    // Voice-agent mode already has voiceOn forced on from its setup effect.
    if (!voiceAgent) setVoiceOn(true)
    // Reuse the long-lived mic stream when possible — avoids 200-500 ms
    // getUserMedia per turn + is how barge-in stays hot across turns.
    // Fall back to opening a fresh stream if we're not in voice-agent mode
    // or the stream was lost.
    let stream: MediaStream | null = null
    if (voiceAgent) {
      stream = await ensureMicStream()
    } else {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        })
      } catch (err) {
        logDevEvent("ai-error", `Mic-fejl: ${(err as Error).message}`)
        setVoiceError(`Mic: ${(err as Error).message}`)
        return
      }
    }
    if (!stream) return

    // Shared finalizer — called when the recorder stops (silence, manual,
    // empty, max). Sends the blob to STT unless VAD stats say it was noise.
    const finalize = async (blob: Blob, durMs: number, mime: string) => {
      const stats = lastStopStatsRef.current
      const reason = lastStopReasonRef.current ?? "unknown"
      logDevEvent("info", "Mic → stop", {
        reason,
        durMs,
        bytes: blob.size,
        mime,
        peakRms: stats ? stats.peakRms.toFixed(3) : "—",
        speechMs: stats?.speechMs ?? "—",
      })
      setLastRecording(prev => {
        if (prev?.url) URL.revokeObjectURL(prev.url)
        return {
          url: URL.createObjectURL(blob),
          bytes: blob.size,
          durMs,
          peakRms: stats?.peakRms ?? 0,
          speechMs: stats?.speechMs ?? 0,
          reason,
          mime,
          transcript: null,
          sttStatus: null,
          sttMs: null,
        }
      })
      if (reason === "empty") {
        setVoiceError("Jeg hørte ingen lyd. Prøv at tale lidt højere 🎙")
        if (voiceAgent && !atLimit && !completed) {
          window.setTimeout(() => void startRecording(), 400)
        }
        return
      }
      if (stats && stats.speechMs < 250 && reason !== "manual") {
        logDevEvent("info", "Skipper STT — for lidt tale", {
          speechMs: stats.speechMs,
          peakRms: stats.peakRms.toFixed(3),
        })
        setVoiceError("Jeg hørte kun baggrundsstøj. Sig det igen 🎙")
        if (voiceAgent && !atLimit && !completed) {
          window.setTimeout(() => void startRecording(), 400)
        }
        return
      }
      await sendRecording(blob, durMs)
    }

    if (voiceAgent) {
      // PCM path: capture 16 kHz mono WAV directly via Web Audio API. Azure
      // ingests this natively without its flaky internal transcoder.
      try {
        lastStopReasonRef.current = null
        mediaStartedAtRef.current = performance.now()
        const pcm = await startPcmRecorder(stream, {
          sampleRate: 16000,
          onLevel: rms => setMicLevel(rms),
        })
        pcmRecRef.current = pcm
        setRecording(true)
        logDevEvent("info", "Mic → start (PCM)", {
          source: `${pcm.sourceSampleRate} Hz`,
          target: `${pcm.targetSampleRate} Hz`,
        })
        vadCleanupRef.current = startSilenceDetector(stream, {
          onStop: async (reason, stats) => {
            lastStopReasonRef.current = reason
            lastStopStatsRef.current = stats
            setRecording(false)
            setMicLevel(0)
            const handle = pcmRecRef.current
            pcmRecRef.current = null
            vadCleanupRef.current?.()
            vadCleanupRef.current = null
            if (!handle) return
            const blob = await handle.stop()
            const durMs = Math.round(performance.now() - mediaStartedAtRef.current)
            await finalize(blob, durMs, blob.type || "audio/wav")
          },
        })
      } catch (err) {
        logDevEvent("ai-error", `PCM-mic-fejl: ${(err as Error).message}`)
        setVoiceError(`Mic: ${(err as Error).message}`)
      }
      return
    }

    // Text-mode (manual voice toggle): still MediaRecorder since the kid
    // reviews + edits the transcript before sending, and the Azure codec
    // issue matters less when there's a human-in-the-loop step.
    try {
      const mime = pickMicMime()
      mediaChunksRef.current = []
      lastStopReasonRef.current = null
      mediaStartedAtRef.current = performance.now()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      rec.ondataavailable = e => {
        if (e.data.size > 0) mediaChunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        vadCleanupRef.current?.()
        vadCleanupRef.current = null
        stream!.getTracks().forEach(t => t.stop())
        setMicLevel(0)
        const dur = Math.round(performance.now() - mediaStartedAtRef.current)
        const blob = new Blob(
          mediaChunksRef.current,
          { type: rec.mimeType || "audio/webm" }
        )
        void finalize(blob, dur, blob.type || "?")
      }
      rec.start()
      mediaRecRef.current = rec
      setRecording(true)
      logDevEvent("info", "Mic → start", { mime: mime || "default" })
    } catch (err) {
      logDevEvent("ai-error", `MediaRecorder-fejl: ${(err as Error).message}`)
      setVoiceError(`Mic: ${(err as Error).message}`)
    }
  }

  function stopRecording() {
    vadCleanupRef.current?.()
    vadCleanupRef.current = null
    lastStopReasonRef.current = "manual"
    // Voice-agent: PCM path. Stopping the silence-detector won't trigger
    // onStop (that's for silence/max/empty only), so we do the work here.
    if (voiceAgent && pcmRecRef.current) {
      const handle = pcmRecRef.current
      pcmRecRef.current = null
      setRecording(false)
      setMicLevel(0)
      void (async () => {
        const blob = await handle.stop()
        const durMs = Math.round(performance.now() - mediaStartedAtRef.current)
        const stats = lastStopStatsRef.current
        logDevEvent("info", "Mic → stop (manual)", {
          durMs,
          bytes: blob.size,
          peakRms: stats ? stats.peakRms.toFixed(3) : "—",
          speechMs: stats?.speechMs ?? "—",
        })
        setLastRecording(prev => {
          if (prev?.url) URL.revokeObjectURL(prev.url)
          return {
            url: URL.createObjectURL(blob),
            bytes: blob.size,
            durMs,
            peakRms: stats?.peakRms ?? 0,
            speechMs: stats?.speechMs ?? 0,
            reason: "manual",
            mime: blob.type || "audio/wav",
            transcript: null,
            sttStatus: null,
            sttMs: null,
          }
        })
        await sendRecording(blob, durMs)
      })()
      return
    }
    // Text-mode fallback.
    mediaRecRef.current?.stop()
    setRecording(false)
    setMicLevel(0)
  }

  async function sendRecording(blob: Blob, durMs: number) {
    setTranscribing(true)
    const sttStart = performance.now()
    // Language-aware STT: when the homework is English, Azure needs to be
    // told to recognize English — otherwise it mis-transcribes English
    // speech as garbled Danish ("I have a cat" → "ai hæv a kat"). But kids
    // doing English homework constantly slip into Danish for meta-comm
    // ("hvad skal jeg sige?", "jeg er forvirret"), and those get
    // transcribed as English gibberish ("A really familiar procedure is
    // Jessica"). Fix: pass BOTH locales and let the server run them in
    // parallel, then pick the higher-confidence result. Same pattern for
    // tysk. Trade-off: 2x STT cost per turn on non-Danish tasks.
    const sttLocales =
      solve.subject === "engelsk"
        ? "en-US,da-DK"
        : solve.subject === "tysk"
          ? "de-DE,da-DK"
          : "da-DK"
    try {
      const res = await fetch(
        `/api/stt?locale=${encodeURIComponent(sttLocales)}`,
        {
          method: "POST",
          headers: { "Content-Type": blob.type || "audio/webm" },
          body: blob,
        }
      )
      const sttMs = Math.round(performance.now() - sttStart)
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        logDevEvent("ai-error", `STT fejlede: HTTP ${res.status}`, {
          ms: sttMs,
          bytes: blob.size,
          mime: blob.type,
          body: body.slice(0, 200),
        })
        setLastRecording(prev =>
          prev ? { ...prev, sttStatus: res.status, sttMs, transcript: `HTTP ${res.status}` } : prev
        )
        setVoiceError(`STT fejl: HTTP ${res.status}. Prøv igen.`)
        if (voiceAgent && !atLimit && !completed) {
          window.setTimeout(() => void startRecording(), 400)
        }
        return
      }
      const { text, locale: pickedLocale, alternatives } = (await res.json()) as {
        text?: string
        locale?: string
        alternatives?: Array<{ text: string; confidence?: number }>
      }
      if (!text) {
        logDevEvent("info", "STT tom — intet at sende", {
          ms: sttMs,
          bytes: blob.size,
          locale: pickedLocale ?? sttLocales,
        })
        setLastRecording(prev =>
          prev ? { ...prev, sttStatus: 200, sttMs, transcript: "(tomt)" } : prev
        )
        logDevEvent("ai-error", "voiceError: STT tom — 'Jeg kunne ikke forstå det'")
        setVoiceError("Jeg kunne ikke forstå det. Prøv igen 🎙")
        if (voiceAgent && !atLimit && !completed) {
          window.setTimeout(() => void startRecording(), 400)
        }
        return
      }
      // When the STT ran in multi-locale mode, log both the candidate list
      // and which locale actually won. Confusing bugs on mixed-language
      // tasks show up here: if the kid spoke Danish on an engelsk task and
      // da-DK won with 0.85 vs en-US with 0.30, you'll see that at a glance.
      const isMulti = sttLocales.includes(",")
      const topConf = alternatives?.[0]?.confidence
      logDevEvent("info", "STT ✓", {
        ms: sttMs,
        chars: text.length,
        preview: text.slice(0, 40),
        ...(isMulti
          ? {
              locale: pickedLocale ?? "?",
              conf: topConf != null ? topConf.toFixed(2) : "—",
              candidates: sttLocales,
            }
          : {}),
      })
      pushCostEvent({
        kind: "stt",
        provider: "azure",
        audioSec: durMs / 1000,
        ms: sttMs,
      })
      setLastRecording(prev =>
        prev ? { ...prev, sttStatus: 200, sttMs, transcript: text } : prev
      )
      if (voiceAgent) {
        // Voice-agent: close the loop automatically. No text input involved.
        await submitAnswer(text)
      } else {
        // Manual voice toggle on text mode: paste transcript into the field so
        // the kid can review + edit before tapping Send.
        setInput(prev => (prev ? `${prev} ${text}` : text))
      }
    } catch (err) {
      logDevEvent("ai-error", `STT exception: ${(err as Error).message}`)
    } finally {
      setTranscribing(false)
    }
  }

  // Answer from an inline [tryit] block in a Dani bubble — same path as
  // typing in the main input, just sourced from the inline field.
  async function submitAnswer(text: string) {
    const trimmed = text.trim()
    if (!trimmed || streaming || atLimit) return
    const current = turnsRef.current
    const next: Turn[] = [...current, { role: "user", content: trimmed }]
    setTurns(() => next)
    logDevEvent("turn-user", `[tryit] ${trimmed.slice(0, 60)}`)
    await callHint(next)
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || streaming || atLimit) return
    setInput("")
    const current = turnsRef.current
    const next: Turn[] = [...current, { role: "user", content: text }]
    setTurns(() => next)
    logDevEvent("turn-user", text.slice(0, 80))
    await callHint(next)
  }

  async function askHint() {
    if (streaming || atLimit) return
    const hintText = "Jeg er stadig lidt i tvivl. Kan jeg få et lille hint?"
    const current = turnsRef.current
    const next: Turn[] = [
      ...current,
      { role: "user", content: hintText },
    ]
    setTurns(() => next)
    logDevEvent("turn-user", "Hint bedt om", { level: aiTurnsBefore(current) + 1 })
    await callHint(next)
  }

  function onMicPress() {
    if (recording) {
      stopRecording()
    } else {
      void startRecording()
    }
  }

  // Completion screen → celebration
  if (completed) {
    return (
      <CelebrationPanel
        onMoreHomework={onMoreHomework}
        onFinishSession={onFinishSession}
      />
    )
  }

  // Voice mode replaces the chat UI entirely — no bubbles, no input field.
  // The kid listens, speaks, listens. Visual blocks still render as
  // reinforcement for the current AI turn.
  if (voiceAgent) {
    return (
      <>
        <VoiceCanvas
          task={task}
          turns={turns}
          streaming={streaming}
          speaking={speaking}
          recording={recording}
          transcribing={transcribing}
          atLimit={atLimit}
          assistantTurns={assistantTurns}
          completed={completed}
          voiceError={voiceError}
          onMicPress={onMicPress}
          onComplete={completeWithStatus}
          onSubmitAnswer={submitAnswer}
          onDismissError={() => setVoiceError(null)}
          onRequestNewPhoto={onRequestNewPhoto}
          micLevel={micLevel}
          steps={displayedSteps}
          stepsDone={stepProgress.done}
          stepsCurrent={stepProgress.current}
        />
        {showAudioDebug && (
          <AudioDebugPanel
            data={lastRecording}
            onClose={() => {
              if (lastRecording?.url) URL.revokeObjectURL(lastRecording.url)
              setLastRecording(null)
            }}
          />
        )}
      </>
    )
  }

  // Render turns + any in-flight partial as a single list with stable keys.
  // When the stream completes and the partial flips over to `turns`, the
  // bubble at position `turns.length` keeps its key and just changes content.
  // No unmount/remount = no jump.
  const renderTurns: Turn[] =
    streaming && partial
      ? [...turns, { role: "assistant", content: partial }]
      : turns

  return (
    <div
      className="lr-hint-chat"
      style={{
        fontFamily: K.sans,
        color: K.ink,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        margin: "0 auto",
        background: K.bg,
        borderRadius: 24,
        boxShadow:
          "0 1px 0 rgba(31,27,51,0.04), 0 20px 48px -16px rgba(31,27,51,0.14)",
        border: "1px solid rgba(31,27,51,0.04)",
        overflow: "hidden",
      }}
    >
      {/* Task pill at top.
          Responsive padding: phones squeeze this down so the task headline
          + goal banner + checklist fit on a narrow viewport without
          horizontal clipping. */}
      <div
        style={{
          padding: "14px clamp(14px, 4vw, 22px) 16px",
          borderBottom: "1px solid rgba(31,27,51,0.06)",
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(8px)",
          overflowWrap: "anywhere",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: K.ink2,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          Opgave
        </div>
        <TaskHeadline task={task} />
        {displayedSteps && displayedSteps.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <StepChecklist
              steps={displayedSteps}
              done={stepProgress.done}
              current={stepProgress.current}
            />
          </div>
        )}
      </div>

      {/* Scrollable conversation — render turns + pending-partial as one
          list so the streaming bubble keeps its React key when it commits
          to turns (prevents the "jump" on stream-end). */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "22px 22px 14px",
        }}
      >
        {renderTurns.map((t, i) =>
          t.role === "assistant" ? (
            <DaniMessage
              key={i}
              content={t.content}
              onAnswer={submitAnswer}
              onRequestNewPhoto={onRequestNewPhoto}
              onEndTask={completeWithStatus}
            />
          ) : (
            <UserMessage key={i}>{t.content}</UserMessage>
          )
        )}
        {streaming && !partial && <DaniTyping />}
      </div>

      {/* Bottom input + action bar */}
      <div
        style={{
          padding: "14px 22px 22px",
          borderTop: "1px solid rgba(31,27,51,0.06)",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {atLimit ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              background: K.skySoft,
              borderRadius: 14,
              padding: "12px 14px",
              fontSize: 13,
              color: K.ink,
            }}
          >
            <span>Du har gjort det flot. Klar til at afslutte?</span>
            <button
              type="button"
              onClick={completeWithStatus}
              style={{
                border: "none",
                background: K.coral,
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                padding: "8px 14px",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Afslut
            </button>
          </div>
        ) : (
          <>
            {assistantTurns >= WARN_AT ? (
              <p style={{ margin: 0, fontSize: 12, color: K.coral }}>
                Du er tæt på grænsen. Få mere ud af dit næste svar.
              </p>
            ) : assistantTurns >= FINISH_NUDGE_AT ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  margin: 0,
                  padding: "8px 12px",
                  background: K.mintSoft,
                  border: `1px solid ${K.mintEdge}`,
                  borderRadius: 12,
                  fontSize: 13,
                  color: K.ink,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden style={{ flexShrink: 0 }}>
                  <circle cx="8" cy="8" r="6.5" fill="none" stroke={K.mintDeep} strokeWidth="1.5" />
                  <path d="M5 8.5l2 2 4-5" stroke={K.mintDeep} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>
                  Føler du dig færdig? Tryk <b>Opgave løst ✓</b> nedenfor.
                </span>
              </div>
            ) : null}
            <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
              {VOICE_ENABLED && (
                <VoiceInputButton
                  recording={recording}
                  transcribing={transcribing}
                  disabled={streaming}
                  onStart={startRecording}
                  onStop={stopRecording}
                />
              )}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={transcribing ? "Lytter …" : "Skriv dit svar …"}
                disabled={streaming || transcribing}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 46,
                  border: `1.5px solid rgba(31,27,51,0.1)`,
                  background: streaming ? "rgba(31,27,51,0.03)" : "#fff",
                  borderRadius: 12,
                  padding: "0 14px",
                  fontSize: 16,
                  fontWeight: 500,
                  fontFamily: K.sans,
                  color: K.ink,
                  outline: "none",
                  transition: "all 0.2s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = K.coral)}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(31,27,51,0.1)")}
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                style={{
                  height: 46,
                  padding: "0 18px",
                  borderRadius: 12,
                  border: "none",
                  background: input.trim() && !streaming ? K.ink : "#D8D3C4",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: input.trim() && !streaming ? "pointer" : "default",
                  fontFamily: "inherit",
                  transition: "background 0.2s",
                }}
              >
                Send
              </button>
            </form>

            <div style={{ display: "flex", gap: 10 }}>
              <BigBtn
                tone="ghost"
                onClick={askHint}
                style={{ flex: 1 }}
                disabled={streaming}
              >
                {assistantTurns <= 1 ? "Giv mig et hint" : "Endnu et hint"}
              </BigBtn>
              {assistantTurns >= 1 && (
                <BigBtn tone="coral" onClick={completeWithStatus} style={{ flex: 1 }}>
                  Opgave løst ✓
                </BigBtn>
              )}
            </div>
          </>
        )}
      </div>
      {showAudioDebug && (
        <AudioDebugPanel
          data={lastRecording}
          onClose={() => {
            if (lastRecording?.url) URL.revokeObjectURL(lastRecording.url)
            setLastRecording(null)
          }}
        />
      )}
    </div>
  )
}

// Compact task headline for the hint screen. Dani narrates the task
// itself, so we only show the short title here — no raw task text.
function TaskHeadline({ task }: { task: Task }) {
  const headline = task.title || shortFallback(task.text)
  return (
    <div
      style={{
        fontFamily: K.serif,
        fontSize: 20,
        fontWeight: 600,
        color: K.ink,
        marginTop: 4,
        lineHeight: 1.25,
      }}
    >
      {headline}
    </div>
  )
}

// ─── Dev audio debug panel (localhost only) ──────────────────────────────
//
// Floating card at the bottom-right of the voice/chat surface. Shows the
// exact blob the mic captured for the most recent recording, plus the VAD
// stats and the STT result (or error). Lets you instantly tell "did the
// mic capture audio?" apart from "did Azure understand it?".

function AudioDebugPanel({
  data,
  onClose,
}: {
  data: {
    url: string
    bytes: number
    durMs: number
    peakRms: number
    speechMs: number
    reason: string
    mime: string
    transcript: string | null
    sttStatus: number | null
    sttMs: number | null
  } | null
  onClose: () => void
}) {
  // Fetch AI mode once on mount — tells the admin whether /api/solve +
  // /api/hint are hitting live Azure or canned mocks. Lets us distinguish
  // "Azure STT returned empty" from "AI_MODE=test, mock flow".
  const [aiMode, setAiMode] = useState<"live" | "test" | "unknown">("unknown")
  useEffect(() => {
    fetch("/api/ai-mode")
      .then(r => r.json())
      .then(d => {
        if (d?.mode === "live" || d?.mode === "test") setAiMode(d.mode)
      })
      .catch(() => {})
  }, [])

  if (!data) return null
  const sttLabel =
    data.sttStatus === null
      ? "(venter)"
      : data.transcript ?? `HTTP ${data.sttStatus}`
  return (
    <div
      style={{
        position: "fixed",
        bottom: 14,
        right: 14,
        zIndex: 100,
        width: 320,
        maxWidth: "92vw",
        background: "rgba(31,27,51,0.94)",
        color: "#fff",
        borderRadius: 14,
        padding: "12px 14px",
        fontFamily: "monospace, ui-monospace",
        fontSize: 11,
        lineHeight: 1.5,
        boxShadow: "0 12px 36px -16px rgba(0,0,0,0.5)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          🎙 AUDIO DEBUG
          <span
            title={
              aiMode === "live"
                ? "Kalder rigtig Azure (/api/solve + /api/hint)"
                : aiMode === "test"
                  ? "Mock — returnerer dåse-svar"
                  : "Ukendt tilstand"
            }
            style={{
              background:
                aiMode === "live"
                  ? "#7ACBA2"
                  : aiMode === "test"
                    ? "#FFB07C"
                    : "rgba(255,255,255,0.2)",
              color: "#1F2D1A",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 0.5,
              padding: "2px 6px",
              borderRadius: 999,
            }}
          >
            {aiMode.toUpperCase()}
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Luk debug-panel"
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            opacity: 0.5,
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
            padding: 2,
          }}
        >
          ×
        </button>
      </div>

      <audio
        controls
        src={data.url}
        style={{ width: "100%", marginBottom: 8, height: 30 }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2px 10px",
          opacity: 0.85,
        }}
      >
        <span>dur</span>
        <span>{data.durMs} ms</span>
        <span>bytes</span>
        <span>{Math.round(data.bytes / 1024)} KB</span>
        <span>mime</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {data.mime}
        </span>
        <span>peakRms</span>
        <span style={{ color: data.peakRms > 0.02 ? "#7ACBA2" : "#D14848" }}>
          {data.peakRms.toFixed(3)}
        </span>
        <span>speechMs</span>
        <span style={{ color: data.speechMs >= 250 ? "#7ACBA2" : "#D14848" }}>
          {data.speechMs}
        </span>
        <span>reason</span>
        <span>{data.reason}</span>
        <span>STT</span>
        <span>
          {data.sttStatus ?? "—"}
          {data.sttMs !== null ? ` · ${data.sttMs}ms` : ""}
        </span>
      </div>

      <div
        style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div style={{ opacity: 0.6, fontSize: 10, marginBottom: 2 }}>TRANSCRIPT</div>
        <div
          style={{
            color: data.transcript && data.transcript !== "(tomt)" ? "#7ACBA2" : "#FFB07C",
            wordBreak: "break-word",
          }}
        >
          {sttLabel}
        </div>
      </div>
    </div>
  )
}

// ─── Message bubbles ──────────────────────────────────────────────────────

function DaniMessage({
  content,
  onAnswer,
  onRequestNewPhoto,
  onEndTask,
}: {
  content: string
  onAnswer?: (value: string) => void
  onRequestNewPhoto?: () => void
  onEndTask?: () => void
}) {
  const { type } = useCompanion()
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
      <div style={{ flexShrink: 0 }}>
        <Companion type={type ?? DEFAULT_COMPANION} mood="happy" size={44} />
      </div>
      <div
        style={{
          background: K.skySoft,
          borderRadius: "4px 18px 18px 18px",
          padding: "12px 14px",
          color: K.ink,
          fontSize: 15,
          lineHeight: 1.5,
          animation: "pop 0.35s",
          maxWidth: "85%",
        }}
      >
        {renderWithBlocks(content, {
          onAnswer,
          onRequestNewPhoto,
          onEndTask,
        })}
      </div>
    </div>
  )
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          background: K.coral,
          color: "#fff",
          borderRadius: "18px 18px 4px 18px",
          padding: "10px 14px",
          fontSize: 15,
          lineHeight: 1.5,
          maxWidth: "85%",
          boxShadow: "0 4px 12px -6px rgba(122,203,162,0.6)",
        }}
      >
        {typeof children === "string" ? <RichText text={children} /> : children}
      </div>
    </div>
  )
}

function DaniTyping() {
  const { type } = useCompanion()
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
      <div style={{ flexShrink: 0 }}>
        <Companion type={type ?? DEFAULT_COMPANION} mood="thinking" size={44} />
      </div>
      <div
        style={{
          background: K.skySoft,
          borderRadius: "4px 18px 18px 18px",
          padding: "14px 16px",
          display: "inline-flex",
          gap: 5,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: 999,
              background: "rgba(31,27,51,0.4)",
              animation: "loading-dot 1.4s ease-in-out infinite",
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Shared button ───────────────────────────────────────────────────────

function BigBtn({
  children,
  onClick,
  tone = "coral",
  style = {},
  icon,
  disabled = false,
}: {
  children: React.ReactNode
  onClick: () => void
  tone?: "coral" | "ghost" | "ink"
  style?: React.CSSProperties
  icon?: React.ReactNode
  disabled?: boolean
}) {
  const bg = tone === "coral" ? K.coral : tone === "ink" ? K.ink : "#fff"
  const fg = tone === "ghost" ? K.ink : "#fff"
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#D8D3C4" : bg,
        color: disabled ? "rgba(31,27,51,0.5)" : fg,
        border: tone === "ghost" ? `1.5px solid ${K.ink}20` : "none",
        height: 48,
        borderRadius: 999,
        padding: "0 20px",
        fontFamily: "inherit",
        fontSize: 15,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow:
          tone === "coral" && !disabled
            ? "0 6px 16px -6px rgba(122,203,162,0.6), inset 0 -2px 0 rgba(0,0,0,0.08)"
            : "none",
        transition: "transform 0.12s ease",
        ...style,
      }}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      {icon}
      {children}
    </button>
  )
}

// ─── Voice input button + MediaRecorder helpers ─────────────────────────
//
// Single "activation button" for text mode: tapping the mic starts speech
// input AND implicitly enables audible replies (startRecording sets voiceOn).
// One control, both directions. Idle → mint outline, recording → mint filled
// with pulse ring, transcribing → three dots.

function VoiceInputButton({
  recording,
  transcribing,
  disabled,
  onStart,
  onStop,
}: {
  recording: boolean
  transcribing: boolean
  disabled: boolean
  onStart: () => void
  onStop: () => void
}) {
  const busy = transcribing || disabled
  const active = recording
  const label = transcribing
    ? "Skriver det du sagde"
    : active
      ? "Stop og send"
      : "Tal ind"
  return (
    <button
      type="button"
      onClick={active ? onStop : onStart}
      disabled={busy && !active}
      aria-label={label}
      title={label}
      style={{
        position: "relative",
        width: 46,
        height: 46,
        flexShrink: 0,
        borderRadius: 12,
        border: active ? "none" : `1.5px solid rgba(31,27,51,0.1)`,
        background: active ? K.mintDeep : "#fff",
        color: active ? "#fff" : K.ink,
        cursor: busy && !active ? "not-allowed" : "pointer",
        opacity: busy && !active ? 0.5 : 1,
        fontFamily: "inherit",
        transition: "all 0.18s",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {active && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: 14,
            border: `2px solid ${K.mintDeep}`,
            opacity: 0.35,
            animation: "voiceBtnPulse 1.2s ease-in-out infinite",
          }}
        />
      )}
      {transcribing ? (
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>…</span>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <rect
            x="9"
            y="3"
            width="6"
            height="12"
            rx="3"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M5 11a7 7 0 0 0 14 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 18v3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M9 21h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
      <style>{`
        @keyframes voiceBtnPulse {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50%      { transform: scale(1.08); opacity: 0; }
        }
      `}</style>
    </button>
  )
}

function pickMicMime(): string {
  if (typeof MediaRecorder === "undefined") return ""
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m
  }
  return ""
}

// Find the next sentence terminator in `text` starting at `fromIdx`. Returns
// the index of the terminator (. ! ? , depending on flags) itself, or -1 if
// none is complete yet.
//
// Rules tuned for the Danish hint stream:
//  - Terminators inside visual-block markers like [tenframe a="4"] don't
//    count (the markup isn't spoken, and a stray `.` inside an attribute
//    would split the block in two).
//  - A lone "1." list-marker or "ca." abbreviation has no space before the
//    dot, so we require at least one whitespace character between fromIdx
//    and the terminator. That lets "Okay så prøv." fire but skips fragments.
//  - The terminator must be followed by whitespace or end-of-buffer — so
//    decimals like "3.5" don't trigger a false boundary while streaming.
//  - When `allowEarlyComma` is set (only for the very first chunk of a
//    reply), a comma after a short opener ("Okay," "Fint,") counts as a
//    boundary. This gets TTS playing ~400 ms sooner on turns that start
//    with a conversational acknowledgement, without over-chunking the rest.
function findNextSpeakableBoundary(
  text: string,
  fromIdx: number,
  opts?: { allowEarlyComma?: boolean }
): number {
  let depth = 0
  let sawSpace = false
  for (let i = fromIdx; i < text.length; i++) {
    const ch = text[i]
    if (ch === "[") {
      depth++
      continue
    }
    if (ch === "]") {
      if (depth > 0) depth--
      continue
    }
    if (depth > 0) continue
    if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
      sawSpace = true
      continue
    }
    if ((ch === "." || ch === "!" || ch === "?") && sawSpace) {
      const next = text[i + 1]
      if (
        next === undefined ||
        next === " " ||
        next === "\n" ||
        next === "\r" ||
        next === "\t"
      ) {
        return i
      }
    }
    // Conversational-opener shortcut. Only during the first chunk of a reply
    // (caller passes allowEarlyComma) AND only if the comma sits within the
    // first 14 chars of the sentence (guards against mid-sentence commas
    // like "når vi lægger tiere, og enere" → stays on period-boundary).
    if (
      opts?.allowEarlyComma &&
      ch === "," &&
      sawSpace &&
      i - fromIdx <= 14
    ) {
      const next = text[i + 1]
      if (next === " " || next === "\n" || next === "\r" || next === "\t") {
        return i
      }
    }
  }
  return -1
}

// ─── Markdown-ish rendering ──────────────────────────────────────────────

function RichText({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <>
      {lines.map((line, i) => {
        if (line.trim() === "") return <br key={i} />
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <span key={i}>
            {i > 0 && lines[i - 1].trim() !== "" && <br />}
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <strong key={j} style={{ fontWeight: 700 }}>
                    {part.slice(2, -2)}
                  </strong>
                )
              }
              return <span key={j}>{part}</span>
            })}
          </span>
        )
      })}
    </>
  )
}

// ─── Celebration screen (prototype-matched) ──────────────────────────────

function CelebrationPanel({
  onMoreHomework,
  onFinishSession,
}: {
  onMoreHomework: () => void
  onFinishSession: () => void
}) {
  const { type } = useCompanion()
  const companionType = type ?? DEFAULT_COMPANION
  const companion = companionByType(companionType)
  const confettiColors = [K.coral, K.butter, K.sky, K.mint, K.plum, companion.accent]

  // Auto-advance back to the task picker after a short celebration. Kid
  // gets the cheer + confetti, then flows naturally back to "what's next?"
  // without having to tap. Tapping "Jeg er færdig for i dag" cancels.
  // Tapping anywhere else (including the countdown button) just advances
  // immediately. A ref tracks whether we've advanced or been cancelled so
  // the setInterval doesn't double-fire.
  const AUTO_NEXT_SECONDS = 4
  const [secondsLeft, setSecondsLeft] = useState(AUTO_NEXT_SECONDS)
  const resolvedRef = useRef(false)
  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft(s => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => {
    if (secondsLeft <= 0 && !resolvedRef.current) {
      resolvedRef.current = true
      onMoreHomework()
    }
  }, [secondsLeft, onMoreHomework])
  const cancelAutoAdvance = () => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    onFinishSession()
  }
  const advanceNow = () => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    onMoreHomework()
  }
  return (
    <div
      style={{
        fontFamily: K.sans,
        color: K.ink,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        height: "100%",
        width: "100%",
        padding: "40px 24px 32px",
        position: "relative",
        overflow: "hidden",
        // Match HintChat's card treatment so the done screen sits in the
        // same rounded panel on desktop. On mobile the parent gives it full
        // width, so the card corners still "fit" the viewport.
        background: K.bg,
        borderRadius: 24,
        boxShadow:
          "0 1px 0 rgba(31,27,51,0.04), 0 20px 48px -16px rgba(31,27,51,0.14)",
        border: "1px solid rgba(31,27,51,0.04)",
      }}
    >
      {/* Soft radial glow behind the companion — fades INTO the card bg
          (K.bg) so the gradient edge is invisible against the panel. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 520px 380px at 50% 28%, ${K.butterSoft} 0%, ${K.bg} 80%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: -20,
            left: `${(i * 37) % 100}%`,
            width: 8,
            height: 12,
            borderRadius: 2,
            background: confettiColors[i % confettiColors.length],
            animation: `fall ${2 + (i % 3) * 0.4}s ${i * 0.08}s linear infinite`,
            transform: `rotate(${i * 23}deg)`,
          }}
        />
      ))}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ position: "relative" }}>
          <Sparkles count={8} color={companion.accent} />
          <Companion type={companionType} mood="cheer" size={140} bobbing />
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: K.serif,
              fontSize: 32,
              fontWeight: 700,
              color: K.ink,
              letterSpacing: -0.5,
            }}
          >
            Du klarede det!
          </div>
          <div
            style={{
              fontSize: 15,
              color: K.ink2,
              marginTop: 8,
              maxWidth: 260,
              lineHeight: 1.4,
            }}
          >
            Og det bedste: <b>du</b> fandt svaret. Jeg viste dig bare stierne.
          </div>
        </div>

      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: "100%",
          maxWidth: 420,
          zIndex: 1,
        }}
      >
        <BigBtn tone="coral" onClick={advanceNow} style={{ width: "100%" }}>
          {secondsLeft > 0 ? `Næste opgave om ${secondsLeft}…` : "Næste opgave"}
        </BigBtn>
        <BigBtn tone="ghost" onClick={cancelAutoAdvance} style={{ width: "100%" }}>
          Jeg er færdig for i dag
        </BigBtn>
      </div>
    </div>
  )
}

