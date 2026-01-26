export type UploadImageResponse = {
  bucket: string
  path: string
  url: string
  attachment_id?: string | null
}

const DEFAULT_BASE_URL = 'http://localhost:8000'

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL
}

export async function uploadImageToStorage(params: {
  file: File
  orderId?: string
  kind?: string
}): Promise<UploadImageResponse> {
  const base = getApiBaseUrl()
  const form = new FormData()
  form.append('file', params.file)
  if (params.orderId) form.append('order_id', params.orderId)
  if (params.kind) form.append('kind', params.kind)

  const res = await fetch(`${base}/api/storage/upload-image`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`업로드 실패 (${res.status}): ${text || res.statusText}`)
  }
  return (await res.json()) as UploadImageResponse
}

