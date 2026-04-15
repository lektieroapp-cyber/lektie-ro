import { notFound } from "next/navigation"
import { isLocale } from "@/lib/i18n/config"

export const metadata = {
  title: "Vilkår",
  description:
    "Vilkår for brug af LektieRo – en AI-baseret lektiehjælp til danske folkeskoleelever.",
  alternates: { canonical: "/da/terms" },
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <h1
        className="text-4xl md:text-5xl font-bold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        Vilkår
      </h1>
      <p className="mt-3 text-sm text-muted">
        Senest opdateret: 14. april 2026 · Version 1.0
      </p>

      <div className="prose-legal mt-10 flex flex-col gap-6 text-ink/90 leading-relaxed">
        <Section title="1. Om LektieRo">
          <p>
            LektieRo er en online tjeneste, der hjælper børn i folkeskolealderen
            med deres lektier ved hjælp af kunstig intelligens. Tjenesten ejes
            og drives af <strong>[Virksomhedsnavn indsættes]</strong>, CVR
            [CVR-nummer], [adresse] (herefter &quot;vi&quot; eller
            &quot;LektieRo&quot;).
          </p>
          <p>
            Disse vilkår gælder mellem dig som kontohaver (&quot;du&quot; /
            &quot;forælderen&quot;) og LektieRo. Ved at oprette en konto eller
            tilmelde dig ventelisten accepterer du vilkårene.
          </p>
        </Section>

        <Section title="2. Tjenestens formål – ingen erstatning for lærer eller skole">
          <p>
            LektieRo giver Socratisk vejledning: AI'en stiller spørgsmål og
            viser metoder, men giver aldrig facit. Tjenesten er tænkt som et
            supplement til undervisning i folkeskolen og erstatter hverken
            lærer, skole eller forælderens eget ansvar for barnets læring.
          </p>
          <p>
            Vi kan ikke garantere, at AI'ens vejledning altid er fuldstændig
            eller korrekt. Du bør som forælder løbende følge med i barnets brug.
          </p>
        </Section>

        <Section title="3. Konto og alderskrav">
          <p>
            Kontoen oprettes og administreres af en forælder eller anden
            indehaver af forældremyndigheden. Kontohaveren skal være fyldt 18 år.
          </p>
          <p>
            Børn kan alene benytte tjenesten via forælderens konto og under
            forælderens ansvar. Forælderen er ansvarlig for at afgive samtykke
            til behandling af barnets personoplysninger, jf. vores{" "}
            <a href="/da/privacy" className="text-blue-soft underline">
              privatlivspolitik
            </a>
            .
          </p>
          <p>
            Du er selv ansvarlig for at holde dine loginoplysninger fortrolige
            og for al aktivitet på din konto.
          </p>
        </Section>

        <Section title="4. Priser og betaling">
          <p>
            Priser fremgår af{" "}
            <a href="/da/pricing" className="text-blue-soft underline">
              prissiden
            </a>{" "}
            og er angivet i danske kroner inkl. moms. Abonnement betales
            forud for den valgte periode.
          </p>
          <p>
            I MVP-perioden er tjenesten ikke sat til salg – tilmelding sker
            via venteliste. Når betaling aktiveres, vil priser og
            betalingsbetingelser fremgå tydeligt inden du bekræfter købet.
          </p>
        </Section>

        <Section title="5. Fortrydelsesret">
          <p>
            Som forbruger har du som udgangspunkt 14 dages fortrydelsesret ved
            køb af digitale tjenester, jf. forbrugeraftaleloven. Når du
            aktiverer et abonnement og begynder at bruge tjenesten, samtykker
            du til, at leveringen starter straks – hvorved fortrydelsesretten
            ophører i det omfang tjenesten er taget i brug.
          </p>
          <p>
            Du kan til enhver tid opsige dit abonnement fra forælderens
            dashboard. Opsigelse har virkning fra udgangen af den allerede
            betalte periode, og der refunderes ikke for resterende periode.
          </p>
        </Section>

        <Section title="6. Tilladt brug">
          <p>Du og dit barn må ikke:</p>
          <ul className="mt-3 list-disc pl-6 flex flex-col gap-1">
            <li>Bruge tjenesten til andet end lektiehjælp for barnet.</li>
            <li>
              Uploade billeder eller indhold, der ikke vedrører barnets egne
              lektier – herunder billeder af andre personer, fortroligt
              materiale eller materiale, der krænker ophavsret.
            </li>
            <li>
              Forsøge at omgå eller manipulere AI'en med henblik på at få
              færdige svar, snyd til prøver eller lignende.
            </li>
            <li>
              Dele kontoen med personer uden for husstanden eller videresælge
              adgangen.
            </li>
            <li>
              Reverse-engineere, scrape eller automatiseret tilgå tjenesten.
            </li>
          </ul>
          <p className="mt-3">
            Overtrædelse kan medføre øjeblikkelig suspension af kontoen uden
            refusion.
          </p>
        </Section>

        <Section title="7. Immaterielle rettigheder">
          <p>
            Al kode, design, prompts, grafik og øvrigt materiale i LektieRo
            tilhører LektieRo. Du får en ikke-eksklusiv, ikke-overdragelig ret
            til at bruge tjenesten i abonnementsperioden.
          </p>
          <p>
            Indhold, som barnet selv uploader (fx lektiebilleder), forbliver
            dit/barnets ejendom. Du giver LektieRo en tidsbegrænset ret til at
            behandle indholdet med henblik på at levere tjenesten – herunder at
            sende det til vores underdatabehandler Microsoft Azure OpenAI
            (Sweden Central) til analyse.
          </p>
        </Section>

        <Section title="8. Ansvarsbegrænsning">
          <p>
            Tjenesten leveres &quot;som den er og forefindes&quot;. Vi kan ikke
            garantere fuldstændig korrekthed af AI'ens vejledning,
            uafbrudt tilgængelighed eller fejlfri drift.
          </p>
          <p>
            I det omfang dansk ret tillader, er vores samlede ansvar begrænset
            til det beløb, du har betalt for tjenesten i de seneste 12 måneder
            forud for det ansvarspådragende forhold. Vi er ikke ansvarlige for
            indirekte tab, herunder tabt fortjeneste, datatab eller
            driftsforstyrrelser.
          </p>
          <p>
            Ansvarsbegrænsningen gælder ikke for skader forvoldt forsætligt
            eller ved grov uagtsomhed, eller hvor dansk ret ufravigeligt
            fastsætter et videre ansvar over for forbrugere.
          </p>
        </Section>

        <Section title="9. Driftsforstyrrelser og ændringer">
          <p>
            Vi kan foretage planlagt vedligeholdelse og løbende forbedringer af
            tjenesten. Væsentlige ændringer i funktionalitet eller vilkår
            varsles skriftligt mindst 30 dage før ikrafttrædelse. Er du uenig i
            en ændring, kan du opsige abonnementet med virkning fra
            ikrafttrædelsesdatoen.
          </p>
        </Section>

        <Section title="10. Opsigelse">
          <p>
            Du kan til enhver tid opsige dit abonnement fra kontoen. Vi kan
            opsige eller suspendere en konto ved væsentlig misligholdelse af
            disse vilkår, herunder overtrædelse af pkt. 6.
          </p>
          <p>
            Ved opsigelse slettes dine data efter den periode, der er angivet i{" "}
            <a href="/da/privacy" className="text-blue-soft underline">
              privatlivspolitikken
            </a>
            .
          </p>
        </Section>

        <Section title="11. Klager og tvister">
          <p>
            Har du en klage, kan du kontakte os på{" "}
            <a href="mailto:marcuz@lektiero.dk" className="text-blue-soft underline">
              marcuz@lektiero.dk
            </a>
            . Vi forsøger at løse alle klager inden for rimelig tid.
          </p>
          <p>
            Forbrugerklager over digitale tjenester kan indbringes for
            Forbrugerklagenævnet (Nævnenes Hus, Toldboden 2, 8800 Viborg,{" "}
            <a
              href="https://www.forbrug.dk"
              target="_blank"
              rel="noreferrer"
              className="text-blue-soft underline"
            >
              forbrug.dk
            </a>
            ) eller via EU-Kommissionens online klageportal:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noreferrer"
              className="text-blue-soft underline"
            >
              ec.europa.eu/consumers/odr
            </a>
            .
          </p>
        </Section>

        <Section title="12. Lovvalg og værneting">
          <p>
            Aftalen er underlagt dansk ret. Tvister afgøres ved Københavns
            Byret som første instans, medmindre ufravigelige regler om
            forbrugerens værneting tilsiger andet.
          </p>
        </Section>

        <Section title="13. Kontakt">
          <p>
            [Virksomhedsnavn indsættes]
            <br />
            CVR: [CVR-nummer]
            <br />
            [Adresse]
            <br />
            E-mail:{" "}
            <a href="mailto:marcuz@lektiero.dk" className="text-blue-soft underline">
              marcuz@lektiero.dk
            </a>
          </p>
        </Section>
      </div>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-ink mb-2">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}
