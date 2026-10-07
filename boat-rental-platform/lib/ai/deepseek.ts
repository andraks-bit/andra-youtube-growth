// Server-side DeepSeek chat helper — used for AI listing descriptions, website
// listing extraction, and automatic inquiry replies. Key: DEEPSEEK_API_KEY.
const ENDPOINT = 'https://api.deepseek.com/chat/completions'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export function aiAvailable() {
  return !!process.env.DEEPSEEK_API_KEY
}

export async function aiChat(
  messages: ChatMessage[],
  opts: { json?: boolean; maxTokens?: number; temperature?: number; timeoutMs?: number } = {}
): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set')
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1200,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 90000),
  })
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) throw new Error('DeepSeek returned an empty response')
  return content.trim()
}

// Ask for JSON and parse it (tolerates ```json fences).
export async function aiJson<T>(
  system: string,
  user: string,
  opts: { maxTokens?: number; timeoutMs?: number } = {}
): Promise<T> {
  const raw = await aiChat(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    { json: true, temperature: 0.2, maxTokens: opts.maxTokens ?? 2400, timeoutMs: opts.timeoutMs }
  )
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  return JSON.parse(text) as T
}
