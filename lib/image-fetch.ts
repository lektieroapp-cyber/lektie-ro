import sharp from "sharp"
import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "homework-photos"

// Pasted screenshots / phone photos arrive as anything from a 500 KB JPEG
// to a 9 MB 4K PNG to an iPhone HEIC. Azure GPT-5/4o vision accepts JPEG /
// PNG / WebP / GIF only — HEIC is rejected — and silently fails on
// oversized payloads. Normalising the bytes through sharp before building
// the data URL collapses every input to a single compact JPEG that the
// vision model is guaranteed to ingest.
export async function fetchStorageImageAsDataUrl(path: string): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).download(path)
  if (error || !data) {
    throw new Error(`storage_download_failed: ${error?.message ?? "no data"}`)
  }
  const inputBuffer = Buffer.from(await data.arrayBuffer())
  let normalized: Buffer
  try {
    normalized = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: 2048,
        height: 2048,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer()
  } catch (err) {
    throw new Error(
      `image_normalize_failed: ${(err as Error).message} (size=${inputBuffer.length})`,
    )
  }
  return `data:image/jpeg;base64,${normalized.toString("base64")}`
}
