// Clean AI chat output before handing it to a TTS engine.
// The hint stream embeds visual-block markers like [tenframe a="4" b="7"]
// and occasional **bold** spans — none of which should be read aloud.
//
// The visual block stays on screen; the surrounding Danish narrative usually
// describes what it shows ("lad os dele 24 op i tiere og enere") so stripping
// the tag is enough — no substitute wording needed.

// Must match BLOCK_RE in components/session/blocks/parse.tsx — kept local so
// the client can import this file without dragging the React block imports in.
// Must match BLOCK_RE in components/session/blocks/parse.tsx. Tag starts
// with a letter so "[1]" in narration isn't wrongly treated as a block.
const BLOCK_STRIP_RE = /\[[a-zA-Z]\w*(?:\s+[a-zA-Z_]+="[^"]*")*\s*\]/g
const DANISH_CHARS = /[æøåÆØÅ]/

// Safety-net vocabulary list. The system prompt instructs Dani to put EVERY
// English word in straight quotes during engelsk/tysk sessions (so the
// downstream Azure SSML wraps them in <lang xml:lang="en-US"> for English
// pronunciation), but the model sometimes drops the quotes — most often on
// short common words like "four", "red", "Monday". When that happens the
// Danish voice reads them with Danish phonemes ("fo-ur", "re-d") which is
// exactly wrong for an English lesson.
//
// This list is intentionally CONSERVATIVE: every entry is unambiguously
// English vocabulary that does NOT collide with a real Danish word. Excluded
// on purpose: "is" (=ice in DK), "at" (=that/to in DK), "i" (=in in DK),
// "and" (=duck in DK), "to" (=two in DK), "or" (=word in DK), "do" (=passes
// for "loo" in DK slang), "no" (=Norwegian-ish, conflicts with "Nå"),
// proper-noun-shaped words like "Mark" (common DK name).
const ENGLISH_VOCAB_SAFE = new Set<string>([
  // Numbers — words 1-20 + multiples of ten.
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty", "sixty",
  "seventy", "eighty", "ninety", "hundred", "thousand",
  // Colours.
  "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown",
  "gray", "grey", "white", "black",
  // Days of the week.
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  // Months (Danish months differ enough to be safe — "march"≠"marts",
  // "may"≠"maj", "october"≠"oktober" etc.).
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  // Common kid-vocabulary nouns. Each checked against Danish equivalents
  // (hund/kat/hus/bil/træ/bog/skole/familie/ven/mor/far/søster/bror/mad/
  // vand/fugl/fisk/blomst/sommer/vinter) — none collide.
  "dog", "cat", "house", "car", "tree", "book", "school", "family", "friend",
  "mother", "father", "sister", "brother", "food", "water", "bird", "fish",
  "flower", "summer", "winter", "spring", "autumn",
  // Articles. "the" has no Danish equivalent so it can't false-positive.
  "the",
])

/**
 * Wraps bare occurrences of safe-list English words in straight quotes so
 * the downstream TTS pipeline reads them with English phonemes. Skips text
 * inside existing quoted spans so the AI's already-correct quotations aren't
 * double-wrapped (which would break the SSML).
 */
function autoQuoteEnglishVocab(text: string): string {
  // Split keeps the delimiters in the output array; capturing the full
  // quoted span ("..." including the quotes) means odd-index parts are the
  // quoted spans we want to leave alone, even-index parts are unquoted
  // narration we should scan for safe-list words.
  const parts = text.split(/("[^"]*")/g)
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) continue
    parts[i] = parts[i].replace(/\b[a-zA-Z]+\b/g, word => {
      return ENGLISH_VOCAB_SAFE.has(word.toLowerCase()) ? `"${word}"` : word
    })
  }
  return parts.join("")
}

type StripOpts = {
  /** When set to "engelsk" or "tysk", bolded spans whose inner text looks
   *  English (no Danish chars, at least one ASCII letter, not a bare number)
   *  are converted to `"..."` quotes so the TTS quote-wrap promotes them
   *  to `<lang xml:lang="en-US">` for native-language pronunciation. Without
   *  this, Dani's `**kitchen**` or `**bedroom**` is read Danish-style. */
  subject?: string | null
}

export function stripForTts(text: string, opts: StripOpts = {}): string {
  const subject = (opts.subject ?? "").toLowerCase()
  const wrapEnglishBolds = subject === "engelsk" || subject === "tysk"
  let out = text
    // Visual-block markers
    .replace(BLOCK_STRIP_RE, " ")
    // **bold** spans. In engelsk/tysk tasks, convert the inner text to a
    // quoted span when it looks like the target language so the downstream
    // TTS wrap can switch pronunciation. Pure Danish bolds (æ/ø/å or
    // short markers like **A**) stay bare.
    .replace(/\*\*([^*]+)\*\*/g, (_m, inner: string) => {
      const trimmed = inner.trim()
      if (
        wrapEnglishBolds &&
        trimmed.length > 1 &&
        !DANISH_CHARS.test(trimmed) &&
        /[a-zA-Z]/.test(trimmed) &&
        !/^\d+$/.test(trimmed)
      ) {
        return `"${trimmed}"`
      }
      return trimmed
    })
    // Stray backticks
    .replace(/`/g, "")
    // Fill-in-the-blank markers — runs of 2+ underscores represent a
    // missing word/number ("Find ___ der passer", "5 + ___ = 12").
    // Azure neural voices otherwise read each underscore aloud. An
    // ellipsis gives the speaker a natural pause where the gap goes.
    .replace(/_{2,}/g, "…")
  // Engelsk/tysk safety net: catch bare English vocab words the model
  // forgot to quote. Runs AFTER the bold→quote conversion (so anything
  // already promoted to quotes is left alone) and BEFORE whitespace
  // collapse. The split-by-quoted-spans inside autoQuoteEnglishVocab
  // ensures we don't re-wrap correctly-quoted text.
  if (wrapEnglishBolds) {
    out = autoQuoteEnglishVocab(out)
  }
  return out
    // Collapse whitespace introduced by the strips
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
