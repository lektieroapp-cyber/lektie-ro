// Speech-onset detector — companion to silence-detector.
//
// Silence-detector: watches for the kid to STOP talking (endpointing the
// recording). Runs during the kid's turn.
//
// Barge-in-detector: watches for the kid to START talking (interrupting
// Dani). Runs during Dani's turn — while TTS audio is playing through the
// speakers. Fires once, then cleans up.
//
// Why a separate detector: the thresholds are different. During Dani's
// speech we need a HIGHER RMS threshold (and a sustained-duration check)
// to avoid false triggers from acoustic echo — Dani's own voice leaking
// back through the mic even with browser-level AEC enabled. Regular
// silence-detector thresholds would constantly fire during Dani's speech.

type BargeInOpts = {
  /** RMS must exceed this to count as speech onset. Higher than the regular
   *  speech threshold (0.015) because AEC leak is always a bit noisy. */
  speechThreshold?: number
  /** How long RMS must stay above threshold before we fire — rejects single
   *  spikes (door slam, mic pop). */
  sustainMs?: number
  /** Fires once when sustained speech is detected. Detector self-cleans. */
  onSpeechDetected: () => void
  /** Optional live RMS for the mic meter (same pattern as silence-detector). */
  onLevel?: (rms: number) => void
}

export function startBargeInDetector(
  stream: MediaStream,
  opts: BargeInOpts
): () => void {
  const threshold = opts.speechThreshold ?? 0.03
  const sustainMs = opts.sustainMs ?? 180

  let fired = false
  let speechStart: number | null = null
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
      void ctx?.close()
    } catch {
      // Non-fatal — stream lifecycle is managed by caller.
    }
  }

  function fire() {
    if (fired) return
    fired = true
    cleanup()
    opts.onSpeechDetected()
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
      if (!analyser || !buf || fired) return
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

      if (rms >= threshold) {
        if (speechStart === null) speechStart = performance.now()
        else if (performance.now() - speechStart >= sustainMs) fire()
      } else {
        speechStart = null
      }
    }, 40)
  } catch {
    cleanup()
  }

  return cleanup
}
