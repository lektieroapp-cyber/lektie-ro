// Speech-onset detector — companion to silence-detector.
//
// Silence-detector: watches for the kid to STOP talking (endpointing the
// recording). Runs during the kid's turn.
//
// Barge-in-detector: watches for the kid to START talking (interrupting
// Dani). Runs during Dani's turn — while TTS audio is playing through the
// speakers. Two-phase state machine:
//
//   waiting   → RMS > threshold sustained for sustainMs → tentative
//   tentative → onTentative() fires; caller pauses TTS but keeps slot queue
//     • if kid keeps talking (no long quiet window) until confirmMs elapses
//       → onConfirmed() fires; caller aborts queue, mic opens
//     • if kid goes quiet for falseAlarmQuietMs while tentative
//       → onFalseAlarm() fires; caller resumes TTS from the paused point
//
// Why two-phase: a single high-RMS event fires on breaths, coughs, book
// pages flipping, chair squeaks, the kid saying "um" briefly while listening.
// Before the split, every one of those would kill Dani mid-word. The
// tentative phase lets those false-positives recover silently; only real
// sustained speech during tentative escalates to confirmed.
//
// The higher base RMS threshold (vs the regular silence-detector speech
// threshold) accounts for acoustic echo — Dani's own voice leaking back
// through the mic even with browser-level AEC enabled.

type BargeInOpts = {
  /** RMS must exceed this to count as potential speech. Higher than the
   *  silence-detector speech threshold (~0.015) because AEC leak is always
   *  a bit noisy during playback. */
  speechThreshold?: number
  /** How long RMS must stay above threshold before we enter tentative. */
  sustainMs?: number
  /** How long tentative lasts before we commit to confirmed. The longer
   *  this is, the more time a false-alarm has to declare itself. */
  confirmMs?: number
  /** Quiet streak after tentative that dismisses as a false alarm. */
  falseAlarmQuietMs?: number
  /** Fires when the first sustained burst is detected. Caller should PAUSE
   *  TTS but keep the queued audio slots — we may resume them. */
  onTentative: () => void
  /** Fires after tentative elapses without a false-alarm. Caller should
   *  ABORT the TTS queue and hand control to the kid's mic turn. */
  onConfirmed: () => void
  /** Fires if RMS drops during the tentative window. Caller should
   *  RESUME the paused audio element (and the queue continues naturally). */
  onFalseAlarm: () => void
  /** Optional live RMS for diagnostics. */
  onLevel?: (rms: number) => void
}

export function startBargeInDetector(
  stream: MediaStream,
  opts: BargeInOpts
): () => void {
  const threshold = opts.speechThreshold ?? 0.055
  const sustainMs = opts.sustainMs ?? 250
  const confirmMs = opts.confirmMs ?? 600
  const falseAlarmQuietMs = opts.falseAlarmQuietMs ?? 400

  type State = "waiting" | "tentative" | "done"
  let state: State = "waiting"
  let speechStart: number | null = null
  let tentativeStart: number | null = null
  let quietSince: number | null = null
  let ctx: AudioContext | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let analyser: AnalyserNode | null = null
  let buf: Uint8Array | null = null
  let timer: number | null = null

  function cleanup() {
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
    try {
      source?.disconnect()
      analyser?.disconnect()
      // close() is async; chain .catch so a late "already closed" rejection
      // doesn't bubble as unhandledRejection past the outer (sync-only) catch.
      ctx?.close().catch(() => {})
    } catch {
      // Non-fatal — stream lifecycle is managed by caller.
    }
  }

  function fireTentative() {
    state = "tentative"
    tentativeStart = performance.now()
    quietSince = null
    opts.onTentative()
  }

  function fireConfirmed() {
    state = "done"
    cleanup()
    opts.onConfirmed()
  }

  function fireFalseAlarm() {
    state = "done"
    cleanup()
    opts.onFalseAlarm()
  }

  try {
    ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    source = ctx.createMediaStreamSource(stream)
    analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.15
    source.connect(analyser)
    buf = new Uint8Array(analyser.fftSize)

    timer = window.setInterval(() => {
      if (!analyser || !buf || state === "done") return
      analyser.getByteTimeDomainData(
        buf as unknown as Uint8Array<ArrayBuffer>
      )
      let sumSquares = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sumSquares += v * v
      }
      const rms = Math.sqrt(sumSquares / buf.length)
      opts.onLevel?.(rms)
      const now = performance.now()

      if (state === "waiting") {
        if (rms >= threshold) {
          if (speechStart === null) speechStart = now
          else if (now - speechStart >= sustainMs) fireTentative()
        } else {
          speechStart = null
        }
        return
      }

      // state === "tentative"
      if (rms >= threshold) {
        quietSince = null
      } else {
        if (quietSince === null) quietSince = now
        else if (now - quietSince >= falseAlarmQuietMs) {
          fireFalseAlarm()
          return
        }
      }
      if (tentativeStart !== null && now - tentativeStart >= confirmMs) {
        fireConfirmed()
      }
    }, 40)
  } catch {
    cleanup()
  }

  return cleanup
}
