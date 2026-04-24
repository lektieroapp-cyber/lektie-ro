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
  return (
    text
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
      // Collapse whitespace introduced by the strips
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  )
}
