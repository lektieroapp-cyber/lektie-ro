// Clean AI chat output before handing it to a TTS engine.
// The hint stream embeds visual-block markers like [tenframe a="4" b="7"]
// and occasional **bold** spans — none of which should be read aloud.
//
// The visual block stays on screen; the surrounding Danish narrative usually
// describes what it shows ("lad os dele 24 op i tiere og enere") so stripping
// the tag is enough — no substitute wording needed.

// Must match BLOCK_RE in components/session/blocks/parse.tsx — kept local so
// the client can import this file without dragging the React block imports in.
const BLOCK_STRIP_RE = /\[\w+(?:\s+[a-zA-Z_]+="[^"]*")*\s*\]/g

export function stripForTts(text: string): string {
  return (
    text
      // Visual-block markers
      .replace(BLOCK_STRIP_RE, " ")
      // **bold** spans — keep the inner words
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      // Stray backticks
      .replace(/`/g, "")
      // Collapse whitespace introduced by the strips
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  )
}
