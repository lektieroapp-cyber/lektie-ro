import type { GradeCurriculum } from "./types"

// Danish folkeskole — Danish (Dansk) curriculum, grades 1–7.

export const dansk: Record<number, GradeCurriculum> = {
  1: {
    concepts: [
      "Bogstav-lyd-sammenhæng (fonik)",
      "Stavemåder: enkle lydrette ord",
      "Sætningsopbygning: subjekt + verbal",
      "Store bogstaver og punktum",
      "Genkende og skrive egne navn og hverdagsord",
      "Lytte og fortælle: mundtlig kommunikation",
    ],
    commonMistakes: [
      "Blander b og d (spejlbogstaver)",
      "Glemmer store bogstaver i egennavne",
      "Sammenblandede lyde: sk/sg, ng/nk",
      "Glemmer punktum",
    ],
    terms: {
      "bogstav": "tegn der repræsenterer en lyd",
      "sætning": "en gruppe ord med et emne og en handling",
      "stor forbogstav": "bruges i starten af sætning og i navne",
    },
    approachHints: [
      "Lad barnet sige ordet højt og tælle lyde på fingrene",
      "Tegn bogstaverne i luften eller med fingeren på bordet",
      "Brug genkendelighed: 'Hvad lyder A som i dit navn?'",
    ],
  },

  2: {
    concepts: [
      "Læsning af enkle tekster med forståelse",
      "Ordklasser: navneord og udsagnsord",
      "Flertalsendelser: en/et, -er/-e",
      "Skrive enkle fortællinger",
      "Ordbogsbrug (intro)",
      "Rim og remser — sproglig bevidsthed",
    ],
    commonMistakes: [
      "en/et-fejl (grammatisk køn på dansk er svært)",
      "Glemmer stor forbogstav på egennavne",
      "Skriver lydret: 'hus' = 'hos'",
      "Flertalsendelser blandes: bøger vs. bøgerne",
    ],
    terms: {
      "navneord": "ord der navngiver ting, dyr, mennesker (fx hund, bog)",
      "udsagnsord": "ord der beskriver handlinger (fx løber, spiser)",
      "flertal": "mere end én: hund → hunde",
      "ental": "kun én: hund",
    },
    approachHints: [
      "en/et: test med 'en/et X' — mange ord har fast køn",
      "Fortæller: 'Hvem er med i historien? Hvad sker der?' — struktur",
      "Læseforståelse: stop ved hvert afsnit og spørg 'Hvad handlede det om?'",
    ],
  },

  3: {
    concepts: [
      "Teksttyper: fortælling og faktisk tekst",
      "Sætningsled: subjekt, verbal, objekt",
      "Tillægsord og grader (stor, større, størst)",
      "Direkte tale og anførelsestegn",
      "Stavning: hård og blød konsonant",
      "Skrive med indledning, midte og slutning",
    ],
    commonMistakes: [
      "Glemmer anførselstegn ved direkte tale",
      "Forveksler hård og blød d (mad vs. mand)",
      "Sammensatte ord klæbet forkert: 'sommer dag' i stedet for 'sommerdag'",
      "Tillægsord: fejl i gradbøjning",
    ],
    terms: {
      "subjekt": "den der gør noget i sætningen",
      "verbal": "det ord der beskriver handlingen (udsagnsordet i sætningen)",
      "objekt": "den det går ud over",
      "tillægsord": "ord der beskriver navneord (fx stor hund)",
      "anførelsestegn": "»…« eller \"…\" — bruges ved direkte tale",
    },
    approachHints: [
      "Sætningsanalyse: 'Hvem? Hvad gør de? Hvad/hvem gør de det ved?'",
      "Tekstopbygning: 'Start: hvad sker der? Midte: problem. Slut: løsning'",
      "Direkte tale: 'Hvad sagde personen præcis? Sæt det i citationstegn'",
    ],
  },

  4: {
    concepts: [
      "Tekstanalyse: tema, budskab, vinkel",
      "Ordklasser alle 9 (navneord, udsagnsord, tillægsord, biord...)",
      "Komma-regler (grundlæggende)",
      "Referat og resumé",
      "Lyrik: rim, rytme, billeder",
      "Stavning: stumme bogstaver, dobbeltkonsonant",
    ],
    commonMistakes: [
      "Komma: mangler komma foran 'men', 'fordi', 'selvom'",
      "Dobbeltkonsonant efter kort vokal glemmes: 'solen' vs 'sollen'",
      "Referat: fortæller hvad man mener, ikke hvad teksten siger",
      "Forveksler tema (emne) og budskab (hvad forfatteren vil sige)",
    ],
    terms: {
      "tema": "det overordnede emne teksten handler om",
      "budskab": "det forfatteren vil sige til læseren",
      "referat": "kort genfortælling af hvad der skete",
      "dobbeltkonsonant": "to ens konsonanter efter kort vokal (fatte, katte)",
    },
    approachHints: [
      "Komma: læs sætningen højt — pausér naturligt? Der er nok komma",
      "Tema vs. budskab: 'Hvad handler det om? Hvad vil det lære os?'",
      "Lyrik: 'Hvad ser du for dig? Hvad føler du? Hvad minder det dig om?'",
    ],
  },

  5: {
    concepts: [
      "Argumenterende tekster: påstand, argumentation, belæg",
      "Sproglige virkemidler: metafor, personifikation, gentagelse",
      "Skrivning af kronik / debatindlæg",
      "Medier og reklamer: at afkode budskaber",
      "Litteraturhistorie: folkeeventyr og sagn",
      "Avanceret komma og helsætning/ledsætning",
    ],
    commonMistakes: [
      "Blander påstand og argument",
      "Metafor vs. sammenligning (med/uden 'som')",
      "Helsætning vs. ledsætning: komma foran bisætninger",
      "Kronik: mangler en klar konklusion/opfordring",
    ],
    terms: {
      "påstand": "det man hævder er sandt (synspunktet)",
      "argument": "grunden til at påstanden er rigtig",
      "belæg": "bevis eller eksempel der støtter argumentet",
      "metafor": "et direkte billedsprog uden 'som' (fx 'livet er en rejse')",
      "personifikation": "ting eller dyr beskrives som mennesker",
    },
    approachHints: [
      "Argumentation: 'Hvad mener du? Hvorfor? Hvad er dit bevis?'",
      "Metafor: 'Sammenlign dette med noget helt andet — hvad ligner det?'",
      "Debatindlæg: intro → 3 argumenter → konklusion",
    ],
  },

  6: {
    concepts: [
      "Litterær analyse: person, miljø, handling, tid",
      "Fortællerforhold: jeg-fortæller vs. alvidende fortæller",
      "Sproghandlinger: informere, argumentere, underholde, påvirke",
      "Multimodale tekster: tekst + billede + lyd",
      "Sprogets forandring og dialekter",
      "Avanceret skrivning: novelle, essay",
    ],
    commonMistakes: [
      "Forveksler fortæller og forfatter",
      "Analyse: beskriver hvad der sker i stedet for at analysere",
      "Essay: springer fra emne til emne uden rød tråd",
      "Glemmer at understøtte tolkninger med citater",
    ],
    terms: {
      "fortæller": "den stemme der fortæller historien (ikke forfatteren)",
      "jeg-fortæller": "historien fortælles af én person inde fra",
      "alvidende fortæller": "ved alt om alle personer og kan se ind i tankerne",
      "sproghandling": "hvad en tekst gør (informerer, overtaler, underholder)",
    },
    approachHints: [
      "Analyse: 'Find et eksempel i teksten. Hvad siger det om personen?'",
      "Fortæller: 'Hvem fortæller? Hvad ved de? Hvad kan de se?'",
      "Essay: skriv én sætning der opsummerer hele dit synspunkt",
    ],
  },

  7: {
    concepts: [
      "Litterær fortolkning og perspektivering",
      "Retoriske virkemidler: etos, patos, logos",
      "Skriftlig fremstilling: akademisk sprog",
      "Sprog og magt: diskursanalyse (intro)",
      "Danmarks litteraturhistorie (overblik)",
      "Digitale medier og kildekritik",
    ],
    commonMistakes: [
      "Blander etos, patos og logos",
      "Perspektivering: sammenligner i stedet for at sætte i perspektiv",
      "Fortolkning uden tekstbelæg",
      "Kildekritik: accepterer alt fra nettet ukritisk",
    ],
    terms: {
      "etos": "troværdighed — afsenderen fremstår pålidelig",
      "patos": "følelser — teksten spiller på modtagerens følelser",
      "logos": "logik — teksten bruger fakta og rationelle argumenter",
      "perspektivering": "sætte teksten i en større sammenhæng",
      "diskurs": "den måde et emne tales om på i samfundet",
    },
    approachHints: [
      "Retorik: 'Vil teksten overbevise via fornuft, følelse eller tillid?'",
      "Kildekritik: 'Hvem har skrevet det? Hvornår? Hvad er formålet?'",
      "Fortolkning: 'Bevis det med et citat. Hvad kan det betyde?'",
    ],
  },
}
