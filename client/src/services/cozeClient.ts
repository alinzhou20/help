export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// API base: default to proxy '/api'. You can override by setting VITE_API_BASE (e.g. http://localhost:5174)
const RAW_BASE = (import.meta as any).env?.VITE_API_BASE as string | undefined
const BASE = RAW_BASE ? RAW_BASE.replace(/\/$/, '') : ''
const API = (path: string) => `${BASE}${path}`

export async function chatOnce(text: string, images?: string[]): Promise<string> {
  const resp = await fetch(API('/api/coze/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, images }),
  })
  if (!resp.ok) throw new Error(`chat failed: ${resp.status}`)
  const data = await resp.json()
  const answer = data?.answer?.content || data?.messages?.find((m: any) => m.role !== 'user')?.content || ''
  return String(answer ?? '')
}

export async function* chatStream(text: string, signal?: AbortSignal, images?: string[]): AsyncGenerator<string, void> {
  const resp = await fetch(API('/api/coze/chat/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, images }),
    signal,
  })
  if (!resp.ok || !resp.body) throw new Error(`stream failed: ${resp.status}`)
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 2)
      if (chunk.startsWith('data:')) {
        const json = chunk.slice(5).trim()
        try {
          const evt = JSON.parse(json)
          if (evt.type === 'delta' && evt.content) {
            yield evt.content as string
          }
          if (evt.type === 'done') return
        } catch {
          // ignore parse errors
        }
      }
    }
  }
}
