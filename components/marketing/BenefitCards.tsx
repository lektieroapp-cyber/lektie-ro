import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"

type Item = { title: string; body: string; icon: string }

function Card({
  title,
  items,
  tone,
}: {
  title: string
  items: Item[]
  tone: "child" | "parent"
}) {
  const isChild = tone === "child"
  return (
    <div
      className={`rounded-card p-8 ${
        isChild ? "bg-white" : ""
      }`}
      style={{
        boxShadow: "var(--shadow-card)",
        backgroundColor: isChild ? "white" : "var(--color-blue-tint)",
      }}
    >
      <h3
        className={`text-2xl md:text-3xl font-bold ${
          isChild ? "text-blue-soft" : "text-coral-deep"
        }`}
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {title}
      </h3>
      <ul className="mt-6 flex flex-col gap-5">
        {items.map(it => (
          <li key={it.title} className="flex gap-3">
            <span
              aria-hidden
              className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center ${
                isChild ? "text-coral-deep" : "text-blue-soft"
              }`}
            >
              {it.icon}
            </span>
            <span className="text-ink/90 text-[15px] leading-relaxed">
              <strong className="font-semibold text-ink">{it.title}:</strong> {it.body}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BenefitCards({ locale }: { locale: Locale }) {
  const m = getMessages(locale)

  const childItems: Item[] = [
    { ...m.benefits.child.items.learning, icon: "♥" },
    { ...m.benefits.child.items.safety, icon: "🛡" },
    { ...m.benefits.child.items.mastery, icon: "★" },
  ]
  const parentItems: Item[] = [
    { ...m.benefits.parent.items.peace, icon: "⌂" },
    { ...m.benefits.parent.items.insight, icon: "↗" },
    { ...m.benefits.parent.items.pedagogy, icon: "◷" },
  ]

  return (
    <section id="benefits" className="bg-canvas">
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-2 md:py-20">
        <Card title={m.benefits.child.title} items={childItems} tone="child" />
        <Card title={m.benefits.parent.title} items={parentItems} tone="parent" />
      </div>
    </section>
  )
}
