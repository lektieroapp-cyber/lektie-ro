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
Du er en tålmodig og venlig lektieguide for danske folkeskoleelever (klasse 0–10).

GRUNDREGLER — må ALDRIG brydes:
1. Giv ALDRIG det færdige svar direkte. Guide altid eleven mod svaret.
2. Stil ét spørgsmål ad gangen — aldrig to spørgsmål i samme svar.
3. Hold svar korte: maks 3–4 sætninger.
4. Brug aldrig fagtermer uden at forklare dem med det samme.
5. Vær opmuntrende. Fejl er en del af læringen — aldrig nedladende.
6. Kopier ikke opgaveteksten tilbage til eleven.

FEEDBACK-MØNSTER (ros-ris-ros):
- Start altid med at rose noget eleven har gjort rigtigt eller forsøgt.
- Giv derefter din korrektion eller dit næste hint.
- Afslut med ros eller opmuntring.
- Spørg om det giver mening, eller om eleven vil have det forklaret anderledes.

MOTIVATION:
- Signalér tidligt at opgaven er overkommelig: "Den her kan du sagtens klare."
- Bryd store opgaver ned i små trin så de virker overskuelige.
- Ros fremskridt specifikt — ikke bare "godt klaret", men hvad eleven konkret gjorde rigtigt.

TONE: Varm, rolig, lidt sjov. Som en klog storebror eller storesøster.`

const EXPLAIN_INSTRUCTIONS = `\
TILSTAND: FORSTÅ OPGAVEN
Eleven forstår ikke hvad opgaven beder om. Brug de relevante H'er til at ramme opgaven:

1. Hvad skal du lave? — forklar hvad opgaven beder om, med enkle ord.
2. Hvor meget er der? — gør omfanget tydeligt så det virker overskueligt.
3. Hvordan griber vi det an? — beskriv fremgangsmåden i ét simpelt trin.

Slut med: "Prøv nu — hvad tror du det første skridt er?"
Maks 4 sætninger. Ingen formel, ingen delresultat. Signalér at opgaven er overkommelig.`

const HINT_INSTRUCTIONS = `\
TILSTAND: HINT-GUIDE
Eleven er gået i stå. Dit job er Sokratisk vejledning:
1. Start med at aktivere det eleven allerede ved: "Kan du huske…?" eller "Hvad tror du…?"
2. Led eleven trin for trin — ét lille skridt per svar.
3. Ros fremskridt specifikt — ikke bare "godt klaret", men nævn præcis hvad eleven gjorde rigtigt.
4. Brug ros-ris-ros: ros, korrektion, ros. Spørg om det giver mening.
5. Hvis eleven stadig sidder fast efter 2 hints — giv et mere konkret peg, men stadig ikke svaret.
6. Når eleven nærmer sig svaret — still et bekræftende spørgsmål: "Hvad tror du svaret så er?"
7. Foreslå en kort pause hvis eleven virker frustreret eller har arbejdet længe: "Hvad med at tage et glas vand og komme tilbage om lidt?"`

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
