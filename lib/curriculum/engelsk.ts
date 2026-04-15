import type { GradeCurriculum } from "./types"

// Danish folkeskole — English (Engelsk) curriculum, grades 1–7.
// English is introduced from grade 1 in Danish schools (since 2014 reform).

export const engelsk: Record<number, GradeCurriculum> = {
  1: {
    concepts: [
      "Grundlæggende ordforråd: farver, tal 1–10, dyr, mad",
      "Hilsner: Hello, Goodbye, Thank you, Please",
      "Navne: What is your name? My name is…",
      "Sange og remser på engelsk",
      "Lyde: den engelske alfabet",
      "Forstå enkle instruktioner: Sit down, Stand up, Open your book",
    ],
    commonMistakes: [
      "Udtaler engelske ord som danske",
      "Glemmer at 'I' altid er stort bogstav",
      "Blander dansk og engelsk ordstilling",
    ],
    terms: {
      "colour": "farve",
      "number": "tal",
      "animal": "dyr",
      "greeting": "hilsen",
    },
    approachHints: [
      "Brug billeder og fysiske ting til at forbinde ord og betydning",
      "Gentag sange og remser — rytmen hjælper med udtale",
      "Positive reaktioner: 'Well done!' og 'Good try!' opbygger tryghed",
    ],
  },

  2: {
    concepts: [
      "Tal 1–100 og simple regneopgaver på engelsk",
      "Familie og hverdagsliv: family, home, school",
      "Enkle sætninger: I like…, I have…, I can…",
      "Stedord: I, you, he, she, it, we, they",
      "Nutid: simple present (I eat, she runs)",
      "Spørgsmål: What? Where? Who?",
    ],
    commonMistakes: [
      "He/she-fejl: 'he run' i stedet for 'he runs'",
      "Glemmer 'a'/'an' foran navneord",
      "Blander 'his' og 'her'",
    ],
    terms: {
      "pronoun": "stedord (I, you, he, she...)",
      "simple present": "nutid — hvad der sker nu eller altid",
      "question word": "spørgeord (what, where, who, when, how)",
    },
    approachHints: [
      "Simple present: 'Hvad gør du hver dag?' — sæt ord på rutiner",
      "He/she + s: lav en huskeregel — 'han og hun har et s'",
      "Byggestene: subjekt + verbal + objekt — kort og enkelt",
    ],
  },

  3: {
    concepts: [
      "Datid: simple past (I walked, she played)",
      "Uregelmæssige verber: go/went, have/had, see/saw",
      "Beskrivende sætninger med adjektiver",
      "Ordforråd: vejret, klokken, årstider, kroppen",
      "Skrive korte afsnit om sig selv og sin hverdag",
      "Læse og forstå enkle engelske tekster",
    ],
    commonMistakes: [
      "'I goed' i stedet for 'I went' — uregelmæssige verber",
      "'Yesterday I go' — glemmer datidsform",
      "Stavefejl i hyppige ord: friend, because, there",
    ],
    terms: {
      "simple past": "datid — hvad der skete i fortiden",
      "irregular verb": "uregelmæssigt verbum — datid dannes ikke med -ed",
      "adjective": "tillægsord der beskriver et navneord (big, red, happy)",
    },
    approachHints: [
      "Datid: start med regelmæssige (+ed), lær de 10 mest brugte uregelmæssige",
      "Uregelmæssige: lav kort over de hyppigste: go/went, have/had, come/came",
      "Skriv om i går: 'Yesterday I…' — giver naturlig datid-kontekst",
    ],
  },

  4: {
    concepts: [
      "Fremtid: will og going to",
      "Nutid udvidet: present continuous (I am running)",
      "Spørge- og nægtesætninger: do/does/did",
      "Præpositioner: in, on, at, under, between",
      "Ordforråd: geografi, lande, nationaliteter",
      "Emailskriving og simple breve",
    ],
    commonMistakes: [
      "'I am go' i stedet for 'I am going'",
      "Do/does-fejl: 'She do not like' i stedet for 'does not'",
      "Will vs. going to — bruger dem om hinanden",
      "Præpositioner: in/on/at tid og sted blandes",
    ],
    terms: {
      "present continuous": "nutid udvidet — noget der sker lige nu (I am eating)",
      "going to": "planlagt fremtid (I am going to visit…)",
      "will": "spontan beslutning eller forudsigelse (It will rain)",
      "auxiliary verb": "hjælpeverbum (do, does, will, am, is, are)",
    },
    approachHints: [
      "Present continuous: 'Hvad laver du lige nu? I am ___-ing'",
      "Will vs. going to: 'Har du planlagt det? Brug going to. Besluttede du det nu? Brug will'",
      "Præpositioner: 'on' = kontakt med overflade, 'in' = inde i noget",
    ],
  },

  5: {
    concepts: [
      "Perfektum: present perfect (I have been, she has eaten)",
      "Passiv: the book was written by…",
      "Konditionalis: if I had…, I would…",
      "Ordforråd: samfund, miljø, teknologi",
      "Analyse af engelske tekster: tema og budskab",
      "Mundtlig præsentation på engelsk",
    ],
    commonMistakes: [
      "'I have went' i stedet for 'I have gone'",
      "Since vs. for: 'I have lived here since three years'",
      "Passiv: glemmer 'by' eller bruger forkert form af 'be'",
      "Konditionalis: blander type 1, 2 og 3",
    ],
    terms: {
      "present perfect": "nutid perfektum — noget der er sket med relevans nu (have + past participle)",
      "passive voice": "passiv — objektet er centrum: 'The ball was kicked'",
      "conditional": "betingelsessætning — 'If… then…'",
      "past participle": "tredje verbumform: go → gone, eat → eaten",
    },
    approachHints: [
      "Present perfect: 'Hvornår skete det? Hvis ikke vigtigt, brug perfect'",
      "Since/for: 'since = siden et tidspunkt, for = i en periode'",
      "Passiv: 'Flyt objektet forrest og brug to be + past participle'",
    ],
  },

  6: {
    concepts: [
      "Avancerede teksttyper: argumentation, nyhedsartikel",
      "Idiomer og faste udtryk",
      "Stil og register: formelt vs. uformelt",
      "Ordforrådsudvidelse: synonymer og antonymer",
      "Interkulturel forståelse: engelsktalende lande",
      "Litteratur: korthistorier og digte på engelsk",
    ],
    commonMistakes: [
      "Blander formelt og uformelt sprog i samme tekst",
      "Idiomer oversættes direkte fra dansk",
      "Synonymer: vælger et der ikke passer konteksten",
      "Mangler konjunktioner til at binde sætninger",
    ],
    terms: {
      "idiom": "fast udtryk med overført betydning (fx 'it's raining cats and dogs')",
      "register": "sprogniveau — formelt (brev til chef) vs. uformelt (til ven)",
      "synonym": "ord med næsten samme betydning (happy = glad = joyful)",
      "antonym": "ord med modsat betydning (hot ≠ cold)",
    },
    approachHints: [
      "Register: 'Hvem skriver du til? En chef eller en ven? Tilpas sproget'",
      "Idiomer: slå dem op — oversæt aldrig bogstaveligt",
      "Argumentation: point → example → explanation (PEE-metoden)",
    ],
  },

  7: {
    concepts: [
      "Avanceret grammatik: relative clauses, reported speech",
      "Akademisk skrivestil: essay og analyse",
      "Engelsksprogede medier og kildekritik",
      "Litterær analyse på engelsk",
      "Præsentationsteknik: struktur, argumentation, kontakt",
      "Globalt engelsk og varianter (AmE vs. BrE)",
    ],
    commonMistakes: [
      "Reported speech: glemmer at skifte tid (she said 'I go' → she said she went)",
      "Relative clauses: who/which/that blandes",
      "Essay: mangler klar tese i indledningen",
      "AmE/BrE: blander stavemåder (colour/color)",
    ],
    terms: {
      "relative clause": "relativsætning — tilføjer info om et navneord (the boy who…)",
      "reported speech": "refereret tale — hvad nogen sagde (she said that…)",
      "thesis statement": "hovedpåstand — kernesætningen i et essay",
      "topic sentence": "første sætning i et afsnit — siger hvad afsnittet handler om",
    },
    approachHints: [
      "Reported speech: 'Skift nutid til datid og skift stedord'",
      "Who/which/that: 'who = person, which = ting, that = begge'",
      "Essay: skriv tesen som ét klart svar på opgavens spørgsmål",
    ],
  },
}
