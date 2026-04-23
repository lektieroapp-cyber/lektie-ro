# Pædagogisk retning — læringsmetodik

Denne doc er kilden til hvordan AI-guiden skal hjælpe børn gennem lektier: hvilke principper vi følger, hvilke mønstre vi bruger, og hvilke pædagogiske greb der sikrer at eleven lærer — ikke bare får et svar. Alt pædagogisk input samles her; tekniske/leverandør/GDPR-beslutninger ligger i `CLAUDE.md` og `docs/voice-pricing-estimates.md`.

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

**Forudsætning:** Kræver at sessioner og opgaver arkiveres og kan refereres, så AI'en kan pege tilbage på en konkret tidligere opgave eleven har løst.

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

## 9. Voice-input — tale som interaktion

Behov: børn skal kunne tale til appen i stedet for at skrive. To konkrete use cases:

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

**Pædagogiske niveauer af hjælp:**
- **Niveau 1:** Marker ordet med en diskret farve
- **Niveau 2:** AI'en læser ordet højt hvis barnet går i stå i 3+ sekunder
- **Niveau 3:** AI'en hjælper barnet med at "lyde" ordet (f.eks. b-a-d-e-v-æ-r-e-l-s-e)

**Forældreindblik:** "I dag læste Malthe 5 minutter og havde især fokus på ord med 'st-lyden'."

**Potentiel killer feature** — eksisterende læse-apps er mekaniske. LektieRo's varme tone + dette = unikt.

### Prioritering

1. **Use case A først** (mikrofon-knap til tale-input) — fjerner skrivebarrieren for de yngste og ordblinde. Lav pædagogisk kompleksitet, høj impact.
2. **Use case B senere** (Læse-Makker) — kræver nyt UI og real-time sammenligning. Den pædagogiske værdi ligger i nævne-scaffoldingen (marker → læs ordet → lyd det sammen). Prioriteres først når use case A er stabil.

> *Leverandørvalg, pricing, GDPR og teknisk integration hører hjemme i `docs/voice-pricing-estimates.md` + `CLAUDE.md`. Denne doc beholder kun det pædagogiske indhold.*

---

## 10. SMART-modellen (fra "De gode læringsmål")

Baseret på Lene Skovbo Heckmanns bog *De gode læringsmål*.

**Overordnet:** Et godt læringsmål skal skabe retning og motivation for eleven — ikke dikteres fra læreren. Eleven skal kunne svare på: *"Hvad skal jeg lære, og hvordan ved jeg at jeg har lært det?"*

SMART er et redskab til at gøre diffuse mål konkrete og brugbare for elev, lærer og forælder.

### Fem faktorer

| Bogstav | Faktor | Hvad det betyder |
|---|---|---|
| **S** | Specifikt | Målet skal være tydeligt, afgrænset. Eleven må ikke være i tvivl om hvad der refereres til. *Eksempel: ikke "mød stabilt" → "Jeg skal have min taske, mine bøger og mit penalhus med."* |
| **M** | Målbart | Der skal være klare tegn på succes. Vi skal kunne dokumentere at målet er nået. *Eksempel: uge-opgørelse der viser om eleven er kommet til tiden.* |
| **A** | Accepteret | Alle parter (elev, lærer, forælder) bakker op. Kræver dialog og skaber ejerskab/motivation. |
| **R** | Realistisk | Skal matche elevens niveau — hverken for let (kedeligt) eller for svært (demotiverende). Kræver kendskab til elevens ståsted. |
| **T** | Tidsafgrænset | Klart tidsperspektiv for hvornår målet skal være nået. Hjælper eleven med at regulere indsatsen. *Eksempel: "Til påske skal jeg være mødt til tiden i alle timer."* |

### Konkret eksempel

Diffust: "Jeg vil være god til tysk" → SMART: "Jeg vil kunne 10 bøjninger af 'sein' inden fredag."

### Anvendelse i LektieRo

SMART-modellen er det pædagogiske fundament for at sikre at LektieRo ikke bare giver svar, men hjælper barnet med at **sætte og nå egne læringsmål**.

1. **AI som dialog-partner for målsætning.** AI'en kan hjælpe barnet med at konvertere et løst mål ("jeg vil forstå brøker bedre") til et SMART mål ("jeg vil kunne forkorte 3 brøker uden hjælp inden næste matematiktime"). Opgavens faglige mål formuleres allerede i én sætning som første skridt.
2. **Visualisering i interface.** Forælder og barn kan sammen se status på SMART-mål over tid.
3. **Kæde flere sessioner sammen.** Et SMART mål strækker sig ofte over flere sessioner. Sessionshistorik kan drive "du er 7 ud af 10 brøk-opgaver i mål — 3 tilbage inden fredag".

---

## 11. Opgave-format (fra "vores lille test")

Tilføjet 23. april 2026. Konkrete observationer om hvordan opgaver bør håndteres teknisk:

1. **Inddel i opgavebeskrivelse og svar-felter.** Selve opgaven (det AI'en læser fra billedet) skal holdes adskilt fra elevens svar-felter. Barnet skal vide præcist hvor svaret til hvert delspørgsmål skrives ind — ikke bare ind i en fri chat.
2. **Ved løst opgave: markér med flueben.** Tydeligt visuelt signal når hver delopgave/trin er løst. Giver eleven følelsen af progression og forælderen et overblik.
3. **Ordlister til sprogfag.** I sprogfag (dansk, engelsk, tysk) skal AI'en guide barnet hen til den relevante ordliste og finde svaret dér, fremfor at give det direkte. Pædagogisk er dette centralt: at slå ord op er en færdighed i sig selv. AI'ens rolle er at pege på ordlisten som næste-skridt — ikke omgå den.

---

## 12. Pædagogiske funktioner — status

Pædagogisk rationale for hver funktion. Implementeringsdetaljer hører hjemme i `MVP_PLAN.md`.

### Leveret
- **Tydelig trin-progression.** Eleven og forælder ser i toppen af chatten præcis hvilke delopgaver der er løst og hvad der mangler. Giver motivation gennem konkret fremdrift.
- **Flueben ved løst trin.** Visuel bekræftelse lander automatisk når AI'en markerer et trin som løst. Reducerer tvivl og øger oplevelsen af succes.
- **Trin-annonceringer i Dani's svar.** AI'en siger hvilket trin vi arbejder på, roser kort når et trin er løst, og bevæger sig videre i samme svar.

### Ikke leveret endnu
- **SMART-målsætning som sub-flow.** En lille samtale ved sessionens start (eller første gang om ugen) hvor forælder + barn definerer et mål. Status vises derefter løbende.
- **Ordliste-vejledning i sprogfag.** AI'en guider til opslag i ordbogen/ordlisten som et konkret næste-skridt, så eleven øver selve opslagsfærdigheden.
- **Aktive pauser.** Subtil opfordring efter et vist antal opgaver eller minutter ("drik et glas vand, kom tilbage om 2 min"). Alders-differentieret.
- **Forælderindblik med faglige retningslinjer.** Udover svagheds-/styrke-indikatorer: en kort forklaring af "hvad arbejder 2. klasse matematik med lige nu" og "sådan kan du støtte hjemme".

---

## Opsummering — kerneprincipper

1. **Struktur** (de 10 H'er) — gør det klart hvad der skal ske
2. **Positiv feedback** (ros-ris-ros) — korriger uden at demotivere
3. **Anerkendelse** — specifik ros for fremskridt
4. **Pauser** — aktive pauser tilpasset alder
5. **Brobygge** — brug tidligere læring til at forklare nyt
6. **Forældreværktøjer** — giv forældre faglige retningslinjer
7. **Forældreindblik** — del opgaver og vejledning så familien kan samarbejde
8. **Overkommelighed** — rammesæt opgaven som nem fra start
9. **Voice-input** — tale-til-tekst for tilgængelighed + Læse-Makker som killer feature
10. **SMART-mål** — hjælp barnet med at sætte og nå egne læringsmål, ikke bare løse dagens opgave
11. **Opgave-format** — adskil beskrivelse fra svar, flueben ved løst trin, ordliste-guiding i sprogfag
