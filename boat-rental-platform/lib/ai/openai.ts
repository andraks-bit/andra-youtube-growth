// OpenAI vision helper — reads screenshots/images into structured JSON.
// Used by the "Scan screenshot" importer. Needs OPENAI_API_KEY in the env.
const ENDPOINT = 'https://api.openai.com/v1/chat/completions'

export function openaiVisionAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY
}

// Send a system prompt + text + one or more images, get JSON back.
export async function aiVisionJson<T>(
  system: string,
  textPrompt: string,
  imageDataUrls: string[],
  opts?: { maxTokens?: number; model?: string },
): Promise<T> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OpenAI is not configured on this server (OPENAI_API_KEY missing).')

  const content: unknown[] = [
    { type: 'text', text: textPrompt },
    ...imageDataUrls.slice(0, 6).map((url) => ({ type: 'image_url', image_url: { url, detail: 'high' } })),
  ]

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: opts?.model ?? 'gpt-4o',
      response_format: { type: 'json_object' },
      max_tokens: opts?.maxTokens ?? 3000,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
    }),
  })

  if (!res.ok) throw new Error(`OpenAI vision error: ${(await res.text()).slice(0, 300)}`)
  const j = await res.json()
  const txt = j?.choices?.[0]?.message?.content ?? '{}'
  try { return JSON.parse(txt) as T } catch { throw new Error('OpenAI returned invalid JSON') }
}
