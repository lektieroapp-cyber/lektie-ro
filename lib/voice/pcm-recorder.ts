"use client"

// Records microphone input as 16 kHz mono PCM WAV directly in the browser.
// Replaces MediaRecorder (webm/opus) for the Azure Speech STT path because
// Azure's short-form REST endpoint decodes webm/opus flakily — it silently
// drops big chunks of the audio and only transcribes whatever tiny slice
// survives the codec handoff.
//
// WAV 16 kHz mono is Azure Speech's native ingest format. When we send this
// Azure does zero transcoding and gets every sample we recorded.
//
// Implementation: Web Audio API AudioContext + ScriptProcessorNode captures
// Float32 samples at the browser's native rate (usually 48 kHz on Chrome),
// we resample to 16 kHz and emit a standard RIFF WAV blob on stop.

type Options = {
  /** Target sample rate for the WAV output. Azure likes 16 kHz. */
  sampleRate?: number
  /** Fires every ~20 Hz with the current RMS (0..1). Used for the mic meter. */
  onLevel?: (rms: number) => void
}

export type PcmRecorderHandle = {
  /** Stops recording, closes the audio graph, and returns the finished WAV. */
  stop: () => Promise<Blob>
  /** Sample rate the browser actually gave us (may differ from target). */
  sourceSampleRate: number
  targetSampleRate: number
}

export async function startPcmRecorder(
  stream: MediaStream,
  options: Options = {}
): Promise<PcmRecorderHandle> {
  const targetSampleRate = options.sampleRate ?? 16000
  // Prefer opening the AudioContext AT the target rate — Chrome, Firefox, and
  // Safari 14.1+ accept sampleRate in the constructor and will transparently
  // use their internal high-quality resampler to down-convert the 48 kHz
  // mic input to 16 kHz. Much cleaner than the linear-interpolation fallback
  // below (which aliases sibilants — "s", "f", "sh" sounds get noisy and
  // throw off ASR). If the browser rejects the rate we fall back gracefully.
  let ctx: AudioContext
  try {
    ctx = new AudioContext({ sampleRate: targetSampleRate })
  } catch {
    ctx = new AudioContext()
  }
  const sourceSampleRate = ctx.sampleRate
  const source = ctx.createMediaStreamSource(stream)
  // ScriptProcessorNode is deprecated in the spec but still supported
  // everywhere. AudioWorklet is the "correct" replacement but requires
  // loading a worklet module which complicates deployment. ScriptProcessor
  // is simpler and the perf hit is invisible for a short-utterance STT
  // workflow like ours.
  const bufferSize = 4096
  const processor = ctx.createScriptProcessor(bufferSize, 1, 1)

  const chunks: Float32Array[] = []
  let stopped = false

  processor.onaudioprocess = e => {
    if (stopped) return
    const input = e.inputBuffer.getChannelData(0)
    // getChannelData returns a view that gets reused on the next tick.
    // Clone so we own the samples forever.
    chunks.push(new Float32Array(input))

    if (options.onLevel) {
      let sumSquares = 0
      for (let i = 0; i < input.length; i++) sumSquares += input[i] * input[i]
      options.onLevel(Math.sqrt(sumSquares / input.length))
    }
  }

  source.connect(processor)
  // ScriptProcessor only fires onaudioprocess if connected to something —
  // connecting to destination works and adds no audible output since the
  // mic stream isn't mixed back in.
  processor.connect(ctx.destination)

  let stopPromise: Promise<Blob> | null = null
  return {
    sourceSampleRate,
    targetSampleRate,
    stop() {
      // Guard against double-stop: multiple cleanup paths (VAD onStop,
      // manual stopRecording, stopVoiceOutput on task completion) may
      // race. Return the same promise instead of closing twice — the
      // second call would throw InvalidStateError on ctx.close().
      if (stopPromise) return stopPromise
      stopPromise = (async () => {
        stopped = true
        try {
          processor.disconnect()
          source.disconnect()
        } catch {
          // Disconnect can throw if already disconnected — non-fatal.
        }
        if (ctx.state !== "closed") {
          try {
            await ctx.close()
          } catch {
            // InvalidStateError etc — non-fatal, another path closed it.
          }
        }
        const total = chunks.reduce((n, c) => n + c.length, 0)
        if (total === 0) return new Blob([], { type: "audio/wav" })
        const combined = new Float32Array(total)
        let off = 0
        for (const c of chunks) {
          combined.set(c, off)
          off += c.length
        }
        const resampled = resample(combined, sourceSampleRate, targetSampleRate)
        return encodeWav(resampled, targetSampleRate)
      })()
      return stopPromise
    },
  }
}

// Linear-interpolation downsample. For 48 kHz → 16 kHz this is slightly
// lossy vs a proper anti-aliased filter, but speech STT tolerates it fine —
// we're not mastering music, we're feeding recognition.
function resample(
  input: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate === toRate) return input
  const ratio = fromRate / toRate
  const outputLength = Math.floor(input.length / ratio)
  const output = new Float32Array(outputLength)
  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i * ratio
    const low = Math.floor(srcIdx)
    const high = Math.min(low + 1, input.length - 1)
    const frac = srcIdx - low
    output[i] = input[low] * (1 - frac) + input[high] * frac
  }
  return output
}

// Standard 16-bit mono RIFF WAV header + Int16 PCM samples.
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataBytes = samples.length * 2
  const buffer = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buffer)
  // RIFF header
  writeAscii(view, 0, "RIFF")
  view.setUint32(4, 36 + dataBytes, true)
  writeAscii(view, 8, "WAVE")
  // fmt chunk
  writeAscii(view, 12, "fmt ")
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate (sampleRate × blockAlign)
  view.setUint16(32, 2, true) // block align (channels × bytesPerSample)
  view.setUint16(34, 16, true) // bits per sample
  // data chunk
  writeAscii(view, 36, "data")
  view.setUint32(40, dataBytes, true)
  // Float32 → Int16
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([buffer], { type: "audio/wav" })
}

function writeAscii(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
