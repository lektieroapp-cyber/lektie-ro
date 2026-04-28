/**
 * One-shot cleanup: wipe all tasks + sessions + turns for a single parent
 * (looked up by email). Children, profile row, and auth user stay intact.
 *
 *   npx tsx --env-file=.env.local scripts/wipe-task-data.ts <email>
 *
 * Without --confirm it does a dry run and prints counts.
 *   npx tsx --env-file=.env.local scripts/wipe-task-data.ts <email> --confirm
 */
import { createClient } from "@supabase/supabase-js"

const email = process.argv[2]
const confirm = process.argv.includes("--confirm")

if (!email) {
  console.error("usage: wipe-task-data <email> [--confirm]")
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  // listUsers paginates; 200 fits any small dev project. If we ever outgrow
  // that, swap to a profile-table lookup by email-mirrored column.
  const { data: users, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listErr) throw listErr
  const match = users.users.find(
    u => u.email?.toLowerCase() === email.toLowerCase(),
  )
  if (!match) {
    console.error(`no auth user with email ${email}`)
    process.exit(1)
  }
  const parentId = match.id
  console.log(`parent_id = ${parentId}  (${match.email})`)

  const [{ count: taskCount }, { count: sessionCount }] = await Promise.all([
    admin
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", parentId),
    admin
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", parentId),
  ])
  console.log(`tasks:    ${taskCount ?? 0}`)
  console.log(`sessions: ${sessionCount ?? 0}  (turns cascade)`)

  if (!confirm) {
    console.log("\nDry run — pass --confirm to actually delete.")
    return
  }

  // Delete sessions first so the FK to tasks doesn't whine (it's ON DELETE
  // SET NULL anyway, but doing sessions first is cleaner). Turns cascade.
  const { error: sessErr } = await admin
    .from("sessions")
    .delete()
    .eq("parent_id", parentId)
  if (sessErr) throw sessErr

  const { error: taskErr } = await admin
    .from("tasks")
    .delete()
    .eq("parent_id", parentId)
  if (taskErr) throw taskErr

  console.log("\nWiped. Kids, profile, and auth user untouched.")
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
