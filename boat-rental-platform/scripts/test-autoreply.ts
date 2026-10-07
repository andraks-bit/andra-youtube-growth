// Exercises the real maybeAutoReply() against a live conversation.
// Usage: npx tsx scripts/test-autoreply.ts <conversationId> <guestSenderId>
import { readFileSync } from 'node:fs'
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
// Node 20 lacks a global WebSocket that supabase-js's realtime client wants at
// construction. The admin client never opens a channel, so a stub is enough.
;(globalThis as unknown as { WebSocket?: unknown }).WebSocket ||= class { close() {} addEventListener() {} removeEventListener() {} send() {} } as unknown
;(async () => {
  const [conv, guest] = process.argv.slice(2)
  if (!conv || !guest) { console.error('need <conv> <guest>'); process.exit(1) }
  const { maybeAutoReply } = await import('../lib/ai/autoreply')
  console.log('running maybeAutoReply…')
  const t = Date.now()
  await maybeAutoReply(conv, guest)
  console.log(`done in ${((Date.now() - t) / 1000).toFixed(1)}s`)
})().catch((e) => { console.error('ERROR:', e); process.exit(1) })
