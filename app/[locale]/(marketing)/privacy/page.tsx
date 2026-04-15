import { notFound } from "next/navigation"
import { isLocale } from "@/lib/i18n/config"

export const metadata = {
  title: "Privatlivspolitik",
  description:
    "Sådan behandler LektieRo personoplysninger om forældre og børn – i overensstemmelse med GDPR og dansk databeskyttelsesret.",
  alternates: { canonical: "/da/privacy" },
}

export default async function PrivacyPage({
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
        Privatlivspolitik
      </h1>
      <p className="mt-3 text-sm text-muted">
        Senest opdateret: 14. april 2026 · Version 1.0
      </p>

      <div className="prose-legal mt-10 flex flex-col gap-6 text-ink/90 leading-relaxed">
        <section>
          <p>
            LektieRo er en dansk tjeneste, der hjælper børn i folkeskolealderen
            med deres lektier gennem AI-vejledning. Vi tager beskyttelsen af
            dine og dit barns personoplysninger alvorligt og behandler dem i
            overensstemmelse med databeskyttelsesforordningen (GDPR) og den
            danske databeskyttelseslov.
          </p>
        </section>

        <Section title="1. Dataansvarlig">
          <p>Dataansvarlig for behandlingen af personoplysninger er:</p>
          <p className="mt-3">
            <strong>[Virksomhedsnavn indsættes]</strong>
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
          <p className="mt-3">
            Henvendelser om behandling af personoplysninger kan sendes til ovenstående
            e-mail. Vi besvarer henvendelser inden for 30 dage.
          </p>
        </Section>

        <Section title="2. Hvilke personoplysninger behandler vi">
          <p>Vi behandler følgende kategorier af oplysninger:</p>
          <ul className="mt-3 list-disc pl-6 flex flex-col gap-1">
            <li>
              <strong>Om forælderen (kontohaver):</strong> e-mailadresse,
              krypteret adgangskode, navn (hvis oplyst via Google-login),
              betalingsoplysninger (når betaling aktiveres), IP-adresse samt
              tekniske log-data.
            </li>
            <li>
              <strong>Om barnet:</strong> fornavn (eller kaldenavn), klassetrin
              og valgt avatar-emoji. Vi indsamler ikke efternavn, adresse,
              fødselsdato eller billeder af barnet.
            </li>
            <li>
              <strong>Lektiebilleder:</strong> fotos uploadet af barnet/forælderen
              under en lektiesession. Billederne kan indeholde håndskrift eller
              tryk fra lærebøger.
            </li>
            <li>
              <strong>Sessionsdata:</strong> udtrukket opgavetekst, fag,
              klassetrin-estimat samt samtaleforløbet (spørgsmål og vejledning)
              mellem barnet og AI'en.
            </li>
            <li>
              <strong>Venteliste:</strong> e-mailadresse og sprog.
            </li>
          </ul>
          <p className="mt-3">
            Vi indsamler <strong>ingen</strong> særlige kategorier af oplysninger
            (sundhed, religion, etnisk oprindelse mv.) og bruger ikke
            tracking-cookies eller tredjeparts-analytics.
          </p>
        </Section>

        <Section title="3. Formål og retsgrundlag">
          <table className="mt-3 w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-ink/10">
                <th className="py-2 pr-4 font-semibold">Formål</th>
                <th className="py-2 font-semibold">Retsgrundlag (GDPR art. 6)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              <tr>
                <td className="py-2 pr-4">Levering af tjenesten (konto, lektiesessioner, dashboard)</td>
                <td className="py-2">Art. 6, stk. 1, litra b – kontraktopfyldelse</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Sikkerhed, misbrugsbeskyttelse og fejlfinding</td>
                <td className="py-2">Art. 6, stk. 1, litra f – legitim interesse</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Transaktionelle e-mails (velkomst, Parent Coach)</td>
                <td className="py-2">Art. 6, stk. 1, litra b – kontraktopfyldelse</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Tilmelding til venteliste / lanceringsbesked</td>
                <td className="py-2">Art. 6, stk. 1, litra a – samtykke</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Overholdelse af bogførings- og skattelovgivning</td>
                <td className="py-2">Art. 6, stk. 1, litra c – retlig forpligtelse</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3">
            Behandling af oplysninger om barnet sker på grundlag af forælderens
            samtykke og under forælderens ansvar som indehaver af
            forældremyndigheden. Forælderen bekræfter ved oprettelse af et
            barneprofil, at vedkommende har ret til at afgive samtykket.
          </p>
        </Section>

        <Section title="4. Hvor opbevares og behandles data – alt inden for EU/EØS">
          <p>
            Al behandling af personoplysninger finder sted inden for EU/EØS. Vi
            anvender følgende databehandlere:
          </p>
          <ul className="mt-3 list-disc pl-6 flex flex-col gap-1">
            <li>
              <strong>Supabase</strong> (database, autentifikation, fillagring)
              – data hostes i AWS-regionen <em>eu-north-1 (Stockholm, Sverige)</em>.
            </li>
            <li>
              <strong>Microsoft Azure OpenAI</strong> (AI-vejledning og billedanalyse)
              – ressourcen er provisioneret i regionen <em>Sweden Central (Gävle,
              Sverige)</em>, og al behandling sker inden for EU/EØS. Data bruges
              ikke til træning af Microsofts fundamentmodeller.
            </li>
            <li>
              <strong>Vercel</strong> (hosting af website og serverless-funktioner)
              – serverless-funktioner og edge-runtime kører i EU-regioner
              (primært Frankfurt, <em>fra1</em>).
            </li>
            <li>
              <strong>Resend</strong> (udsendelse af e-mails) – anvendt i EU-regionen
              hvor tilgængeligt. Overførsel til tredjeland kan forekomme; dette
              er dækket af Standard Contractual Clauses (SCC) og supplerende
              foranstaltninger.
            </li>
          </ul>
          <p className="mt-3">
            Vi har indgået databehandleraftaler med samtlige ovenstående
            leverandører i henhold til GDPR art. 28.
          </p>
        </Section>

        <Section title="5. Hvor længe gemmer vi data">
          <p>
            Vi opbevarer kun personoplysninger så længe det er nødvendigt for at
            levere tjenesten eller leve op til lovgivningen. Konkret:
          </p>
          <ul className="mt-3 list-disc pl-6 flex flex-col gap-1">
            <li>
              <strong>Lektiebilleder:</strong> opbevares så kort tid som muligt.
              Billederne bruges primært til at udtrække opgaveteksten, og vi
              arbejder løbende mod automatiseret sletning efter behandling. Du
              kan til enhver tid bede os slette alle dine uploadede billeder.
            </li>
            <li>
              <strong>Sessionsdata</strong> (udtrukket opgavetekst og
              samtaleforløb mellem barnet og AI'en): gemmes så længe kontoen er
              aktiv, så forælderen kan følge barnets fremskridt, og slettes ved
              sletning af kontoen.
            </li>
            <li>
              <strong>Konto- og profiloplysninger:</strong> gemmes så længe
              kontoen er aktiv. Ved opsigelse slettes personoplysninger inden
              for rimelig tid, medmindre vi er retligt forpligtet til at
              opbevare dem.
            </li>
            <li>
              <strong>Venteliste-tilmeldinger:</strong> slettes senest 12 måneder
              efter lancering eller ved afmelding – hvad der indtræffer først.
            </li>
            <li>
              <strong>Fakturering og bogføringsbilag:</strong> opbevares i 5 år
              efter udgangen af regnskabsåret, jf. bogføringsloven.
            </li>
          </ul>
          <p className="mt-3 text-sm">
            Ønsker du sletning af specifikke data før det sker automatisk, kan
            du skrive til{" "}
            <a href="mailto:marcuz@lektiero.dk" className="text-blue-soft underline">
              marcuz@lektiero.dk
            </a>
            .
          </p>
        </Section>

        <Section title="6. Videregivelse">
          <p>
            Vi sælger ikke personoplysninger og videregiver dem ikke til
            tredjeparter til markedsføring. Oplysninger kan videregives til
            offentlige myndigheder, hvis vi er retligt forpligtet hertil (fx
            skattemyndigheder eller politi ved kendelse).
          </p>
        </Section>

        <Section title="7. Sikkerhed">
          <p>
            Vi anvender branchestandard-sikkerhedsforanstaltninger: kryptering i
            transit (TLS) og at rest, hashede adgangskoder, adgangskontrol via
            role-based access og row-level security på databaseniveau.
            Lektiebilleder opbevares i en privat storage-bucket og er ikke
            offentligt tilgængelige.
          </p>
        </Section>

        <Section title="8. Dine rettigheder">
          <p>Som registreret har du følgende rettigheder efter GDPR art. 15–22:</p>
          <ul className="mt-3 list-disc pl-6 flex flex-col gap-1">
            <li>Ret til indsigt i dine oplysninger.</li>
            <li>Ret til berigtigelse af urigtige oplysninger.</li>
            <li>Ret til sletning (&quot;retten til at blive glemt&quot;).</li>
            <li>Ret til begrænsning af behandlingen.</li>
            <li>Ret til dataportabilitet (udlevering i maskinlæsbart format).</li>
            <li>Ret til indsigelse mod behandling baseret på legitim interesse.</li>
            <li>Ret til at tilbagekalde et afgivet samtykke til enhver tid.</li>
          </ul>
          <p className="mt-3">
            Rettighederne udøves ved at skrive til{" "}
            <a href="mailto:marcuz@lektiero.dk" className="text-blue-soft underline">
              marcuz@lektiero.dk
            </a>
            . For børn udøves rettighederne af forælderen som indehaver af
            forældremyndigheden.
          </p>
        </Section>

        <Section title="9. Klage til Datatilsynet">
          <p>
            Du har altid ret til at klage til Datatilsynet, hvis du er
            utilfreds med vores behandling af dine personoplysninger:
          </p>
          <p className="mt-3">
            Datatilsynet, Carl Jacobsens Vej 35, 2500 Valby
            <br />
            Telefon: 33 19 32 00
            <br />
            E-mail:{" "}
            <a href="mailto:dt@datatilsynet.dk" className="text-blue-soft underline">
              dt@datatilsynet.dk
            </a>
            {" · "}
            <a
              href="https://www.datatilsynet.dk"
              target="_blank"
              rel="noreferrer"
              className="text-blue-soft underline"
            >
              datatilsynet.dk
            </a>
          </p>
        </Section>

        <Section title="10. Cookies">
          <p>
            Vi anvender udelukkende <strong>nødvendige cookies</strong> til at
            holde dig logget ind (sessions-cookie fra Supabase Auth). Vi
            anvender ikke analytics-, marketing- eller tracking-cookies og viser
            derfor ikke et cookie-banner. Skulle vi på et senere tidspunkt
            introducere sådanne cookies, vil det ske på grundlag af dit
            udtrykkelige samtykke.
          </p>
        </Section>

        <Section title="11. Ændringer">
          <p>
            Vi kan opdatere denne privatlivspolitik. Væsentlige ændringer
            varsles via e-mail til kontohavere mindst 30 dage før ikrafttrædelse.
            Den aktuelle version kan altid findes på{" "}
            <a href="https://lektiero.dk/da/privacy" className="text-blue-soft underline">
              lektiero.dk/da/privacy
            </a>
            .
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
