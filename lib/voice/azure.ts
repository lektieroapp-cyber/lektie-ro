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

// Hybrid voice IDs follow the form "<da-voice>+<en-voice>", e.g.
//   "da-DK-JeppeNeural+en-US-AndrewMultilingualNeural"
// In hybrid mode we render Danish narration with the first voice and the
// quoted English spans with the second, instead of using a single voice
// with <lang> SSML switches. Result: native Danish AND native English at
// the cost of two speakers in one sentence. Detected by the presence of
// "+" in the voice id.
const HYBRID_SEPARATOR = "+"

export const azureTts: TtsProvider = {
  id: "azure",
  async synthesize({ text, voice }) {
    const { key, region } = azureConfig()
    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`

    const isHybrid = voice.includes(HYBRID_SEPARATOR)
    const [danishVoice, englishVoice] = isHybrid
      ? voice.split(HYBRID_SEPARATOR)
      : [voice, voice]

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
    // Quoted content handling depends on mode:
    //   - Single-voice mode: <lang xml:lang="en-US"> wrap. Works only for
    //     multilingual voices (Christel ignores it).
    //   - Hybrid mode: close the Danish <voice>, open an English <voice>
    //     with English voice name, render the quoted text, then re-open the
    //     Danish voice. Two speakers, but native pronunciation for both.
    // Pipeline:
    //   raw text
    //   → wrapQuotedAsEnglishPre (insert ASCII sentinel markers around
    //     English quotes; skip quotes that contain æ/ø/å)
    //   → escapeXml (apostrophes become &apos; safely inside sentinels)
    //   → wrapLetterLabelsInSayAs (Unicode-aware so "Målet" stays intact)
    //   → materializeLangSentinels OR materializeVoiceSwapSentinels
    const marked = wrapQuotedAsEnglishPre(text)
    const escaped = escapeXml(marked)
    const withLabels = wrapLetterLabelsInSayAs(escaped)
    const withEn = isHybrid
      ? materializeVoiceSwapSentinels(withLabels, escapeXml(danishVoice), escapeXml(englishVoice))
      : materializeLangSentinels(withLabels)
    const voiceName = escapeXml(danishVoice)
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
    // Fallback: escape the ORIGINAL text directly (no sentinels, no say-as,
    // no lang tags) so a malformed decoration can't poison the retry.
    const plainEscaped = escapeXml(text)
    const plainSsml =
      `<speak version='1.0' xml:lang='da-DK'>` +
      `<voice xml:lang='da-DK' name='${voiceName}'>` +
      `<prosody rate='1.02' pitch='+1%'>${plainEscaped}</prosody>` +
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
//
// Gotcha: an earlier version used /\b([A-ZÆØÅ])\b/g. JavaScript's \b is
// ASCII-only — it sees a boundary between a word-char (A-Z0-9_) and a
// non-word-char. æ/ø/å are NOT ASCII word chars, so "Målet" had a
// boundary between "M" (word) and "å" (non-word), and the regex wrapped
// just "M" as a letter-name. Azure then spoke "em-ålet" instead of
// "målet". Same bug for "Sæt", "Lær", any Danish capital-then-æøå word.
// Fix: Unicode-aware lookaround using \p{L} — require the match NOT be
// preceded or followed by any Unicode letter (so "M" + "å" is NOT a
// match, because å is \p{L}).
function wrapLetterLabelsInSayAs(escaped: string): string {
  return escaped.replace(
    /(?<![\p{L}\p{N}])([A-ZÆØÅ])(?![\p{L}\p{N}])/gu,
    '<say-as interpret-as="characters">$1</say-as>'
  )
}

// Wrap quoted content in <lang xml:lang="en-US"> so the Danish Christel/
// Jeppe voice attempts English pronunciation for English words.
//
// Runs on the RAW text (before XML-escape) using sentinel markers, which
// are then replaced with real SSML tags after escape. An earlier version
// operated on escaped text with /&quot;([^&]*)&quot;/ — that broke on
// anything containing an XML entity inside the quote, e.g. "I'm afraid
// of the dark" → after escape "I&apos;m afraid of the dark" → the [^&]
// character class stops at &apos; and the regex never matches. Result:
// the English stays under Christel in Danish pronunciation, exactly the
// "sounds horrible" complaint.
//
// Sentinel markers survive xml-escape (pure ASCII underscores) and get
// swapped for <lang> tags just before the final SSML emit.
//
// Danish content in quotes (e.g., "æble", "ørred") must NOT be wrapped —
// under an en-US lang tag the Danish voice butchers æ/ø/å. We detect
// Danish-specific chars and skip the wrap when any appear.
//
// Handles:
//   - Straight ASCII quotes: "word"
//   - Curly/smart quotes:    "word"  (U+201C / U+201D)
// Caps content length at 80 chars so a rogue unclosed quote can't swallow
// a whole paragraph.
const DANISH_CHARS = /[æøåÆØÅ]/
const LANG_EN_OPEN_SENTINEL = "__LR_LANG_EN_OPEN__"
const LANG_EN_CLOSE_SENTINEL = "__LR_LANG_EN_CLOSE__"

function wrapQuotedAsEnglishPre(raw: string): string {
  const wrap = (content: string): string => {
    if (DANISH_CHARS.test(content)) return content
    return `${LANG_EN_OPEN_SENTINEL}${content}${LANG_EN_CLOSE_SENTINEL}`
  }
  return raw
    .replace(
      /"([^"\n]{1,80}?)"/g,
      (_m, content: string) => `"${wrap(content)}"`
    )
    .replace(
      /“([^“”\n]{1,80}?)”/g,
      (_m, content: string) => `“${wrap(content)}”`
    )
    // Danish low-9 opener „…" and „…" — common when the LLM imitates
    // Danish typography. Also handle the rarer „…„ misuse.
    .replace(
      /„([^„""\n]{1,80}?)["""„]/g,
      (_m, content: string) => `„${wrap(content)}"`
    )
    // Guillemets: French style «…» and Danish/German reversed »…«
    .replace(
      /«([^«»\n]{1,80}?)»/g,
      (_m, content: string) => `«${wrap(content)}»`
    )
    .replace(
      /»([^«»\n]{1,80}?)«/g,
      (_m, content: string) => `»${wrap(content)}«`
    )
}

function materializeLangSentinels(escaped: string): string {
  return escaped
    .split(LANG_EN_OPEN_SENTINEL).join('<lang xml:lang="en-US">')
    .split(LANG_EN_CLOSE_SENTINEL).join('</lang>')
}

// Hybrid mode: each English span breaks out of the Danish <voice> entirely
// and renders inside its own English <voice> block. Same prosody on both
// sides so rate/pitch stays consistent across the swap. The outer <speak>
// + first <voice> are emitted by the caller; this only fills the body.
function materializeVoiceSwapSentinels(
  escaped: string,
  danishVoiceEscaped: string,
  englishVoiceEscaped: string
): string {
  const closeDanish = `</prosody></voice>`
  const openEnglish = `<voice xml:lang='en-US' name='${englishVoiceEscaped}'><prosody rate='1.02' pitch='+1%'>`
  const closeEnglish = `</prosody></voice>`
  const openDanish = `<voice xml:lang='da-DK' name='${danishVoiceEscaped}'><prosody rate='1.02' pitch='+1%'>`
  return escaped
    .split(LANG_EN_OPEN_SENTINEL).join(`${closeDanish}${openEnglish}`)
    .split(LANG_EN_CLOSE_SENTINEL).join(`${closeEnglish}${openDanish}`)
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
