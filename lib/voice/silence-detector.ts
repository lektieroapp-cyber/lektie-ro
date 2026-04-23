// Simple VAD (voice-activity detector) for the kid-facing voice-agent loop.
// Browser-only — pulls PCM time-domain samples from an AnalyserNode, computes
// RMS at ~50 Hz, and fires onStop when the kid has gone quiet for silenceMs
// AFTER having spoken at least once. Also caps total recording at maxMs so
// a forgotten mic doesn't burn Azure minutes.
//
// Thresholds are intentionally loose: kids mumble, microphones vary. Better
// to send a short clip a bit early than to keep listening through dead air.

export type DetectorStats = {
  /** Total ms the RMS was at or above `speechThreshold`. Best single
   *  indicator of "did the kid actually talk" — a 4-second recording with
   *  only 80ms speech-time is noise, not a sentence. */
  speechMs: number
  /** Peak RMS observed during the session. Useful for dev logs. */
  peakRms: number
  /** Total elapsed ms from detector start to stop. */
  durationMs: number
}

type DetectorOpts = {
  /** RMS above this counts as "speaking" (0-1 scale). */
  speechThreshold?: number
  /** RMS below this counts as "silent". */
  silenceThreshold?: number
  /** Required cumulative time above speechThreshold before we classify the
   *  session as "has speech" — rejects single spikes (chair creak, key
   *  click, AEC leak). Applied to the hasSpoken gate so endpointing only
   *  fires after real speech. */
  sustainedSpeechMs?: number
  /** How long continuous silence must last before we auto-stop. */
  silenceMs?: number
  /** Hard cap on total recording length. */
  maxMs?: number
  /** Called once, on either silence or hard cap. "silence" requires speech
   *  was detected first; "max" fires after maxMs regardless. "empty" fires
   *  when maxMs is reached without EVER detecting speech — lets the caller
   *  tell the kid "jeg hørte dig ikke" instead of sending silent audio. */
  onStop: (reason: "silence" | "max" | "empty" | "error", stats: DetectorStats) => void
  /** Fires on every tick (~20 Hz) with the current RMS so the UI can render a
   *  live level meter. Null-safe; invoke-only when provided. */
  onLevel?: (rms: number) => void
}

export function startSilenceDetector(
  stream: MediaStream,
  opts: DetectorOpts
): () => void {
  // Thresholds tuned for kids 8-14 on a typical laptop / phone mic.
  // speechThreshold is paired with sustainedSpeechMs — the threshold can be
  // low (to catch quiet kids) because single spikes are rejected by the
  // cumulative-time requirement. Previous build used 0.015 alone and was
  // tripping on ambient noise + AEC leak from the speaker.
  const speechThreshold = opts.speechThreshold ?? 0.02
  const silenceThreshold = opts.silenceThreshold ?? 0.008
  // 120ms of cumulative above-threshold audio = at least a syllable. Below
  // this, treat the session as "no real speech" even if noise spiked.
  const sustainedSpeechMs = opts.sustainedSpeechMs ?? 120
  // 700ms: tight enough to keep turn-taking snappy; still tolerates the typical
  // mid-sentence "øh" hesitation without cutting the kid off.
  const silenceMs = opts.silenceMs ?? 700
  const maxMs = opts.maxMs ?? 25_000

  const TICK_MS = 50
  let stopped = false
  const startedAt = performance.now()
  let hasSpoken = false
  let silenceSince: number | null = null
  // Stats accumulated across the session — passed to onStop.
  let speechMs = 0
  let peakRms = 0

  let ctx: AudioContext | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let analyser: AnalyserNode | null = null
  let buf: Uint8Array | null = null
  let timer: number | null = null

  function fire(reason: "silence" | "max" | "empty" | "error") {
    if (stopped) return
    stopped = true
    cleanup()
    opts.onStop(reason, {
      speechMs,
      peakRms,
      durationMs: Math.round(performance.now() - startedAt),
    })
  }

  function cleanup() {
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
    try {
      source?.disconnect()
      analyser?.disconnect()
      // close() returns a Promise; chain .catch so a late "already closed"
      // rejection doesn't bubble as unhandledRejection. The outer try/catch
      // only handles synchronous throws.
      ctx?.close().catch(() => {})
    } catch {
      // Cleanup errors are non-fatal — stream is closed separately by the caller.
    }
  }

  try {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    source = ctx.createMediaStreamSource(stream)
    analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.2
    source.connect(analyser)
    buf = new Uint8Array(analyser.fftSize)

    timer = window.setInterval(() => {
      if (!analyser || !buf || stopped) return
      // Time-domain samples, 0-255 with 128 = silence.
      analyser.getByteTimeDomainData(buf as unknown as Uint8Array<ArrayBuffer>)
      let sumSquares = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sumSquares += v * v
      }
      const rms = Math.sqrt(sumSquares / buf.length)
      const now = performance.now()

      if (rms > peakRms) peakRms = rms
      opts.onLevel?.(rms)

      if (now - startedAt > maxMs) {
        // Distinguish "spoke too long" from "never made a sound" so the
        // caller can show a sensible error instead of shipping silence to STT.
        fire(hasSpoken ? "max" : "empty")
        return
      }

      if (rms >= speechThreshold) {
        // Accumulate speech time. hasSpoken only flips true after the kid has
        // been above threshold for sustainedSpeechMs total — a single noise
        // spike won't trip endpointing anymore.
        speechMs += TICK_MS
        if (!hasSpoken && speechMs >= sustainedSpeechMs) hasSpoken = true
        silenceSince = null
        return
      }

      if (!hasSpoken) return

      if (rms < silenceThreshold) {
        if (silenceSince === null) silenceSince = now
        else if (now - silenceSince >= silenceMs) fire("silence")
      } else {
        // Borderline — don't reset hasSpoken, but don't accumulate silence either.
        silenceSince = null
      }
    }, TICK_MS)
  } catch {
    fire("error")
  }

  return cleanup
}
