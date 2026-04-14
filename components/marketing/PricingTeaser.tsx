import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"

const CheckIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="5 12 10 17 19 7" />
  </svg>
)

function Plan({
  name,
  price,
  interval,
  body,
  features,
  highlighted,
  badge,
}: {
  name: string
  price: string
  interval: string
  body: string
  features: string[]
  highlighted?: boolean
  badge?: string
}) {
  return (
    <div
      className={`relative flex flex-col rounded-card bg-white p-8 text-left ${
        highlighted ? "border-2 border-coral-deep/60" : ""
      }`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {badge && (
        <span className="absolute left-1/2 -top-3 -translate-x-1/2 rounded-chip bg-primary px-3 py-1 text-xs font-semibold tracking-wide text-white">
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
      <p className="mt-2 text-sm text-muted leading-relaxed">{body}</p>

      <div
        className="mt-6 text-5xl font-bold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {price}
        <span className="text-base font-normal text-muted">{interval}</span>
      </div>

      <ul className="mt-6 flex flex-col gap-3 border-t border-ink/5 pt-6">
        {features.map(f => (
          <li key={f} className="flex items-start gap-3 text-[15px] text-ink/85">
            <span
              aria-hidden
              className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                highlighted
                  ? "bg-coral-deep/10 text-coral-deep"
                  : "bg-success/15 text-success"
              }`}
            >
              {CheckIcon}
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PricingTeaser({ locale }: { locale: Locale }) {
  const m = getMessages(locale)

  return (
    <section className="bg-canvas">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-5 py-20 md:px-6 md:py-28 lg:py-32 text-center">
        <h2
          className="text-3xl md:text-4xl lg:text-5xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {m.pricing.title}
        </h2>
        <div className="mt-12 grid w-full gap-6 md:grid-cols-2">
          <Plan
            name={m.pricing.standard.name}
            price={m.pricing.standard.price}
            interval={m.pricing.standard.interval}
            body={m.pricing.standard.body}
            features={m.pricing.standard.features}
          />
          <Plan
            name={m.pricing.family.name}
            price={m.pricing.family.price}
            interval={m.pricing.family.interval}
            body={m.pricing.family.body}
            features={m.pricing.family.features}
            highlighted
            badge={m.pricing.family.badge}
          />
        </div>
        <p className="mt-8 max-w-md text-xs text-muted">{m.pricing.note}</p>
      </div>
    </section>
  )
}
