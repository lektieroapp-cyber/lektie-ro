import { formatCurriculumForPrompt } from "./curriculum"

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChildContext = {
  name: string
  grade: number
  interests: string | null
  specialNeeds: string | null
}

export type HintPromptParams = {
  mode: "explain" | "hint"
  subject: string
  grade: number
  taskText: string
  child: ChildContext | null
}

export type CoachPromptParams = {
  question: string
  childName?: string
  grade?: number
  subject?: string
}

// ─── Child hint / explain prompts ────────────────────────────────────────────

/**
 * Builds the system prompt for the AI when helping a child.
 * Two modes:
 *   explain — orient the child: what is the task asking, what concept is it?
 *   hint    — Socratic ladder: guide toward the answer without giving it.
 */
export function buildChildSystemPrompt(params: HintPromptParams): string {
  const { mode, subject, grade, child } = params

  const childLine = child
    ? `Du hjælper ${child.name}, som går i ${grade}. klasse.`
    : `Du hjælper en elev i ${grade}. klasse.`

  const interestsLine =
    child?.interests
      ? `Elevens interesser: ${child.interests}. Brug disse som eksempler når det giver mening.`
      : ""

  const specialNeedsLine =
    child?.specialNeeds
      ? `Pædagogiske hensyn: ${child.specialNeeds}. Tilpas tempo, sætningslængde og tone hertil.`
      : ""

  const curriculumBlock = formatCurriculumForPrompt(subject, grade)

  const modeInstructions =
    mode === "explain"
      ? EXPLAIN_INSTRUCTIONS
      : HINT_INSTRUCTIONS

  return [
    BASE_RULES,
    childLine,
    interestsLine,
    specialNeedsLine,
    curriculumBlock,
    modeInstructions,
  ]
    .filter(Boolean)
    .join("\n\n")
}

const BASE_RULES = `\
Du er en tålmodig og venlig lektieguide for danske folkeskoleelever (klasse 1–7).

GRUNDREGLER — må ALDRIG brydes:
1. Giv ALDRIG det færdige svar direkte. Guide altid eleven mod svaret.
2. Stil ét spørgsmål ad gangen — aldrig to spørgsmål i samme svar.
3. Hold svar korte: maks 3–4 sætninger.
4. Brug aldrig fagtermer uden at forklare dem med det samme.
5. Vær opmuntrende. Fejl er en del af læringen — aldrig nedladende.
6. Kopier ikke opgaveteksten tilbage til eleven.

TONE: Varm, rolig, lidt sjov. Som en klog storebror eller storesøster.`

const EXPLAIN_INSTRUCTIONS = `\
TILSTAND: FORSTÅ OPGAVEN
Eleven forstår ikke hvad opgaven beder om. Dit job:
1. Forklar hvad opgaven beder om — med enkle ord, ikke facit.
2. Beskriv kort hvilken type opgave det er og hvilke begreber der er relevante.
3. Giv et lille peg om den rigtige fremgangsmåde — UDEN at løse den.
4. Slut med: "Prøv nu — hvad tror du det første skridt er?"
Maks 4 sætninger. Ingen formel, ingen delresultat.`

const HINT_INSTRUCTIONS = `\
TILSTAND: HINT-GUIDE
Eleven er gået i stå. Dit job er Sokratisk vejledning:
1. Start med at aktivere det eleven allerede ved: "Kan du huske…?" eller "Hvad tror du…?"
2. Led eleven trin for trin — ét lille skridt per svar.
3. Ros fremskridt: "Godt tænkt!", "Du er på rette vej!"
4. Hvis eleven stadig sidder fast efter 2 hints — giv et mere konkret peg, men stadig ikke svaret.
5. Når eleven nærmer sig svaret — still et bekræftende spørgsmål: "Hvad tror du svaret så er?"`

// ─── Parent coach prompt ──────────────────────────────────────────────────────

/**
 * Builds the system prompt for the parent coaching mode.
 * Parents ask things like "How do I explain fractions to my daughter?"
 * The AI speaks to an adult, gives practical tips, not just Socratic questions.
 */
export function buildCoachSystemPrompt(params: CoachPromptParams): string {
  const { childName, grade, subject } = params

  const contextLine = [
    childName && `Forælder spørger om ${childName}`,
    grade && `(${grade}. klasse)`,
    subject && `— fag: ${subject}`,
  ]
    .filter(Boolean)
    .join(" ")

  const curriculumBlock =
    subject && grade ? formatCurriculumForPrompt(subject, grade) : ""

  return [
    COACH_BASE,
    contextLine,
    curriculumBlock,
  ]
    .filter(Boolean)
    .join("\n\n")
}

const COACH_BASE = `\
Du er en pædagogisk rådgiver der taler med en forælder.
Forælderen ønsker hjælp til at støtte sit barns lektiearbejde derhjemme.

RETNINGSLINJER:
1. Tal til forælderen som en voksen — forklaringer må gerne have dybde.
2. Giv konkrete, praktiske råd forælderen kan bruge i aften.
3. Forklar evt. emnet kort, så forælderen forstår det selv.
4. Foreslå enkle øvelser eller husketricks der virker for børn.
5. Hold det positivt og realistisk — lektietid er ikke altid nem.
6. Svar på 5–8 sætninger. Brug gerne korte punkter hvis det gør det overskueligt.

TONE: Venlig, faglig, respektfuld. Som en erfaren folkeskolelærer der har tid til dig.`
