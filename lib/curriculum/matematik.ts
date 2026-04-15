import type { GradeCurriculum } from "./types"

// Danish folkeskole mathematics curriculum, grades 1–7.
// Based on Fælles Mål (common learning objectives).
// Used to inject grade-appropriate context into AI prompts.

export const matematik: Record<number, GradeCurriculum> = {
  1: {
    concepts: [
      "Tælle frem og tilbage til 20",
      "Addition og subtraktion inden for 10",
      "Halv og dobbelt",
      "Enkle geometriske former: cirkel, trekant, firkant",
      "Mere, færre, lige mange",
      "Mønstergenkendelse med tal og former",
    ],
    commonMistakes: [
      "Tæller med startpunktet (fx 3+2: tæller 3,4 og siger 4 i stedet for 5)",
      "Blander symbolerne + og −",
      "Glemmer at nul er et tal",
    ],
    terms: {
      "plus": "lægge til / addition",
      "minus": "trække fra / subtraktion",
      "er lig med": "resultatet",
      "halvdel": "det ene af to lige store dele",
    },
    approachHints: [
      "Brug konkrete ting (fingre, klodser, ting i rummet) til at illustrere",
      "Tegn tallinjen — lad barnet hoppe langs den",
      "Sæt historier bag opgaverne: 'Lærke har 3 æbler, Jonas giver hende 2 mere'",
    ],
  },

  2: {
    concepts: [
      "Addition og subtraktion inden for 20",
      "Multiplikation som gentagen addition (2+2+2 = 3×2)",
      "Enkle brøker: ½, ¼",
      "Måling: cm, m, kg, liter",
      "Klokken (hel og halv)",
      "Par og ulige tal",
    ],
    commonMistakes: [
      "Glemmer at bære ved addition over 10",
      "Blander tæller og nævner i brøker",
      "Forvirring mellem cm og m",
    ],
    terms: {
      "halvdelen": "½ — en ud af to lige store dele",
      "kvart": "¼ — en ud af fire lige store dele",
      "centimeter": "cm — 100 cm = 1 meter",
      "liter": "l — mål for rumfang (mælk, vand)",
    },
    approachHints: [
      "Multiplikation: tegn grupper — 3 grupper med 4 prikker",
      "Brøker: fold et papir og vis de dele",
      "Klokken: brug et legetøjsur hvis muligt",
    ],
  },

  3: {
    concepts: [
      "Multiplikationstabellen 1–10",
      "Division som omvendt multiplikation",
      "Titalssystemet op til 1000",
      "Subtraktion med lån",
      "Geometri: omkreds, rektangel, kvadrat",
      "Enkle statistik: tælle og sortere data",
    ],
    commonMistakes: [
      "Glemmer tabellerne for 6, 7, 8",
      "Forveksler division og subtraktion",
      "Fejl ved låning i subtraktion — låner fra forkert position",
      "Blander omkreds (rundt om) med areal (inden i)",
    ],
    terms: {
      "multiplikation": "gange — gentaget addition",
      "division": "dividere — dele ligeligt",
      "titalssystemet": "enkelt, tier, hundrede, tusinde",
      "omkreds": "den samlede længde rundt om en figur",
    },
    approachHints: [
      "Tabellerne: find mønstre (5-tabellen slutter på 0 eller 5)",
      "Division: start med 'Hvor mange grupper af X er der i Y?'",
      "Låning: vis med mønter — veksle en tier til ti enere",
    ],
  },

  4: {
    concepts: [
      "Brøker: tæller og nævner, sammenligne, forkorte",
      "Decimaltalsintro: 0,5 = ½",
      "Multiplikation og division med flercifrede tal",
      "Negative tal på tallinjen",
      "Areal af rektangel og kvadrat",
      "Sandsynlighed: meget sandsynligt, sjælden",
    ],
    commonMistakes: [
      "Lægger tællere og nævnere hver for sig: ½ + ½ = 2/4",
      "Blander decimal-komma og punktum",
      "Tror areal og omkreds er det samme",
      "Negative tal: tror –3 er større end –1",
    ],
    terms: {
      "tæller": "det øverste tal i en brøk — antal dele vi har",
      "nævner": "det nederste tal i en brøk — antal dele i alt",
      "decimalsystem": "tal med komma (0,5 er det samme som ½)",
      "areal": "fladen inden i en figur, målt i fx cm²",
    },
    approachHints: [
      "Brøker: 'Pizza-modellen' — del en cirkel op",
      "Decimaler: penge er gode — 0,50 kr = halvanden krone",
      "Areal: tæl ruterne på millimeterpapir",
      "Negative tal: temperatur er et godt eksempel",
    ],
  },

  5: {
    concepts: [
      "Procent og brøk og decimal (trio-sammenhæng)",
      "Beregning med brøker: lægge til og trække fra",
      "Koordinatsystemet (x- og y-akse)",
      "Ligninger: find den ukendte (x + 3 = 7)",
      "Volumen af quader",
      "Diagrammer: søjlediagram, cirkeldiagram",
    ],
    commonMistakes: [
      "Procent: tror 50% af 40 er 50+40",
      "Ligninger: laver samme operation på den ene side",
      "Koordinater: bytter x og y om",
      "Brøk-addition: lægger nævnere sammen",
    ],
    terms: {
      "procent": "ud af hundrede — 25% = 25/100 = 0,25",
      "koordinat": "en adresse i et koordinatsystem (x, y)",
      "ligning": "en sætning med et ukendt tal, fx x + 4 = 9",
      "volumen": "rumindhold — målt i fx cm³ eller liter",
    },
    approachHints: [
      "Procent: start med 10% (del med 10), byg videre",
      "Ligninger: 'Hvad mangler for at vægten balancerer?'",
      "Koordinater: 'gå langs x først, så op ad y'",
      "Brøker med forskellig nævner: find fælles nævner først",
    ],
  },

  6: {
    concepts: [
      "Algebraiske udtryk og forenkling",
      "Regnearter med negative tal",
      "Pythagoras (introduktion)",
      "Procentændringer: stigning og fald",
      "Funktioner og grafer",
      "Statistik: middelværdi, median, typetal",
    ],
    commonMistakes: [
      "Algebra: lægger bogstaver og tal sammen (2x + 3 = 5x)",
      "Glemmer parenteser ved negativ multiplikation",
      "Median: glemmer at sortere tal først",
      "Procentstigning: beregner forkert grundtal",
    ],
    terms: {
      "algebraisk udtryk": "blanding af tal og bogstaver, fx 3x + 2",
      "middelværdi": "gennemsnittet — sum delt med antal",
      "median": "midterste tal i en sorteret liste",
      "typetal": "det tal der optræder flest gange",
    },
    approachHints: [
      "Algebra: erstat bogstav med et tal og check om det giver mening",
      "Statistik: lad barnet samle rigtig data (fx højder i klassen)",
      "Grafer: start med at finde to punkter, tegn linjen igennem",
    ],
  },

  7: {
    concepts: [
      "Ligningssystemer (to ligninger, to ukendte)",
      "Trigonometri: sinus, cosinus, tangens (introduktion)",
      "Sandsynlighedsregning",
      "Proportionalitet og omvendt proportionalitet",
      "Potenser og kvadratrødder",
      "Statistisk analyse og boks-plot",
    ],
    commonMistakes: [
      "Potenser: tror 3² = 3×2 = 6 i stedet for 3×3 = 9",
      "Proportionalitet: forveksler ligefrem og omvendt",
      "Sandsynlighed over 1 (fx P=1,2)",
      "Trigonometri: bruger forkert funktion (sin/cos/tan)",
    ],
    terms: {
      "potens": "et tal ganget med sig selv et antal gange: 2³ = 8",
      "kvadratrod": "det tal ganget med sig selv giver resultatet: √9 = 3",
      "proportionalitet": "to størrelser der vokser i samme forhold",
      "sandsynlighed": "hvor sandsynlig en hændelse er, angivet 0–1",
    },
    approachHints: [
      "Potenser: byg en tabel — 2¹, 2², 2³ — se mønsteret",
      "Trig: brug SOH-CAH-TOA som huskeregel",
      "Sandsynlighed: tæl gunstige vs. mulige udfald",
    ],
  },
}
