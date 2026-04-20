import { notFound } from "next/navigation"
import { CopyHtmlButton } from "@/components/admin/CopyHtmlButton"
import { EMAIL_TEMPLATES, type EmailTemplate } from "@/lib/email/templates"
import { isLocale } from "@/lib/i18n/config"

function StatusPill({ status }: { status: EmailTemplate["status"] }) {
  const map = {
    live: { label: "Live", classes: "bg-success/15 text-success" },
    planned: { label: "Planlagt", classes: "bg-muted/15 text-muted" },
  } as const
  const { label, classes } = map[status]
  return (
    <span className={`rounded-chip px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${classes}`}>
      {label}
    </span>
  )
}

function OwnerPill({ owner }: { owner: EmailTemplate["owner"] }) {
  const map = {
    supabase: { label: "Supabase", classes: "bg-blue-soft/10 text-blue-soft" },
    lektiero: { label: "LektieRo", classes: "bg-ink/10 text-ink" },
  } as const
  const { label, classes } = map[owner]
  return (
    <span className={`rounded-chip px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${classes}`}>
      {label}
    </span>
  )
}

function TemplateCard({ t }: { t: EmailTemplate }) {
  const html = t.preview?.()

  return (
    <article
      className="rounded-card bg-white p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <OwnerPill owner={t.owner} />
            <StatusPill status={t.status} />
          </div>
          <h3 className="mt-2 text-lg font-semibold text-ink">{t.name}</h3>
          <p className="mt-1 text-[13px] text-muted">
            Emne: <span className="text-ink/80">{t.subject}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {html && <CopyHtmlButton html={html} />}
          {t.editUrl && (
            <a
              href={t.editUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-btn border border-ink/15 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary/50 hover:text-mint-deep"
            >
              Åbn i Supabase →
            </a>
          )}
        </div>
      </header>

      <p className="mt-4 text-sm text-ink/75 leading-relaxed">{t.description}</p>
      <p className="mt-2 text-xs text-muted">
        <span className="font-semibold">Udløses:</span> {t.trigger}
      </p>

      {html && (
        <details className="mt-5 group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-btn border border-ink/10 bg-canvas px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary/50 hover:text-mint-deep">
            <span>Se preview</span>
            <span className="transition-transform group-open:rotate-180" aria-hidden>▾</span>
          </summary>
          <div className="mt-4 overflow-hidden rounded-lg border border-ink/10">
            <iframe
              title={`Preview: ${t.name}`}
              srcDoc={html}
              sandbox=""
              className="h-[520px] w-full bg-white"
            />
          </div>
        </details>
      )}
    </article>
  )
}

export default async function AdminEmailsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const supabaseTemplates = EMAIL_TEMPLATES.filter(t => t.owner === "supabase")
  const lektieroTemplates = EMAIL_TEMPLATES.filter(t => t.owner === "lektiero")

  return (
    <>
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">Supabase-administrerede</h2>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Vi har skrevet branded HTML til alle fire. Klik <strong>Kopier HTML</strong> og indsæt i Supabase → Auth → Email Templates. <code className="text-xs">{`{{ .ConfirmationURL }}`}</code> og lignende variabler udskiftes automatisk af Supabase ved afsendelse.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {supabaseTemplates.map(t => (
            <TemplateCard key={t.id} t={t} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">LektieRo-skabeloner</h2>
        <p className="mt-1 text-sm text-muted">
          Sendes fra vores egen kode via Resend. Preview herunder er den aktuelle HTML, ikke et live-udsendt eksempel.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {lektieroTemplates.map(t => (
            <TemplateCard key={t.id} t={t} />
          ))}
        </div>
      </section>
    </>
  )
}
