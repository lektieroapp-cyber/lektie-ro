#!/usr/bin/env node
// scripts/reset-user-tasks.mjs
//
// One-shot: wipe a user's tasks + sessions + turns. Keeps profile + children
// + subscription tier so login still works and kid profiles don't have to be
// re-entered. Storage photos auto-delete on the bucket's 24h policy so we
// don't touch the bucket.
//
// Usage:
//   node --env-file=.env.local scripts/reset-user-tasks.mjs <email>

const email = process.argv[2]
if (!email) {
  console.error("usage: node --env-file=.env.local scripts/reset-user-tasks.mjs <email>")
  process.exit(2)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(2)
}

const baseHeaders = { apikey: key, Authorization: `Bearer ${key}` }

async function findUserId(email) {
  // Auth admin list endpoint — paginate through pages until we find the email.
  // Most accounts will hit on page 1.
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: baseHeaders,
    })
    if (!res.ok) {
      throw new Error(`auth/admin/users: ${res.status} ${await res.text()}`)
    }
    const body = await res.json()
    const users = Array.isArray(body) ? body : body.users
    if (!users || users.length === 0) break
    const match = users.find(u => (u.email || "").toLowerCase() === email.toLowerCase())
    if (match) return match.id
    if (users.length < 200) break
  }
  return null
}

async function countRows(table, parentId) {
  const res = await fetch(
    `${url}/rest/v1/${table}?parent_id=eq.${parentId}&select=id`,
    {
      headers: { ...baseHeaders, Prefer: "count=exact" },
      method: "HEAD",
    },
  )
  // PostgREST returns range like "0-0/N" or "*/N"
  const range = res.headers.get("content-range") ?? ""
  const total = range.split("/").pop()
  return total ? parseInt(total, 10) || 0 : 0
}

async function deleteRows(table, parentId) {
  const res = await fetch(
    `${url}/rest/v1/${table}?parent_id=eq.${parentId}`,
    {
      method: "DELETE",
      headers: { ...baseHeaders, Prefer: "return=minimal" },
    },
  )
  if (!res.ok && res.status !== 204) {
    throw new Error(`delete ${table}: ${res.status} ${await res.text()}`)
  }
}

async function main() {
  const userId = await findUserId(email)
  if (!userId) {
    console.error(`user not found: ${email}`)
    process.exit(1)
  }
  console.log(`user: ${email} → ${userId}`)

  const tasksBefore = await countRows("tasks", userId)
  const sessionsBefore = await countRows("sessions", userId)
  console.log(`before: ${tasksBefore} tasks, ${sessionsBefore} sessions`)

  if (tasksBefore === 0 && sessionsBefore === 0) {
    console.log("nothing to delete.")
    return
  }

  // Order matters mildly: tasks first sets sessions.task_id to null via the
  // ON DELETE SET NULL FK. Sessions next removes turns via cascade.
  await deleteRows("tasks", userId)
  await deleteRows("sessions", userId)

  const tasksAfter = await countRows("tasks", userId)
  const sessionsAfter = await countRows("sessions", userId)
  console.log(`after:  ${tasksAfter} tasks, ${sessionsAfter} sessions`)
  console.log("done.")
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
