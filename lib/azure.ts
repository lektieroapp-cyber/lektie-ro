import OpenAI from "openai"

// Azure OpenAI client using the v1 (OpenAI-compatible) endpoint.
// Supports both classic Azure OpenAI and Foundry project endpoints:
//   https://<resource>.openai.azure.com/openai/v1
//   https://<resource>.services.ai.azure.com/api/projects/<project>/openai/v1
// GDPR: deployment MUST be Data Zone Standard in Sweden Central.

let cachedClient: OpenAI | null = null

function normaliseEndpoint(raw: string): string {
  // Strip trailing slash so the SDK can append paths cleanly.
  let url = raw.trim().replace(/\/+$/, "")
  // If someone pasted the full responses URL, chop the endpoint suffix.
  url = url.replace(/\/(responses|chat\/completions)$/i, "")
  // Ensure /openai/v1 is present — we don't silently rewrite, but we do warn.
  if (!/\/openai\/v1$/i.test(url)) {
    console.warn(
      "[azure] AZURE_OPENAI_ENDPOINT does not end in /openai/v1:",
      url,
    )
  }
  return url
}

export function getAzure(): OpenAI {
  if (cachedClient) return cachedClient
  const raw = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_KEY
  if (!raw || !apiKey) {
    throw new Error("AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_KEY not set")
  }
  cachedClient = new OpenAI({
    baseURL: normaliseEndpoint(raw),
    apiKey,
    // The v1 endpoint accepts both `Authorization: Bearer` and `api-key`.
    // We send both so classic + Foundry endpoints both work without drama.
    defaultHeaders: { "api-key": apiKey },
  })
  return cachedClient
}

export function getDeployment(): string {
  return (
    process.env.AZURE_OPENAI_DEPLOYMENT ||
    process.env.AZURE_OPENAI_MINI_DEPLOYMENT ||
    "gpt-5-mini"
  )
}

export function isAzureConfigured(): boolean {
  return Boolean(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_KEY)
}
