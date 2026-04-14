import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"

export function PromiseBand({ locale }: { locale: Locale }) {
  const m = getMessages(locale)
  const bodyParts = m.promise.body.split("{highlight}")

  return (
    <section className="bg-navy text-white">
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-28 lg:py-36 text-center">
        <div aria-hidden className="text-4xl">💡</div>
        <h2
          className="mt-6 text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1.12] text-balance"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {m.promise.title}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base md:text-lg text-white/75 leading-relaxed text-balance">
          {bodyParts[0]}
          <strong className="text-white font-semibold">{m.promise.highlight}</strong>
          {bodyParts[1]}
        </p>
      </div>
    </section>
  )
}
