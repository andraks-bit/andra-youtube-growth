import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ChatThread from '@/components/messaging/ChatThread'
import { MessageSquare } from 'lucide-react'

const gold = '#74cfe8'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const dim = 'rgba(244,244,242,0.35)'

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>
}) {
  const { conversation: conversationId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/dashboard/messages')

  const { data: conversations } = await supabase
    .from('conversations')
    .select(`id, created_at, boats(name, slug, boat_images(storage_url, is_hero))`)
    .contains('participant_ids', [user.id])
    .order('created_at', { ascending: false })

  const convIds = (conversations ?? []).map((c) => c.id)
  const { data: latestMessages } = convIds.length
    ? await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, created_at, read_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  type LatestMsg = { id: any; conversation_id: any; sender_id: any; body: any; created_at: any; read_at: any }
  const latestByConv: Record<string, LatestMsg> = {}
  for (const msg of latestMessages ?? []) {
    if (!latestByConv[msg.conversation_id]) {
      latestByConv[msg.conversation_id] = msg
    }
  }

  const activeConv = conversationId
    ? (conversations ?? []).find((c) => c.id === conversationId)
    : (conversations ?? [])[0]

  const { data: messages } = activeConv
    ? await supabase
        .from('messages')
        .select('id, sender_id, body, created_at, read_at')
        .eq('conversation_id', activeConv.id)
        .order('created_at', { ascending: true })
        .limit(100)
    : { data: [] }

  const { data: activeConvFull } = activeConv
    ? await supabase.from('conversations').select('participant_ids').eq('id', activeConv.id).single()
    : { data: null }

  const otherUserId = (activeConvFull?.participant_ids as string[] | null)?.find((id) => id !== user.id)
  const { data: otherProfile } = otherUserId
    ? await supabase.from('profiles').select('full_name, avatar_url').eq('id', otherUserId).single()
    : { data: null }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '40px 20px 80px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: text, marginBottom: '24px' }}>Messages</h1>

        {!(conversations ?? []).length ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <MessageSquare style={{ width: 48, height: 48, color: 'rgba(116,207,232,0.25)', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: text, marginBottom: '10px' }}>No messages yet</h2>
            <p style={{ fontSize: '15px', color: muted }}>Contact a host from any boat listing to start a conversation.</p>
          </div>
        ) : (
          <div className={`msgs-grid ${conversationId ? 'has-conv' : ''}`} style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', overflow: 'hidden' }}>
            {/* Conversation list — full width on mobile, hidden when a thread is open; 280px sidebar on desktop */}
            <div className="msgs-list">
              {(conversations ?? []).map((conv) => {
                const boat = conv.boats as any
                const hero = boat?.boat_images?.find((i: any) => i.is_hero) ?? boat?.boat_images?.[0]
                const latest = latestByConv[conv.id]
                const isActive = conv.id === (activeConv?.id ?? '')
                const hasUnread = latest && !latest.read_at && latest.sender_id !== user.id
                return (
                  <Link
                    key={conv.id}
                    href={`/dashboard/messages?conversation=${conv.id}`}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      textDecoration: 'none', transition: 'background 0.15s',
                      background: isActive ? 'rgba(116,207,232,0.08)' : 'transparent',
                      borderLeft: isActive ? `3px solid ${gold}` : '3px solid transparent',
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}>
                      {hero && <img src={hero.storage_url} alt={boat?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: hasUnread ? 700 : 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {boat?.name ?? 'Conversation'}
                        </span>
                        {hasUnread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: gold, flexShrink: 0 }} />}
                      </div>
                      {latest && (
                        <p style={{ fontSize: '12px', color: dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{latest.body}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Chat panel — full width on mobile (only when a thread is open), always shown on desktop */}
            <div className="msgs-thread">
              {activeConv && (
                <Link href="/dashboard/messages" className="msgs-back" style={{ alignItems: 'center', gap: '8px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#0c1828', color: gold, textDecoration: 'none', fontWeight: 600, fontSize: '14px', flexShrink: 0 }}>← All messages</Link>
              )}
              <div style={{ flex: 1, minHeight: 0 }}>
                {activeConv ? (
                  <ChatThread
                    key={activeConv.id}
                    conversationId={activeConv.id}
                    currentUserId={user.id}
                    initialMessages={(messages ?? []).map((m) => ({
                      id: m.id,
                      sender_id: m.sender_id,
                      body: m.body,
                      created_at: m.created_at,
                      read_at: m.read_at,
                    }))}
                    otherPartyName={(otherProfile as any)?.full_name ?? 'Boat owner'}
                    otherPartyAvatar={(otherProfile as any)?.avatar_url ?? null}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: dim, fontSize: '14px' }}>
                    Select a conversation
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
