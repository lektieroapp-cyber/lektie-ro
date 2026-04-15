import { Resend } from "resend"

const apiKey = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM_EMAIL || "info@lektiero.dk"
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || ""

function getClient(): Resend | null {
  if (!apiKey) return null
  return new Resend(apiKey)
}

export async function addToAudience(email: string, meta?: { locale?: string }): Promise<void> {
  const client = getClient()
  if (!client || !AUDIENCE_ID) return
  try {
    await client.contacts.create({
      audienceId: AUDIENCE_ID,
      email,
      unsubscribed: false,
      ...(meta?.locale ? { firstName: undefined } : {}),
    })
  } catch {
    // Swallow — audience add is best-effort.
  }
}

export async function sendTransactional(to: string, subject: string, html: string): Promise<void> {
  const client = getClient()
  if (!client) return
  try {
    const result = await client.emails.send({ from: FROM, to, subject, html })
    if ("error" in result && result.error) {
      console.error("[email] send failed:", result.error)
    }
  } catch (err) {
    console.error("[email] send threw:", err)
  }
}
