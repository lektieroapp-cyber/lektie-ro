import type { GradeCurriculum } from "./types"

// Danish folkeskole — Tysk (German) curriculum. In the standard Fælles
// Mål, German as a second foreign language starts in grade 5 and continues
// through 7+. Grades 1–4 get an empty stub because the subject simply
// isn't offered yet, but `getCurriculum` clamps gracefully.
//
// Initial pass based on real task pages collected 2026-04 (7. klasse
// "Das Klassenzimmer" + 5. klasse word-snake puzzles). Expand with real
// teacher input — see teacher interview questions in CLAUDE.md.

const stub: GradeCurriculum = {
  concepts: ["Tysk undervises først fra 5. klasse i folkeskolen."],
  commonMistakes: [],
  terms: {},
  approachHints: [
    "Hvis en opgave på dette niveau er tysk, forklar kort at tysk normalt starter i 5. klasse — men gå videre og hjælp alligevel.",
  ],
}

export const tysk: Record<number, GradeCurriculum> = {
  1: stub,
  2: stub,
  3: stub,
  4: stub,

  5: {
    concepts: [
      "Hilsner + introduktion: Hallo, Guten Tag, Ich heiße…, Ich bin… Jahre alt",
      "Grundlæggende ordforråd: farver, tal 1–20, familie, skole (Klassenzimmer)",
      "Bestemte artikler: der / die / das / die (flertal) — samme ord skifter artikel pr. køn",
      "Ubestemte artikler: ein / eine / ein",
      "Præpositioner for placering: auf, in, an, unter, neben, vor, hinter",
      "Enkle spørgsmål: Was ist das? Wie heißt du? Wo ist…?",
    ],
    commonMistakes: [
      "Vælger forkert artikel (der/die/das) — tysk har tre køn, dansk kun to",
      "Udtaler tysk som dansk: 'ich' som 'ik' i stedet for 'iç'",
      "Bruger dansk ordstilling: tysk har verbum-på-anden-plads i hovedsætninger",
      "Blander sein (at være) og haben (at have)",
    ],
    terms: {
      "der / die / das": "den / den / det — køn bestemmer artikel, skal læres ord for ord",
      "ein / eine": "en (hankøn/intetkøn) / en (hunkøn)",
      "Artikel": "kendeord (svarer til 'en/den' på dansk)",
      "Klassenzimmer": "klasseværelse",
      "Diktat": "diktat — lærer læser, elev skriver ordret",
    },
    approachHints: [
      "Artikler: lær dem ALTID sammen med substantivet. 'der Tisch', ikke kun 'Tisch'.",
      "Brug danske ord der ligner for at bygge bro: 'Brot' = brød, 'Haus' = hus.",
      "Udtale-hint: tysk 'ch' efter a/o/u er hård (som dansk 'h' i 'hat'), efter i/e er blød.",
      "Tekstlige opgaver bliver hurtigt tunge — tag et eksempel ad gangen.",
    ],
  },

  6: {
    concepts: [
      "Verbal-bøjning i nutid: ich gehe, du gehst, er/sie/es geht, wir gehen, ihr geht, sie gehen",
      "Modalverber: können, müssen, wollen, dürfen, sollen, mögen",
      "Akkusativ-objekt: den / die / das (hunkøn uændret)",
      "Tidsudtryk: am Montag, um 8 Uhr, jeden Tag",
      "Ugedage + måneder",
      "Daglige rutiner: aufstehen, frühstücken, zur Schule gehen",
    ],
    commonMistakes: [
      "Glemmer at bøje verbet efter person (alle 'ich gehen', 'du gehen')",
      "Forveksler nominativ og akkusativ: 'Ich sehe der Hund' i stedet for 'den Hund'",
      "Blander tysk og engelsk syntaks ved flersprogede elever",
    ],
    terms: {
      "Verbal": "udsagnsord",
      "Nominativ": "grundform — sætningens grundled",
      "Akkusativ": "genstandsledsform — det som handlingen ramler ind i",
      "Modalverb": "hjælpeverb (kan, skal, vil, må)",
    },
    approachHints: [
      "Bøjningstabellen lægges ind som en remse — genbrug den ofte.",
      "Akkusativ: 'den' kun i hankøn — 'die' og 'das' er uændrede. Kort regel.",
      "Brug mønstre eleven kender fra engelsk ('I can' ≈ 'ich kann').",
    ],
  },

  7: {
    concepts: [
      "Datid (Präteritum) for hyppige verber: war, hatte, ging, machte",
      "Perfektum (ich habe gemacht / ich bin gegangen): haben vs. sein som hjælpeverb",
      "Dativ — den tredje kasus: mit dem, in der, auf dem",
      "Bisætninger med 'weil', 'dass', 'wenn' — verbum til sidst",
      "Adjektiv-bøjning efter artikel",
      "Kultur: tysktalende lande (D-A-CH) — Tyskland, Østrig, Schweiz",
    ],
    commonMistakes: [
      "Placerer verbum forkert i bisætninger (bibeholder hovedsætnings-rækkefølge)",
      "Vælger haben når det skal være sein (bevægelsesverber)",
      "Glemmer dativ-endelse efter 'mit', 'zu', 'bei', 'nach'",
    ],
    terms: {
      "Präteritum": "datid — skrevet fortid, især i tekster",
      "Perfektum": "førnutid — 'jeg har gjort' — mest brugt i tale",
      "Dativ": "hensynsledsform (tredje kasus)",
      "Bisætning": "sætning der ikke kan stå alene — starter med weil, dass, wenn",
    },
    approachHints: [
      "Bisætnings-regel: 'verbum til sidst' efter weil/dass/wenn. Tegn det på papiret.",
      "Perfektum: haben til de fleste, sein kun til bevægelse + tilstandsændring (gegangen, geblieben).",
      "Dativ som 'hvem/hvad tjener handlingen?' — kan føles abstrakt, brug konkrete eksempler.",
    ],
  },
}
