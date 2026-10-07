// Automatic inquiry replies: when a guest messages a host, answer instantly on the
// host's behalf using ONLY the listing's facts. Clearly marked as automatic, capped
// per conversation, and silent whenever the host is actively chatting.
import { createClient } from '@supabase/supabase-js'
import { aiAvailable, aiChat, type ChatMessage } from '@/lib/ai/deepseek'
import { sendNewMessageAlert } from '@/lib/email/bookings'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const AUTO_PREFIX = '🤖 Auto-reply · '
const MAX_AUTO_REPLIES = 5
const HOST_ACTIVE_WINDOW_MS = 30 * 60 * 1000

export async function maybeAutoReply(conversationId: string, senderId: string): Promise<void> {
  if (!aiAvailable()) return

  const { data: conv } = await admin.from('conversations').select('boat_id, participant_ids').eq('id', conversationId).single()
  const boatId = (conv as { boat_id: string | null } | null)?.boat_id
  const parts = ((conv as { participant_ids: string[] | null } | null)?.participant_ids) ?? []
  if (!boatId) return

  const { data: boatRaw } = await admin
    .from('boats')
    .select('id, host_id, name, type, capacity_pax, length_m, cabins, builder, model_year, departure_port, description, tagline, includes_skipper, includes_fuel, includes_drinks, min_hours, cancellation_policy, status, boat_pricing(duration_hours, price, currency), boat_features(feature), locations(city, country)')
    .eq('id', boatId)
    .single()
  const boat = boatRaw as any
  if (!boat || boat.host_id === senderId) return // never reply to the host's own messages

  // Host opt-out (profiles.auto_reply_enabled). If the column doesn't exist yet
  // (migration not applied), treat auto-replies as enabled.
  let hostName = 'the host'
  try {
    const { data: prof, error } = await admin.from('profiles').select('full_name, auto_reply_enabled').eq('id', boat.host_id).single()
    if (!error && prof) {
      hostName = (prof as any).full_name?.split(' ')[0] || 'the host'
      if ((prof as any).auto_reply_enabled === false) return
    }
  } catch { /* enabled by default */ }
  if (hostName === 'the host') {
    const { data: p2 } = await admin.from('profiles').select('full_name').eq('id', boat.host_id).single()
    hostName = (p2 as any)?.full_name?.split(' ')[0] || 'the host'
  }

  const { data: msgsRaw } = await admin
    .from('messages')
    .select('sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(12)
  const history = ((msgsRaw as { sender_id: string; body: string; created_at: string }[] | null) ?? []).reverse()
  if (history.length === 0) return

  const last = history[history.length - 1]
  if (last.sender_id === boat.host_id) return // someone replied in the meantime

  const isAuto = (b: string) => b.startsWith(AUTO_PREFIX) || b.startsWith('Auto-reply')
  const autoCount = history.filter((m) => m.sender_id === boat.host_id && isAuto(m.body)).length
  if (autoCount >= MAX_AUTO_REPLIES) return
  const hostActive = history.some(
    (m) => m.sender_id === boat.host_id && !isAuto(m.body) && Date.now() - new Date(m.created_at).getTime() < HOST_ACTIVE_WINDOW_MS
  )
  if (hostActive) return // the host is mid-conversation — stay out of the way

  const loc = boat.locations
  const facts: string[] = [
    `Boat: ${boat.name}${boat.tagline ? ` — ${boat.tagline}` : ''}`,
    `Type: ${String(boat.type).replace(/_/g, ' ')}`,
    `Max guests: ${boat.capacity_pax}`,
  ]
  if (boat.length_m) facts.push(`Length: ${boat.length_m} m`)
  if (boat.cabins) facts.push(`Cabins: ${boat.cabins}`)
  if (boat.builder) facts.push(`Builder: ${boat.builder}${boat.model_year ? ` (${boat.model_year})` : ''}`)
  if (boat.departure_port) facts.push(`Departure: ${boat.departure_port}`)
  if (loc?.city) facts.push(`Location: ${loc.city}, ${loc.country}`)
  facts.push(`Skipper included: ${boat.includes_skipper ? 'yes' : 'no'}`)
  facts.push(`Fuel included: ${boat.includes_fuel ? 'yes' : 'no'}`)
  facts.push(`Drinks included: ${boat.includes_drinks ? 'yes' : 'no'}`)
  if (boat.min_hours) facts.push(`Minimum charter: ${boat.min_hours}h`)
  facts.push(`Cancellation policy: ${boat.cancellation_policy}`)
  const pricing = (boat.boat_pricing ?? []) as { duration_hours: number | null; price: number; currency: string }[]
  if (pricing.length) {
    facts.push(`Listed prices: ${pricing.filter((p) => p.duration_hours).map((p) => `${p.duration_hours}h = ${p.price} ${p.currency}`).join(', ')}`)
  }
  const features = ((boat.boat_features ?? []) as { feature: string }[]).map((f) => f.feature).filter((f) => !f.startsWith('__'))
  if (features.length) facts.push(`Features: ${features.slice(0, 15).join(', ')}`)
  if (boat.description) facts.push(`Listing description: ${String(boat.description).slice(0, 1500)}`)

  const system = `You are the automatic assistant answering guests on behalf of ${hostName}, the host of a boat listed on BoatHire24. A guest has sent a message about the boat below.

Reply in the guest's language. Warm, helpful and brief: max 110 words. British English when replying in English. No em-dashes, no exclamation marks, no sign-off name.

Use ONLY these listing facts — never invent prices, availability, discounts or extras:
${facts.join('\n')}

If the guest asks something the facts do not answer (specific dates, discounts, custom routes, transfers), say you have passed it on and ${hostName} will confirm personally shortly. To book, they can use the Book button on the listing page. Do not promise anything on ${hostName}'s behalf beyond the listed facts.`

  const chat: ChatMessage[] = history.slice(-8).map((m) => ({
    role: m.sender_id === boat.host_id ? ('assistant' as const) : ('user' as const),
    content: m.body.replace(AUTO_PREFIX, '').slice(0, 1000),
  }))

  let reply: string
  try {
    reply = await aiChat([{ role: 'system', content: system }, ...chat], { maxTokens: 320, temperature: 0.5, timeoutMs: 45000 })
  } catch (e) {
    console.error('autoreply generation failed:', e)
    return
  }
  const body = (AUTO_PREFIX + reply.replace(/\s+/g, ' ').trim()).slice(0, 1500)

  const { error: insErr } = await admin.from('messages').insert({
    conversation_id: conversationId,
    sender_id: boat.host_id,
    body,
  })
  if (insErr) { console.error('autoreply insert failed:', insErr); return }

  // The guest gets the same email/WhatsApp alert as for any host reply.
  sendNewMessageAlert(conversationId, boat.host_id, body, boatId, parts).catch(() => {})
}
