import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"

type IconProps = { className?: string }

const HeartIcon = ({ className }: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
  </svg>
)
const ShieldIcon = ({ className }: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2l8 4v6c0 5-3.5 9.3-8 10-4.5-.7-8-5-8-10V6l8-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)
const SparkleIcon = ({ className }: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3l2.2 5.4L20 10l-5.4 2.2L12 18l-2.2-5.8L4 10l5.8-1.6z" />
  </svg>
)
const HomeIcon = ({ className }: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />
  </svg>
)
const TrendIcon = ({ className }: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="15 7 21 7 21 13" />
  </svg>
)
const BookIcon = ({ className }: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5z" />
    <path d="M4 4.5v16" />
  </svg>
)

type Item = { title: string; body: string; icon: React.ReactNode }

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
      className="rounded-card p-8 md:p-10"
      style={{
        boxShadow: "var(--shadow-card)",
        backgroundColor: isChild ? "white" : "var(--color-mint-soft)",
      }}
    >
      <h3
        className={`text-2xl md:text-3xl font-bold ${
          isChild ? "text-ink" : "text-mint-deep"
        }`}
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {title}
      </h3>
      <ul className="mt-8 flex flex-col gap-6">
        {items.map(it => (
          <li key={it.title} className="flex items-start gap-4">
            <span
              aria-hidden
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{
                background: isChild ? "var(--color-mint-soft)" : "#ffffff",
                border: "1.5px solid var(--color-mint-edge)",
                color: "var(--color-mint-deep)",
              }}
            >
              {it.icon}
            </span>
            <span className="text-[15px] leading-relaxed text-ink/80">
              <strong className="font-semibold text-ink">{it.title}.</strong>{" "}
              {it.body}
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
    { ...m.benefits.child.items.learning, icon: <HeartIcon /> },
    { ...m.benefits.child.items.safety, icon: <ShieldIcon /> },
    { ...m.benefits.child.items.mastery, icon: <SparkleIcon /> },
  ]
  const parentItems: Item[] = [
    { ...m.benefits.parent.items.peace, icon: <HomeIcon /> },
    { ...m.benefits.parent.items.insight, icon: <TrendIcon /> },
    { ...m.benefits.parent.items.pedagogy, icon: <BookIcon /> },
  ]

  return (
    <section id="benefits" className="bg-canvas">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-20 md:grid-cols-2 md:px-6 md:py-28 md:gap-8 lg:py-32">
        <Card title={m.benefits.child.title} items={childItems} tone="child" />
        <Card title={m.benefits.parent.title} items={parentItems} tone="parent" />
      </div>
    </section>
  )
}
