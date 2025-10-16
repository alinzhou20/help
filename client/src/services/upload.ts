const RAW_BASE = (import.meta as any).env?.VITE_API_BASE as string | undefined
const BASE = RAW_BASE ? RAW_BASE.replace(/\/$/, '') : ''
const API = (path: string) => `${BASE}${path}`

export async function uploadFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const resp = await fetch(API('/api/upload'), { method: 'POST', body: form })
  if (!resp.ok) throw new Error(`upload failed: ${resp.status}`)
  const data = await resp.json()
  return String(data?.url || '')
}
