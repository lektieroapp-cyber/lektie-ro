import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { JsonLd } from "@/components/seo/JsonLd"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"

export const metadata: Metadata = {
  title: "Spørgsmål og svar",
  description:
    "Find svar på de mest stillede spørgsmål om LektieRo: fra hvad vi gør, til hvor vi opbevarer data og hvornår vi åbner.",
  alternates: { canonical: "/da/faq" },
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const m = getMessages(locale)

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: m.faq.items.map(it => ({
            "@type": "Question",
            name: it.q,
            acceptedAnswer: { "@type": "Answer", text: it.a },
          })),
        }}
      />
      <article className="mx-auto max-w-3xl px-5 py-14 md:px-6 md:py-20">
        <header className="text-center">
          <h1
            className="text-4xl md:text-5xl font-bold text-ink"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            {m.faq.title}
          </h1>
          <p className="mt-3 text-base text-muted">{m.faq.subtitle}</p>
        </header>

        <div
          className="mt-10 overflow-hidden rounded-card bg-white"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <ul className="divide-y divide-ink/5">
            {m.faq.items.map(item => (
              <li key={item.q}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-ink hover:bg-blue-tint/30">
                    <span className="font-semibold">{item.q}</span>
                    <span
                      aria-hidden
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink/15 text-blue-soft transition-transform duration-200 group-open:rotate-45"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <line x1="6" y1="1.5" x2="6" y2="10.5" />
                        <line x1="1.5" y1="6" x2="10.5" y2="6" />
                      </svg>
                    </span>
                  </summary>
                  <div className="px-6 pb-5 text-[15px] leading-relaxed text-ink/80">
                    {item.a}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </>
  )
}
