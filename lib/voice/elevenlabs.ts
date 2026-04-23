import type { SttProvider, TtsProvider } from "./provider"

// ElevenLabs — Scribe v1 for STT, Flash/Turbo v2.5 for TTS.
// Docs: https://elevenlabs.io/docs
//
// GDPR note: the default hostname is `api.elevenlabs.io` (US). EU data
// residency requires the Enterprise tier. Keep this provider admin-only
// until the DPA is signed — enforcement lives at the /api route layer
// (admin guard + NEXT_PUBLIC_VOICE_ENABLED flag).

const ELEVEN_BASE = "https://api.elevenlabs.io/v1"

// Best-guess voice list; the user can override voice_id via the admin UI.
// When the chosen default is set via ELEVENLABS_DEFAULT_VOICE_ID, we surface
// it here too so the admin dropdown always has at least one option.
function defaultVoices(): { id: string; label: string; gender: "female" | "male" }[] {
  const envId = process.env.ELEVENLABS_DEFAULT_VOICE_ID
  const list: { id: string; label: string; gender: "female" | "male" }[] = []
  if (envId) {
    list.push({ id: envId, label: "Default (fra env)", gender: "female" })
  }
  return list
}

function elevenKey(): string {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) {
    throw new Error("ElevenLabs ikke konfigureret. Mangler ELEVENLABS_API_KEY.")
  }
  return key
}

export const elevenStt: SttProvider = {
  id: "elevenlabs",
  async transcribe({ audio, contentType, locale }) {
    const key = elevenKey()

    // Multipart form — ElevenLabs Scribe expects a "file" field.
    const form = new FormData()
    form.append(
      "file",
      new Blob([audio], { type: contentType || "audio/webm" }),
      "audio.webm"
    )
    form.append("model_id", "scribe_v1")
    // ISO 639-3 code: Danish = "dan". Scribe accepts the hint to pin the language.
    form.append("language_code", isoLanguageFromLocale(locale))

    const started = Date.now()
    const res = await fetch(`${ELEVEN_BASE}/speech-to-text`, {
      method: "POST",
      headers: { "xi-api-key": key },
      body: form,
    })
    const ms = Date.now() - started

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`ElevenLabs STT ${res.status}: ${body.slice(0, 200)}`)
    }
    const json = (await res.json()) as { text?: string }
    return { text: json.text ?? "", ms, provider: "elevenlabs" }
  },
}

export const elevenTts: TtsProvider = {
  id: "elevenlabs",
  async synthesize({ text, voice }) {
    const key = elevenKey()
    const model = process.env.ELEVENLABS_TTS_MODEL ?? "eleven_flash_v2_5"

    const started = Date.now()
    const res = await fetch(
      `${ELEVEN_BASE}/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: model,
          // Let ElevenLabs use voice defaults; kid-warmth tuning is TBD.
        }),
      }
    )
    const ms = Date.now() - started

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`ElevenLabs TTS ${res.status}: ${body.slice(0, 200)}`)
    }
    const audio = await res.arrayBuffer()
    return { audio, contentType: "audio/mpeg", ms, provider: "elevenlabs" }
  },
  listVoices() {
    return defaultVoices()
  },
}

function isoLanguageFromLocale(locale: string): string {
  // Map BCP-47 → ISO 639-3 for the few locales we ever care about.
  if (locale.toLowerCase().startsWith("da")) return "dan"
  if (locale.toLowerCase().startsWith("sv")) return "swe"
  if (locale.toLowerCase().startsWith("nb")) return "nob"
  if (locale.toLowerCase().startsWith("en")) return "eng"
  return "dan"
}
