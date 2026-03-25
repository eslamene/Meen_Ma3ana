/**
 * Browser upload through POST /api/upload (service role + audit on server).
 */

export interface UploadViaApiResult {
  url: string
  path: string
  bucket: string
}

export async function uploadFileViaApi(
  file: File,
  bucket: string,
  fileName: string
): Promise<UploadViaApiResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('fileName', fileName)
  formData.append('bucket', bucket)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  const data = (await response.json().catch(() => ({}))) as {
    error?: string
    url?: string
    path?: string
    fileName?: string
    bucket?: string
  }

  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : 'Upload failed'
    throw new Error(message)
  }

  const url = data.url
  const path = data.path ?? data.fileName
  const bucketOut = data.bucket ?? bucket

  if (!url || !path) {
    throw new Error('Upload response missing url or path')
  }

  return { url, path, bucket: bucketOut }
}
