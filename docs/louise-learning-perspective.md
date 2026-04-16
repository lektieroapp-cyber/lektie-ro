# Louises faglige perspektiv — læringsmetodik

Louise er lærer og fagekspert, som rådgiver LektieRo om den pædagogiske tilgang. Herunder er hendes input til hvordan AI-guiden bedst understøtter læring.

---

## 1. De 10 H'er

Ti spørgsmål designet til at tydeliggøre krav og forventninger til en opgave. Oprindeligt fra autismepædagogik, men gavnlige for alle børn.

| # | Spørgsmål | Kategori |
|---|-----------|----------|
| 1 | Hvad skal jeg lave? | Indhold |
| 2 | Hvorfor skal jeg lave det? | Mening |
| 3 | Hvordan skal jeg lave det? | Metode |
| 4 | Hvor skal jeg lave det? | Placering |
| 5 | Hvornår skal jeg lave det? | Tidspunkt |
| 6 | Hvor længe skal jeg lave det? | Tidshorisont |
| 7 | Hvor meget skal jeg lave? | Mængde |
| 8 | Hvem skal jeg lave det med? | Personer |
| 9 | Hvem kan jeg få hjælp af? | Person |
| 10 | Hvad skal jeg lave bagefter? | Næste aktivitet |

**Formål:** Bryder en aktivitet ned i håndterbare dele. Giver klar vejledning som gør det nemmere at forstå og følge. Reducerer angst og stress ved at skabe forudsigelighed.

**Fordele:**
- Øget selvstændighed — barnet ved hvad det skal gøre uden konstant vejledning
- Mindre stress — klarhed og forudsigelighed
- Bedre kommunikation mellem barn, forældre og lærere

**Anvendelse i LektieRo:** Ved opstart af en session kan AI'en besvare relevante H'er for opgaven (ikke nødvendigvis alle 10 — tilpasses kontekst og alder). F.eks. "Hvad skal du lave?", "Hvor meget er der?", "Hvordan griber vi det an?"

---

## 2. Ros-ris-ros + opfølgning

Feedback-sandwichen: ros først, giv korrektionen, ros igen. Afslut altid med at spørge om der er noget der skal forklares på en anden måde.

---

## 3. Pointer og ros for fremskridt

Anerkend fremskridt i læring eksplicit. Ikke kun "godt klaret" men specifik ros der peger på hvad barnet har lært og udviklet sig i.

---

## 4. Aktive pauser

Indlæg små pauser undervejs: drik vand, hop på stedet, rejs dig og ryst benene, løb en tur i haven. Pausernes karakter og hyppighed differentieres efter alder.

**Implementering:** AI'en kan foreslå en pause efter et vist antal opgaver eller minutter, tilpasset barnets klassetrin.

---

## 5. Brug tidligere læring som bro

Referer til tidligere løste opgaver for at forklare nye. F.eks.:

> "Kan du huske da vi lærte om brøker? I denne opgave skal vi gøre noget af det samme — ligesom da du løste den opgave, skal du nu..."

**Forudsætning:** Kræver at sessioner og opgaver arkiveres og kan refereres. Knytter sig til sessions/turns-tabellerne i phase 2.

---

## 6. Forældrenes dashboard — læringsretningslinjer

Forældre Ro skal vise:
- Retningslinjer og læringsmetoder gengives i forbindelse med barnets udvikling
- Barnets svagheder og styrker
- Professionelle råd der giver forældrene mulighed for at understøtte og hjælpe barnet fra en faglig vinkel

---

## 7. Forældrenes dashboard — indblik i opgaver

Forældre skal:
- Have indblik i barnets opgaver
- Få forklaring på hvilket fagområde lektierne omhandler
- Få vejledning i hvordan de skal forstå, forklare og spørge ind til opgaven/emnet
- **Målet:** Skabe et fællesskab om lektierne — forældre og barn kan tale om og løse lektier sammen

---

## 8. Motivation ved opstart

Ved opstart af en opgave skal AI'en signalere at opgaven er overkommelig og kan løses hurtigt. Det skal virke overskueligt fra start.

**Mål:** 80% af opgaverne løses uden konflikter. Nøglen er at barnet ikke føler sig overvældet inden det er begyndt.

---

## 9. Voice-input — tale som interaktion (input fra Marcuz, april 2026)

Marcuz (klient) har rejst behovet for at børn kan tale til appen i stedet for at skrive. To konkrete use cases:

### Use case A: Tale-til-tekst som input (Voice-to-Method)

Barnet trykker på en mikrofon-knap og siger f.eks. *"Jeg ved ikke, hvordan man starter på denne her stil om vikinger."* Talen konverteres til tekst og sendes til AI'en, som svarer pædagogisk.

**Hvorfor det er vigtigt:**
- Fjerner skrivebarrieren for de mindste (0.–3. klasse) og ordblinde
- Gør interaktionen mere naturlig og tilgængelig
- Salgsargument: "Voice-to-Method" — tal dig til en løsningsmetode
- Passer til branding (Nærvær, fjern barrierer)

### Use case B: Læse-Makker (Real-time Audio-to-Text Comparison)

Barnet læser en tekst op. Systemet sammenligner det sagte med den faktiske tekst og giver blød pædagogisk feedback ved fejl.

**Flow:**
1. Tekst vises på skærmen
2. Barnet læser op, tale konverteres til tekst i realtid
3. Systemet sammenligner mod originalteksten
4. Ved fejl: blød pædagogisk pause (ikke brat stop — det er demotiverende)

**Pædagogiske niveauer af hjælp (Louise-aligned):**
- **Niveau 1:** Marker ordet med en diskret farve
- **Niveau 2:** AI'en læser ordet højt hvis barnet går i stå i 3+ sekunder
- **Niveau 3:** AI'en hjælper barnet med at "lyde" ordet (f.eks. b-a-d-e-v-æ-r-e-l-s-e)

**Forældreindblik:** "I dag læste Malthe 5 minutter og havde især fokus på ord med 'st-lyden'."

**Potentiel killer feature** — eksisterende læse-apps er mekaniske. LektieRo's varme tone + dette = unikt.

### Teknisk tilgang — GDPR-constraint

Marcuz' research nævnte OpenAI Whisper direkte og afviste Otter.ai (overkill for vores use case). **Men:** CLAUDE.md låser al databehandling til Azure Sweden Central. OpenAI direkte er ikke en option.

**Anbefalet løsning: Azure AI Speech (Speech-to-Text) — Sweden Central deployment.**

| Option | GDPR-compliant | Dansk | Pris | Vurdering |
|--------|---------------|-------|------|-----------|
| OpenAI Whisper API direkte | Nej (US-baseret) | God | Billig | **Kan ikke bruges** |
| Azure OpenAI Whisper (Sweden Central) | Ja | God (same Whisper model) | Billig (~0.36 kr/min) | **Bedste valg for Use case A** |
| Azure AI Speech (Speech-to-Text) | Ja (Sweden Central) | God | Billig (~0.60 kr/min) | **Bedste valg for Use case B** (har real-time streaming + word-level timestamps) |
| Web Speech API (browser-native) | Ja (on-device) | Varierende | Gratis | Kan bruges som fallback, men upålidelig på dansk og ingen word-level timing |

**Anbefaling:**
- **Use case A (tale-som-input):** Azure OpenAI Whisper deployment i Sweden Central. Simpelt: optag lyd → send til Azure → få tekst → send til Stage 2. Passer ind i eksisterende pipeline.
- **Use case B (Læse-Makker):** Azure AI Speech med real-time transcription og word-level timestamps. Nødvendigt for at kunne matche ord-for-ord og give feedback undervejs. Dette er en mere kompleks feature — fase 3+.

**Implementeringsrækkefølge:**
1. Use case A først (mikrofon-knap ved tekstinput) — lavt complexity, høj impact
2. Use case B (Læse-Makker) som selvstændig feature i senere fase — kræver nyt UI, real-time streaming, og tekst-sammenligning

---

## Opsummering — Louise's kerneprincipper

1. **Struktur** (de 10 H'er) — gør det klart hvad der skal ske
2. **Positiv feedback** (ros-ris-ros) — korriger uden at demotivere
3. **Anerkendelse** — specifik ros for fremskridt
4. **Pauser** — aktive pauser tilpasset alder
5. **Brobygge** — brug tidligere læring til at forklare nyt
6. **Forældreværktøjer** — giv forældre faglige retningslinjer
7. **Forældreindblik** — del opgaver og vejledning så familien kan samarbejde
8. **Overkommelighed** — rammesæt opgaven som nem fra start
9. **Voice-input** — tale-til-tekst for tilgængelighed + Læse-Makker som killer feature
