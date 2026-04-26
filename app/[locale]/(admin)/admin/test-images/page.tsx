import { notFound } from "next/navigation"
import { TestImagesGrid, type TestImageRow } from "@/components/admin/TestImagesGrid"
import { isLocale } from "@/lib/i18n/config"
import { createAdminClient } from "@/lib/supabase/admin"

// Admin-only: list the last ~30 homework photos submitted so we can kick off
// a new session against an existing image instead of re-taking the photo on
// the phone every time while iterating on the AI flow.
//
// The `homework-photos` bucket has a 24h auto-delete policy (privacy), so
// anything older than a day won't resolve — handled as a graceful dead tile.

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "homework-photos"
const SIGNED_URL_TTL_SECONDS = 60 * 30 // 30 min — long enough to click + reload

export default async function AdminTestImagesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const admin = createAdminClient()

  // Pull recent sessions that actually have an image. Join child name/grade
  // + parent email inline so the page is one query each.
  const { data: sessions } = await admin
    .from("sessions")
    .select(
      "id, image_path, subject, grade, problem_text, problem_type, created_at, parent_id, child_id"
    )
    .not("image_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(30)

  const rows: TestImageRow[] = []
  if (sessions && sessions.length > 0) {
    const childIds = [...new Set(sessions.map(s => s.child_id).filter(Boolean))] as string[]
    const parentIds = [...new Set(sessions.map(s => s.parent_id).filter(Boolean))] as string[]

    const [{ data: children }, usersResult] = await Promise.all([
      admin.from("children").select("id, name, grade").in("id", childIds),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ])
    const childMap = new Map((children ?? []).map(c => [c.id, c]))
    const parentMap = new Map(
      (usersResult.data?.users ?? [])
        .filter(u => parentIds.includes(u.id))
        .map(u => [u.id, u.email ?? "-"])
    )

    // Sign URLs for thumbnails. createSignedUrls batches in one call and
    // returns a per-path error when the underlying object is missing. We
    // surface that error verbatim to the admin so we can tell "bucket auto-
    // delete kicked in" apart from "upload never landed" apart from "RLS
    // blocked read".
    const paths = sessions.map(s => s.image_path!).filter(Boolean)
    const { data: signed, error: batchErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    if (batchErr) {
      console.warn("[test-images] signed-urls batch error:", batchErr.message)
    }
    const signedMap = new Map<
      string,
      { url: string | null; errorMsg: string | null }
    >()
    for (const s of signed ?? []) {
      const p = s.path ?? ""
      if (!p) continue
      signedMap.set(p, {
        url: s.signedUrl || null,
        errorMsg: s.error || null,
      })
    }

    for (const s of sessions) {
      const child = s.child_id ? childMap.get(s.child_id) : null
      const signedInfo = signedMap.get(s.image_path as string) ?? {
        url: null,
        errorMsg: "signed URL not returned",
      }
      rows.push({
        sessionId: s.id,
        imagePath: s.image_path as string,
        signedUrl: signedInfo.url,
        signedUrlError: signedInfo.errorMsg,
        subject: s.subject ?? null,
        grade: s.grade ?? child?.grade ?? null,
        problemText: s.problem_text ?? null,
        problemType: s.problem_type ?? null,
        childName: child?.name ?? null,
        parentEmail: s.parent_id ? parentMap.get(s.parent_id) ?? null : null,
        createdAt: s.created_at,
      })
    }
  }

  return (
    <section className="mt-10">
      <div className="mb-6">
        <h2
          className="text-2xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          Test-billeder
        </h2>
        <p className="mt-1 text-sm text-muted">
          Seneste {rows.length || 0} billeder fra rigtige sessioner. Klik et for at
          starte et nyt flow uden at skulle uploade igen. Bucket auto-sletter efter
          24 timer. Gråtonede felter er udløbet.
        </p>
      </div>
      <TestImagesGrid rows={rows} locale={locale} />
    </section>
  )
}
