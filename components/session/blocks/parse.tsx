// Tokenise AI-emitted inline blocks from streaming chat text.
// Supported grammar (self-closing bracket tags):
//
//   [tenframe a="4" b="7"]
//   [numbersplit whole="24" tens="20" ones="4"]
//   [syllables word="kaniner" breaks="ka|ni|ner"]
//   [tryit placeholder="Skriv dit bud"]
//   [needphoto reason="Billedet er for mørkt"]   — flow escape: take a new photo
//   [offscope note="Vi kan vende tilbage"]        — kid drifted off-task
//
// Attribute values must be quoted. Breaks are pipe-separated. Unknown tags
// render as literal text + warn in dev — never crash the stream.

import { Base10Blocks } from "./Base10Blocks"
import { BalanceScale } from "./BalanceScale"
import { Clock } from "./Clock"
import { ContractionReveal } from "./ContractionReveal"
import { DoubleConsonantCheck } from "./DoubleConsonantCheck"
import { FalseFriendAlert } from "./FalseFriendAlert"
import { FractionBar } from "./FractionBar"
import { NeedPhoto } from "./NeedPhoto"
import { NumberLine } from "./NumberLine"
import { NumberSplit } from "./NumberSplit"
import { OffScope } from "./OffScope"
import { SentenceBuilder } from "./SentenceBuilder"
import { SideBySideTranslation } from "./SideBySideTranslation"
import { SilentLetterHighlight } from "./SilentLetterHighlight"
import { SyllableChips } from "./SyllableChips"
import { TenFrame } from "./TenFrame"
import { TryItInput } from "./TryItInput"
import { VerbTimeline } from "./VerbTimeline"
import { WordClassSort } from "./WordClassSort"

/** Callbacks that flow-escape blocks can invoke. Optional — when omitted the
 *  block still renders but the button is hidden (read-only view). */
export type BlockActions = {
  onAnswer?: (value: string) => void
  onRequestNewPhoto?: () => void
  onEndTask?: () => void
}

// Tag must start with a LETTER so we don't accidentally match plain
// bracketed numbers ("[1]", "[2]") that Dani sometimes writes for step
// labels, page references, or list markers. Tags are conventionally
// lowercase identifiers (tenframe, tryit, progress, …).
const BLOCK_RE = /\[([a-zA-Z]\w*)((?:\s+[a-zA-Z_]+="[^"]*")*)\s*\]/g
const ATTR_RE = /([a-zA-Z_]+)="([^"]*)"/g

export type BlockToken =
  | { kind: "text"; text: string }
  | { kind: "block"; name: string; attrs: Record<string, string> }

export function tokenise(source: string): BlockToken[] {
  const out: BlockToken[] = []
  let cursor = 0

  BLOCK_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = BLOCK_RE.exec(source)) !== null) {
    if (match.index > cursor) {
      out.push({ kind: "text", text: source.slice(cursor, match.index) })
    }
    const [, name, attrChunk] = match
    const attrs: Record<string, string> = {}
    ATTR_RE.lastIndex = 0
    let a: RegExpExecArray | null
    while ((a = ATTR_RE.exec(attrChunk)) !== null) {
      attrs[a[1]] = a[2]
    }
    out.push({ kind: "block", name: name.toLowerCase(), attrs })
    cursor = match.index + match[0].length
  }
  if (cursor < source.length) {
    out.push({ kind: "text", text: source.slice(cursor) })
  }
  return out
}

/** Render a parsed block. Unknown blocks render as dim literal text. */
export function renderBlock(
  name: string,
  attrs: Record<string, string>,
  key: string | number,
  actions?: BlockActions,
): React.ReactNode {
  const onAnswer = actions?.onAnswer
  const int = (v: string | undefined, fallback = 0) => {
    const n = parseInt(v ?? "", 10)
    return Number.isFinite(n) ? n : fallback
  }
  const intArr = (v: string | undefined): number[] =>
    (v ?? "")
      .split(/[,|]/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => parseInt(s, 10))
      .filter(n => Number.isFinite(n))

  switch (name) {
    case "tenframe":
      return <TenFrame key={key} a={int(attrs.a)} b={int(attrs.b)} />

    case "numbersplit":
      return (
        <NumberSplit
          key={key}
          whole={int(attrs.whole)}
          hundreds={attrs.hundreds ? int(attrs.hundreds) : undefined}
          tens={int(attrs.tens)}
          ones={int(attrs.ones)}
          rwhole={attrs.rwhole ? int(attrs.rwhole) : undefined}
          rhundreds={attrs.rhundreds ? int(attrs.rhundreds) : undefined}
          rtens={attrs.rtens ? int(attrs.rtens) : undefined}
          rones={attrs.rones ? int(attrs.rones) : undefined}
        />
      )

    case "syllables": {
      const breaks = (attrs.breaks ?? "").split("|").map(s => s.trim()).filter(Boolean)
      return (
        <SyllableChips
          key={key}
          word={attrs.word ?? breaks.join("")}
          breaks={breaks}
        />
      )
    }

    case "tryit":
      return (
        <TryItInput
          key={key}
          placeholder={attrs.placeholder ?? "Skriv dit bud"}
          onSubmit={onAnswer}
        />
      )

    case "needphoto":
      return (
        <NeedPhoto
          key={key}
          reason={attrs.reason}
          onTakePhoto={actions?.onRequestNewPhoto}
        />
      )

    case "offscope":
      return (
        <OffScope
          key={key}
          note={attrs.note}
          onEndTask={actions?.onEndTask}
        />
      )

    case "progress":
      // Silent metadata marker: step-completion state is rendered by the
      // StepChecklist at the top of the chat, not inside Dani's bubble.
      // Parent component parses [progress done="A,B" current="C"] from the
      // turn stream and updates the checklist. Don't render anything here.
      return null

    case "numberline":
      return (
        <NumberLine
          key={key}
          from={int(attrs.from)}
          to={int(attrs.to)}
          step={int(attrs.step, 1)}
        />
      )

    case "fractionbar":
      return (
        <FractionBar
          key={key}
          parts={int(attrs.parts, 4)}
          filled={int(attrs.filled, 0)}
          comparePartsProp={attrs.compareparts ? int(attrs.compareparts) : undefined}
          compareFilled={attrs.comparefilled ? int(attrs.comparefilled) : undefined}
        />
      )

    case "balancescale":
      return <BalanceScale key={key} left={intArr(attrs.left)} right={intArr(attrs.right)} />

    case "clock":
      return (
        <Clock
          key={key}
          hour={int(attrs.hour, 12)}
          minute={int(attrs.minute, 0)}
          highlight={attrs.highlight ? int(attrs.highlight) : null}
        />
      )

    case "base10":
      return <Base10Blocks key={key} tens={int(attrs.tens)} ones={int(attrs.ones)} />

    case "wordclass":
      return <WordClassSort key={key} items={attrs.items ?? ""} />

    case "sentencebuilder":
      return <SentenceBuilder key={key} words={attrs.words ?? ""} />

    case "doubleconsonant":
      return (
        <DoubleConsonantCheck
          key={key}
          right={attrs.right ?? ""}
          wrong={attrs.wrong ?? ""}
          hint={attrs.hint}
        />
      )

    case "silentletter":
      return (
        <SilentLetterHighlight
          key={key}
          word={attrs.word ?? ""}
          silent={int(attrs.silent, 0)}
          say={attrs.say}
        />
      )

    case "verbtimeline":
      return (
        <VerbTimeline
          key={key}
          sentence={attrs.sentence ?? ""}
          past={attrs.past ?? ""}
          present={attrs.present ?? ""}
          future={attrs.future ?? ""}
          active={(attrs.active as "past" | "present" | "future") ?? "past"}
        />
      )

    case "falsefriend":
      return (
        <FalseFriendAlert
          key={key}
          da={attrs.da ?? ""}
          daMeaning={attrs.dameaning ?? ""}
          en={attrs.en ?? ""}
          enMeaning={attrs.enmeaning ?? ""}
          note={attrs.note}
        />
      )

    case "contraction":
      return (
        <ContractionReveal
          key={key}
          full={attrs.full ?? ""}
          contracted={attrs.contracted ?? ""}
        />
      )

    case "sidebyside":
      return (
        <SideBySideTranslation
          key={key}
          da={attrs.da ?? ""}
          en={attrs.en ?? ""}
          highlight={attrs.highlight ? int(attrs.highlight) : -1}
        />
      )

    default:
      if (typeof console !== "undefined") {
        console.warn(`[blocks] Unknown block: ${name}`, attrs)
      }
      return (
        <span key={key} style={{ color: "#8A9280", fontFamily: "monospace" }}>
          [{name}]
        </span>
      )
  }
}

/**
 * Parse streamed text + render known blocks + bold/line-break markdown in the
 * surrounding prose. Suitable for use as children of a speech bubble.
 */
export function renderWithBlocks(
  source: string,
  actions?: BlockActions,
): React.ReactNode[] {
  const tokens = tokenise(source)
  const out: React.ReactNode[] = []
  tokens.forEach((tok, i) => {
    if (tok.kind === "text") {
      out.push(<MarkdownText key={`t${i}`} text={tok.text} />)
    } else {
      out.push(renderBlock(tok.name, tok.attrs, `b${i}`, actions))
    }
  })
  return out
}

/** Bold (**…**) + newlines → <br/>. Matches what RichText did before. */
function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <>
      {lines.map((line, i) => {
        if (line.trim() === "") return <br key={i} />
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <span key={i}>
            {i > 0 && lines[i - 1].trim() !== "" && <br />}
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <strong key={j} style={{ fontWeight: 700 }}>
                    {part.slice(2, -2)}
                  </strong>
                )
              }
              return <span key={j}>{part}</span>
            })}
          </span>
        )
      })}
    </>
  )
}
