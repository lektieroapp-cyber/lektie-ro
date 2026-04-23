import type { SttProvider, TtsProvider } from "./provider"
import { AZURE_VOICES } from "./types"

// Azure AI Speech — REST short-form.
// Docs:
//   STT: https://learn.microsoft.com/azure/ai-services/speech-service/rest-speech-to-text-short
//   TTS: https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech
//
// Both endpoints live on regional hostnames:
//   https://{region}.stt.speech.microsoft.com/...
//   https://{region}.tts.speech.microsoft.com/...
//
// We require region = "swedencentral" for GDPR; this is not enforced here so
// dev/test can point elsewhere, but .env.local.example documents the requirement.

function azureConfig(): { key: string; region: string } {
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) {
    throw new Error(
      "Azure Speech ikke konfigureret. Mangler AZURE_SPEECH_KEY eller AZURE_SPEECH_REGION."
    )
  }
  return { key, region }
}

export const azureStt: SttProvider = {
  id: "azure",
  async transcribe({ audio, contentType, locale }) {
    const { key, region } = azureConfig()
    const url =
      `https://${region}.stt.speech.microsoft.com/speech/recognition/` +
      `conversation/cognitiveservices/v1?language=${encodeURIComponent(locale)}` +
      `&format=detailed`

    const started = Date.now()
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": contentType || "audio/webm; codecs=opus",
        Accept: "application/json",
      },
      body: audio,
    })
    const ms = Date.now() - started

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`Azure STT ${res.status}: ${body.slice(0, 200)}`)
    }
    const json = (await res.json()) as {
      RecognitionStatus?: string
      DisplayText?: string
      NBest?: Array<{
        Confidence?: number
        Lexical?: string
        ITN?: string
        MaskedITN?: string
        Display?: string
      }>
    }
    const text =
      json.DisplayText ??
      json.NBest?.[0]?.Display ??
      json.NBest?.[0]?.Lexical ??
      ""
    // Azure returns HTTP 200 even when it couldn't transcribe — the real
    // signal is in RecognitionStatus. Surface non-Success statuses as errors.
    if (!text && json.RecognitionStatus && json.RecognitionStatus !== "Success") {
      throw new Error(
        `Azure STT: ${azureStatusExplanation(json.RecognitionStatus)}`
      )
    }
    // Log alternatives server-side when Azure returned multiple candidates —
    // helps diagnose codec/transcoding issues where Azure heard the audio but
    // picked an unexpectedly short candidate. Also returned to client as
    // `alternatives` for the admin audio-debug card.
    const alternatives =
      json.NBest?.slice(0, 4).map(n => ({
        text: n.Display ?? n.Lexical ?? "",
        confidence: n.Confidence,
      })) ?? []
    if (alternatives.length > 1) {
      console.log(
        "[azure-stt] NBest candidates:",
        alternatives.map(a => `"${a.text}" (${a.confidence?.toFixed(2)})`).join(" | ")
      )
    }
    return {
      text,
      ms,
      provider: "azure",
      status: json.RecognitionStatus,
      alternatives,
    }
  },
}

// Map Azure's RecognitionStatus enum values to actionable Danish messages.
// Source: https://learn.microsoft.com/azure/ai-services/speech-service/rest-speech-to-text-short#response-format
function azureStatusExplanation(status: string): string {
  switch (status) {
    case "NoMatch":
      return "NoMatch — Azure kunne ikke genkende tale. Tjek at lyden faktisk er dansk + at codec er understøttet (webm/opus, 16-48 kHz)."
    case "InitialSilenceTimeout":
      return "InitialSilenceTimeout — Azure hørte ingen tale i begyndelsen af lyden. Prøv at tale fra start eller tal højere."
    case "BabbleTimeout":
      return "BabbleTimeout — Azure hørte kun støj, ingen tydelig tale. Mindre baggrundsstøj / tættere på mikrofonen."
    case "Error":
      return "Azure-intern fejl. Tjek Azure-status + region."
    case "EndOfDictation":
      return "EndOfDictation — Azure sluttede før du talte færdigt. Normalt ikke en fejl."
    default:
      return `Status=${status}`
  }
}

async function postSsml(url: string, key: string, ssml: string) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
      "User-Agent": "lektiero-admin-tester",
    },
    body: ssml,
  })
}

export const azureTts: TtsProvider = {
  id: "azure",
  async synthesize({ text, voice }) {
    const { key, region } = azureConfig()
    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`

    // Conversational SSML tuning.
    //   rate='1.02'  — just above natural. 0.92 (the old value) added ~8%
    //                  duration on top of already-chunked audio, which is
    //                  what made voice-mode feel sluggish.
    //   pitch='+1%'  — tiny lift for warmth, not a whine.
    //   no breaks    — the sentence-internal <break> tags were meant for
    //                  long-form reading; in a 2-sentence reply they just add
    //                  dead silence and make the kid wait.
    //
    // Standalone single-letter labels ("A", "B", "C" — step indicators)
    // get wrapped in say-as so Azure reads them as letter names instead
    // of mis-parsing "A." as a weird abbreviation / punctuation pair.
    //
    // Quoted content gets wrapped in <lang xml:lang="en-US"> so the Danish
    // Neural voice switches to English pronunciation for English words.
    // English exercises reference English words via quotes ("dog", "scream")
    // and without this Christel reads them with Danish phonemes.
    const escaped = escapeXml(text)
    const withLabels = wrapLetterLabelsInSayAs(escaped)
    const withEn = wrapQuotedAsEnglish(withLabels)
    const voiceName = escapeXml(voice)
    const fancySsml =
      `<speak version='1.0' xml:lang='da-DK' xmlns:mstts='http://www.w3.org/2001/mstts'>` +
      `<voice xml:lang='da-DK' name='${voiceName}'>` +
      `<prosody rate='1.02' pitch='+1%'>${withEn}</prosody>` +
      `</voice></speak>`
    // Fallback SSML strips the <lang> wrap and <say-as> injection so a
    // rogue template-placeholder like "[house/flat/farm]" inside a quote
    // can't break the whole synthesis. Used when the decorated SSML is
    // rejected by Azure (400). The kid gets a Danish-accented version of
    // the English words instead of silence — not ideal but recoverable.
    const plainSsml =
      `<speak version='1.0' xml:lang='da-DK'>` +
      `<voice xml:lang='da-DK' name='${voiceName}'>` +
      `<prosody rate='1.02' pitch='+1%'>${escaped}</prosody>` +
      `</voice></speak>`

    const started = Date.now()
    let res = await postSsml(url, key, fancySsml)
    if (res.status === 400) {
      // Log the rejected SSML so we can see which decoration tripped Azure
      // — almost always a malformed nested tag or a tag inside a quote
      // that got split across an English wrap boundary.
      const body = await res.text().catch(() => "")
      console.warn(
        "[azure-tts] 400 on decorated SSML, retrying plain. Detail:",
        body.slice(0, 200)
      )
      res = await postSsml(url, key, plainSsml)
    }
    const ms = Date.now() - started

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`Azure TTS ${res.status}: ${body.slice(0, 200)}`)
    }
    const audio = await res.arrayBuffer()
    return { audio, contentType: "audio/mpeg", ms, provider: "azure" }
  },
  listVoices() {
    return AZURE_VOICES
  },
}

// Wrap standalone uppercase letters in SSML say-as so Azure reads them as
// letter names (Danish: "ah", "beh", "seh"...) instead of guessing at
// pronunciation or treating them as abbreviations. Catches step labels
// like "A", "B" in sentences like "Vi er ved A. Nu B, hvad bliver det?"
// — without catching multi-letter words (ORD, SMART) or lower-case words.
// Operates on already-xml-escaped text so the injected <say-as> tags are
// literal SSML, not re-escaped.
function wrapLetterLabelsInSayAs(escaped: string): string {
  return escaped.replace(
    /\b([A-ZÆØÅ])\b/g,
    '<say-as interpret-as="characters">$1</say-as>'
  )
}

// Wrap quoted content in <lang xml:lang="en-US"> so the Danish Christel/
// Jeppe voice attempts English pronunciation for English words.
//
// An earlier attempt used nested <voice name="en-US-JennyNeural"> inside
// the outer Danish voice to get a native English speaker for those
// segments. Azure's REST endpoint rejected that with HTTP 400 — per
// Microsoft docs "each voice element must be a direct child of the speak
// element", so nested <voice> isn't supported on the short-form API. To
// switch voices we'd have to break the SSML into multiple sibling <voice>
// blocks under <speak>, restructure the outer <prosody>, and reassemble.
// Out of scope for now; <lang> is the safe known-working option.
//
// Danish content in quotes (e.g., "æble", "ørred") must NOT be wrapped —
// under an en-US lang tag the Danish voice butchers æ/ø/å. We detect
// Danish-specific chars and skip the wrap when any appear.
//
// Handles:
//   - Straight ASCII quotes: "word"   (&quot; after xml-escape)
//   - Curly/smart quotes:    "word"   (U+201C / U+201D, not escaped)
// Caps content length at 60 chars so a rogue unclosed quote can't swallow
// a whole paragraph into the wrap.
const DANISH_CHARS = /[æøåÆØÅ]/

function wrapQuotedAsEnglish(escaped: string): string {
  const wrap = (content: string): string => {
    if (DANISH_CHARS.test(content)) return content
    return `<lang xml:lang="en-US">${content}</lang>`
  }
  return escaped
    .replace(
      /&quot;([^&]{1,60}?)&quot;/g,
      (_m, content: string) => `&quot;${wrap(content)}&quot;`
    )
    .replace(
      /“([^“”]{1,60}?)”/g,
      (_m, content: string) => `“${wrap(content)}”`
    )
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
