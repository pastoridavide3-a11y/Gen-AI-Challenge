import { createBrowserClient } from '@supabase/ssr'

// Bucket the uploaded PDFs live in. Mirrors STORAGE_BUCKET in app/api/cvs/route.ts,
// where the files are written.
const STORAGE_BUCKET = 'cvs'

// How long a generated link stays valid. One hour comfortably covers a single
// viewing session; we mint a fresh URL on every open anyway.
const SIGNED_URL_TTL_SECONDS = 60 * 60

// Browser-side Supabase client, mirroring the server client in lib/db/client.ts
// but for use inside client components.
function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Mints a short-lived signed URL for a stored CV PDF (cvs.file_path is the
// Storage path). Async because it calls the Storage API to sign — generate it
// on demand, right before showing the file.
export async function cvSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await browserClient()
    .storage.from(STORAGE_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS)

  if (error || !data) {
    throw new Error(
      `createSignedUrl(${filePath}): ${error?.message ?? 'no URL returned'}`,
    )
  }
  return data.signedUrl
}
