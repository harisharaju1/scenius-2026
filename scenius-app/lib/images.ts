/**
 * Extracts storage object paths from Markdown image syntax `![alt](url)`.
 * Only URLs that begin with `publicUrlBase` (the post-images bucket URL) are returned;
 * external image URLs are ignored.
 *
 * Pure — no I/O, no Supabase imports. Tested in tests/unit/images.test.ts.
 */
export function extractStoragePaths(body: string, publicUrlBase: string): string[] {
  if (!body) return []
  const base = publicUrlBase.endsWith('/') ? publicUrlBase : `${publicUrlBase}/`
  const re = /!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g
  const paths: string[] = []
  let match
  while ((match = re.exec(body)) !== null) {
    const url = match[1]
    if (url.startsWith(base)) {
      paths.push(url.slice(base.length))
    }
  }
  return paths
}
