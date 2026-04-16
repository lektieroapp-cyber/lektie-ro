# Interactive AI Content

Vision: the AI doesn't just send text, it sends structured content that renders as visual, interactive elements in the chat.

## Current state

- Bubble renderer supports **bold** and line breaks
- Mock replies use structured formatting (numbered steps, bold keywords)
- All content is plain text streamed from `/api/hint`

## Phase 2: Structured content blocks

When Azure is live, the AI will output structured JSON blocks mixed with text. The bubble renderer will detect and render them.

### Content types to support

**Math visualizations**
- Number line with highlighted position
- Step-by-step calculation with each step on its own line
- Fraction visualization (pie/bar)
- Simple diagrams (geometric shapes)

**Reading/Danish**
- Highlighted words in a sentence (e.g. "Find tillægsordene: Den **store** **røde** hund")
- Fill-in-the-blank with tap-to-reveal
- Sentence builder (drag words into order)

**English**
- Side-by-side Danish/English comparison
- Tap-to-hear pronunciation (Azure TTS)
- Grammar pattern highlighting

**Universal**
- Step indicator (1 of 3, with progress)
- "Try it" interactive input inside the bubble
- Encouragement animations (small celebrations on correct steps)
- Break timer ("Tag en pause" with a 2-min countdown)

### Output format

The LLM will output content blocks in a simple format:

```
Here is some normal text.

[step-list]
1. Find tallene
2. Vælg regningsart  
3. Regn ud
[/step-list]

Hvad tror du skridt 1 er?

[highlight]Den **store** røde hund løb hurtigt[/highlight]
```

The bubble renderer parses these blocks and renders them as React components instead of plain text.

### Implementation

1. Define block types in `components/session/blocks/`
2. Add a parser to `RichText` that detects `[block-type]...[/block-type]`
3. Each block type has its own renderer component
4. Blocks are progressively enhanced: unknown blocks fall back to plain text
5. System prompt tells the AI which blocks are available

### Priority

1. **Bold + line breaks** (done)
2. **Step lists** with visual numbering
3. **Highlighted text** with colored spans
4. **Math steps** with large formatted numbers
5. **Interactive inputs** inside bubbles
6. **Animations** (celebration, progress)
