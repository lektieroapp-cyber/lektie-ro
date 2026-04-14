import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"

export function PromiseBand({ locale }: { locale: Locale }) {
  const m = getMessages(locale)
  const bodyParts = m.promise.body.split("{highlight}")

  return (
    <section className="bg-navy text-white">
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 text-center">
        <div aria-hidden className="text-4xl mb-4">💡</div>
        <h2
          className="text-3xl md:text-4xl font-bold text-white"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {m.promise.title}
        </h2>
        <p className="mt-5 text-base md:text-lg text-white/80 leading-relaxed">
          {bodyParts[0]}
          <strong className="text-white font-semibold">{m.promise.highlight}</strong>
          {bodyParts[1]}
        </p>
      </div>
    </section>
  )
}
