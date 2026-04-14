import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"

function Plan({
  name,
  price,
  interval,
  body,
  highlighted,
  badge,
}: {
  name: string
  price: string
  interval: string
  body: string
  highlighted?: boolean
  badge?: string
}) {
  return (
    <div
      className={`relative rounded-card p-8 text-center ${
        highlighted ? "border-2 border-coral-deep/60" : "bg-white"
      }`}
      style={{
        boxShadow: "var(--shadow-card)",
        backgroundColor: highlighted ? "white" : "white",
      }}
    >
      {badge && (
        <span
          className="absolute left-1/2 -top-3 -translate-x-1/2 rounded-chip bg-primary px-3 py-1 text-xs font-semibold tracking-wide text-white"
        >
          {badge}
        </span>
      )}
      <h3
        className={`text-xl font-semibold ${
          highlighted ? "text-coral-deep" : "text-ink"
        }`}
      >
        {name}
      </h3>
      <div
        className="mt-6 text-5xl font-bold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {price}
        <span className="text-base font-normal text-muted">{interval}</span>
      </div>
      <p className="mt-6 text-sm text-blue-soft leading-relaxed">{body}</p>
    </div>
  )
}

export function PricingTeaser({ locale }: { locale: Locale }) {
  const m = getMessages(locale)

  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2
          className="text-center text-3xl md:text-4xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {m.pricing.title}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Plan
            name={m.pricing.standard.name}
            price={m.pricing.standard.price}
            interval={m.pricing.standard.interval}
            body={m.pricing.standard.body}
          />
          <Plan
            name={m.pricing.family.name}
            price={m.pricing.family.price}
            interval={m.pricing.family.interval}
            body={m.pricing.family.body}
            highlighted
            badge={m.pricing.family.badge}
          />
        </div>
        <p className="mt-8 text-center text-xs text-muted">{m.pricing.note}</p>
      </div>
    </section>
  )
}
