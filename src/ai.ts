// ─── Integração com a API da Anthropic (Claude) ───────────────────────────
// A chave fica salva apenas no dispositivo (localStorage).

const KEY = 'mysocial-anthropic-key'

export const getApiKey = () => localStorage.getItem(KEY) ?? ''
export const setApiKey = (k: string) => localStorage.setItem(KEY, k.trim())

export type AiContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    >

export interface AiMessage {
  role: 'user' | 'assistant'
  content: AiContent
}

export function dataUrlToImageBlock(dataUrl: string) {
  const [head, data] = dataUrl.split(',')
  const media = head.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
  return { type: 'image' as const, source: { type: 'base64' as const, media_type: media, data } }
}

export async function callClaude(opts: {
  system: string
  messages: AiMessage[]
  webSearch?: boolean
  maxTokens?: number
}): Promise<string> {
  const key = getApiKey()
  if (!key) throw new Error('Configure sua chave da API Anthropic primeiro.')

  const body: Record<string, unknown> = {
    model: 'claude-sonnet-5',
    max_tokens: opts.maxTokens ?? 4000,
    system: opts.system,
    messages: opts.messages,
  }
  if (opts.webSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }]
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro da API (${res.status}): ${err.slice(0, 300)}`)
  }
  const json = await res.json()
  return (json.content as Array<{ type: string; text?: string }>)
    .filter(b => b.type === 'text' && b.text)
    .map(b => b.text)
    .join('\n')
}

// Extrai o primeiro JSON válido de uma resposta (com ou sem cerca de código).
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidates = [fenced?.[1], text]
  for (const c of candidates) {
    if (!c) continue
    const start = Math.min(
      ...['[', '{'].map(ch => {
        const i = c.indexOf(ch)
        return i === -1 ? Infinity : i
      }),
    )
    if (start === Infinity) continue
    for (let end = c.length; end > start; end--) {
      try {
        return JSON.parse(c.slice(start, end)) as T
      } catch {
        // tenta um recorte menor
      }
    }
  }
  throw new Error('Não consegui interpretar a resposta da IA. Tente novamente.')
}
