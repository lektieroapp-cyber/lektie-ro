"use client"

import { useRef, useState } from "react"
import { startPcmRecorder, type PcmRecorderHandle } from "@/lib/voice/pcm-recorder"
import type { VoiceMode } from "@/lib/voice-mode"

type Props = {
  mode: VoiceMode
  configured: boolean
}

type SttResult = {
  text?: string
  ms?: number
  error?: string
  // Blob debug info — lets the admin play back the audio that was sent
  // and see at a glance whether the mic captured real speech or silence.
  blobUrl?: string
  blobBytes?: number
  durMs?: number
  mime?: string
  // What the browser actually gave us — sampleRate is critical since Azure
  // STT handles 48 kHz webm flakily compared to 16 kHz native.
  trackSampleRate?: number
  trackChannels?: number
  trackLabel?: string
  // Azure's verdict + alternative candidates. Present when Azure returned
  // multiple N-best candidates — a tell that codec/sample-rate handoff is
  // tripping up the top-rank pick.
  status?: string
  alternatives?: Array<{ text: string; confidence?: number }>
}
type TtsResult = { url?: string; ms?: number; error?: string }

const DEFAULT_TTS_TEXT =
  "Okay, 24 plus 17. Vi starter med tierne først. Hvad er 20 plus 10?"

export function VoiceTester({ mode, configured }: Props) {
  return (
    <>
      <SttCard configured={configured} />
      <TtsCard mode={mode} configured={configured} />
    </>
  )
}

function SttCard({ configured }: { configured: boolean }) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [result, setResult] = useState<SttResult | null>(null)
  const pcmRef = useRef<PcmRecorderHandle | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startedAtRef = useRef<number>(0)
  const prevBlobUrlRef = useRef<string | null>(null)

  async function start() {
    // Revoke the previous blob URL so we don't leak when the admin records
    // back-to-back. setResult(null) alone doesn't release the object URL.
    if (prevBlobUrlRef.current) {
      URL.revokeObjectURL(prevBlobUrlRef.current)
      prevBlobUrlRef.current = null
    }
    setResult(null)
    if (!configured) {
      setResult({ error: "Azure Speech er ikke konfigureret" })
      return
    }
    try {
      // Explicit constraints mirror the main kid-facing flow. Browsers
      // don't all enable AEC/NS/AGC by default — making them explicit means
      // the admin tester hears the same audio the kids do.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      })
      streamRef.current = stream
      startedAtRef.current = performance.now()
      // Start PCM recording via Web Audio API → produces 16 kHz WAV on stop.
      // Bypasses MediaRecorder's webm/opus entirely so Azure gets a format
      // it decodes natively without its flaky internal transcoder.
      pcmRef.current = await startPcmRecorder(stream, { sampleRate: 16000 })
      setRecording(true)
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "mic_error" })
    }
  }

  async function stop() {
    const pcm = pcmRef.current
    const stream = streamRef.current
    pcmRef.current = null
    streamRef.current = null
    setRecording(false)
    if (!pcm) return
    const blob = await pcm.stop()
    if (stream) stream.getTracks().forEach(t => t.stop())
    const durMs = Math.round(performance.now() - startedAtRef.current)
    void send(blob, durMs, {
      trackSampleRate: pcm.targetSampleRate,
      trackChannels: 1,
      trackLabel: `PCM ${pcm.sourceSampleRate / 1000}→${pcm.targetSampleRate / 1000} kHz`,
    })
  }

  async function send(
    blob: Blob,
    durMs: number,
    trackInfo: {
      trackSampleRate?: number
      trackChannels?: number
      trackLabel?: string
    }
  ) {
    setTranscribing(true)
    // Show the blob info + playback immediately, before STT returns. That
    // way the admin can hear the audio while Azure is still processing.
    const blobUrl = URL.createObjectURL(blob)
    prevBlobUrlRef.current = blobUrl
    setResult({
      blobUrl,
      blobBytes: blob.size,
      durMs,
      mime: blob.type || "?",
      ...trackInfo,
    })
    try {
      const res = await fetch("/api/stt?provider=azure", {
        method: "POST",
        headers: { "Content-Type": blob.type || "audio/webm" },
        body: blob,
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setResult(prev => ({
          ...prev,
          error:
            typeof j?.detail === "string"
              ? j.detail
              : j?.error ?? `HTTP ${res.status}`,
        }))
        return
      }
      const j = (await res.json()) as {
        text?: string
        ms?: number
        status?: string
        alternatives?: Array<{ text: string; confidence?: number }>
      }
      setResult(prev => ({
        ...prev,
        text: j.text,
        ms: j.ms,
        status: j.status,
        alternatives: j.alternatives,
      }))
    } catch (err) {
      setResult(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : "fetch_failed",
      }))
    } finally {
      setTranscribing(false)
    }
  }

  return (
    <section
      className="mt-6 rounded-card bg-white p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="text-base font-semibold text-ink">Test tale-til-tekst</h3>
      <p className="mt-1 text-sm text-muted">
        Optag op til 15 sek dansk tale. Azure transskriberer det.
      </p>

      <div className="mt-5 flex items-center gap-3">
        {!recording ? (
          <button
            type="button"
            onClick={() => void start()}
            disabled={transcribing || !configured}
            className="cursor-pointer rounded-full bg-mint-deep px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            🎙 Start optagelse
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void stop()}
            className="cursor-pointer rounded-full bg-clay px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            ⏹ Stop
          </button>
        )}
        {transcribing && <span className="text-xs text-muted">Transskriberer …</span>}
      </div>

      <TranscriptCard result={result} />
    </section>
  )
}

function TtsCard({
  mode,
  configured,
}: {
  mode: VoiceMode
  configured: boolean
}) {
  const [text, setText] = useState(DEFAULT_TTS_TEXT)
  const [playing, setPlaying] = useState(false)
  const [result, setResult] = useState<TtsResult | null>(null)

  async function play() {
    if (!configured) {
      setResult({ error: "Azure Speech er ikke konfigureret" })
      return
    }
    setPlaying(true)
    setResult(null)
    try {
      const res = await fetch("/api/tts?provider=azure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: mode.azureVoice }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setResult({
          error:
            typeof j?.detail === "string"
              ? j.detail
              : j?.error ?? `HTTP ${res.status}`,
        })
        return
      }
      const ms = Number(res.headers.get("x-voice-ms") ?? "0")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setResult({ url, ms })
    } finally {
      setPlaying(false)
    }
  }

  return (
    <section
      className="mt-6 rounded-card bg-white p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="text-base font-semibold text-ink">Test tekst-til-tale</h3>
      <p className="mt-1 text-sm text-muted">
        Rediger teksten og tryk Spil. Aktiv stemme: <code>{mode.azureVoice}</code>.
      </p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
        maxLength={500}
        className="mt-4 w-full resize-none rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-[15px] text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      <div className="mt-4 rounded-lg bg-canvas/60 p-4">
        <button
          type="button"
          onClick={play}
          disabled={playing || !configured}
          className="cursor-pointer rounded-full bg-mint-deep px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {playing ? "Henter …" : "▶ Spil"}
        </button>
        {result?.error && (
          <div className="mt-3 text-sm text-clay">{result.error}</div>
        )}
        {result?.url && (
          <>
            <audio src={result.url} controls autoPlay className="mt-3 w-full" />
            <div className="mt-1 text-[11px] text-muted">{result.ms} ms</div>
          </>
        )}
      </div>
    </section>
  )
}

function TranscriptCard({ result }: { result: SttResult | null }) {
  if (!result) {
    return (
      <div className="mt-5 rounded-lg bg-canvas/60 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">
          Transskription
        </div>
        <div className="mt-2 text-sm text-ink/40">-</div>
      </div>
    )
  }

  const hasBlob = !!result.blobUrl
  const waitingOnStt = hasBlob && result.text === undefined && !result.error
  const transcriptTone =
    result.error
      ? "text-clay"
      : result.text
        ? "text-ink"
        : "text-clay"

  return (
    <div className="mt-5 flex flex-col gap-3 rounded-lg bg-canvas/60 p-4">
      {hasBlob && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Optaget lyd
          </div>
          <audio
            controls
            src={result.blobUrl}
            className="mt-2 w-full"
            style={{ height: 32 }}
          />
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
            {result.durMs !== undefined && <span>dur: {result.durMs} ms</span>}
            {result.blobBytes !== undefined && (
              <span>bytes: {Math.round(result.blobBytes / 1024)} KB</span>
            )}
            {result.mime && (
              <span className="truncate font-mono" title={result.mime}>
                {result.mime}
              </span>
            )}
            {result.trackSampleRate !== undefined && (
              <span
                className={
                  result.trackSampleRate !== 16000 ? "text-clay" : "text-mint-deep"
                }
                title={
                  result.trackSampleRate === 16000
                    ? "Browser honored 16 kHz request. Azure takes this natively."
                    : `Browser gave ${result.trackSampleRate / 1000} kHz. Azure transcodes down to 16 kHz; sometimes loses the start.`
                }
              >
                {result.trackSampleRate / 1000} kHz
              </span>
            )}
            {result.trackChannels !== undefined && (
              <span>{result.trackChannels} ch</span>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">
          Transskription{" "}
          {waitingOnStt && (
            <span className="ml-1 font-normal normal-case italic opacity-70">
              — venter på Azure …
            </span>
          )}
        </div>
        {result.error ? (
          <div className={`mt-2 text-sm ${transcriptTone}`}>{result.error}</div>
        ) : waitingOnStt ? (
          <div className="mt-2 text-sm text-ink/40">-</div>
        ) : (
          <>
            <div className={`mt-2 text-sm ${transcriptTone}`}>
              {result.text || "(tom)"}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted">
              {result.ms !== undefined && <span>{result.ms} ms</span>}
              {result.status && (
                <span>
                  status:{" "}
                  <span
                    className={
                      result.status === "Success" ? "text-mint-deep" : "text-clay"
                    }
                  >
                    {result.status}
                  </span>
                </span>
              )}
            </div>
            {result.alternatives && result.alternatives.length > 1 && (
              <div className="mt-2 rounded-md bg-white/60 p-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Azure's top-{result.alternatives.length} kandidater
                </div>
                <ul className="mt-1 space-y-0.5 text-xs">
                  {result.alternatives.map((a, i) => (
                    <li key={i} className="flex items-baseline gap-2">
                      <span className="tabular-nums text-muted">
                        {a.confidence !== undefined
                          ? a.confidence.toFixed(2)
                          : "-"}
                      </span>
                      <span className="text-ink">{a.text || "(tom)"}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-1 text-[10px] text-muted">
                  Hvis disse kandidater er meget kortere end det du sagde →
                  Azure får ikke hele lyden. Codec/sample-rate handoff
                  skal fixes (server-side transcode til 16 kHz WAV).
                </div>
              </div>
            )}
            {!result.text && !result.error && (
              <div className="mt-2 text-[11px] text-muted">
                Azure svarede uden tekst. Afspil lyden ovenfor — hvis du selv
                kan høre tydelig tale er problemet Azure; hvis lyden er stille
                eller forvrænget er problemet mikrofonen/formatet.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return ""
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m
  }
  return ""
}
