/**
 * Remove objects from Supabase storage via POST /api/storage/remove (service role on server).
 */

export async function removeStoragePathsViaApi(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) {
    return
  }

  const response = await fetch('/api/storage/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ bucket, paths }),
  })

  const data = (await response.json().catch(() => ({}))) as { error?: string }

  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Storage remove failed')
  }
}
