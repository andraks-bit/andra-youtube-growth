'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2 } from 'lucide-react'

interface Message {
  id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
}

const gold = '#74cfe8'
const text = '#f4f4f2'
const dim = 'rgba(244,244,242,0.40)'

export default function ChatThread({
  conversationId,
  currentUserId,
  initialMessages,
  otherPartyName,
  otherPartyAvatar,
}: {
  conversationId: string
  currentUserId: string
  initialMessages: Message[]
  otherPartyName: string
  otherPartyAvatar?: string | null
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    // Scroll only the message list to the bottom — NOT the whole page (which hid the header).
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  async function send() {
    const txt = body.trim()
    if (!txt || sending) return
    setSending(true)
    setBody('')
    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, body: txt }),
    }).catch(() => null)
    if (!res || !res.ok) { setBody(txt); setSending(false); return }
    const data = await res.json().catch(() => null)
    const msg = data?.message as Message | undefined
    if (msg) setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
    setSending(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#07101e' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#0c1828' }}>
        {otherPartyAvatar ? (
          <img src={otherPartyAvatar} alt={otherPartyName} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(116,207,232,0.30)' }} />
        ) : (
          <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '17px' }}>
            {(otherPartyName || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: text, fontSize: '15px' }}>{otherPartyName}</div>
          <div style={{ fontSize: '12px', color: dim, marginTop: '2px' }}>Discuss availability, then confirm the booking</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: '13px', color: dim, padding: '36px 0' }}>No messages yet — say hello 👋</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '76%', padding: '10px 14px', fontSize: '14px', lineHeight: 1.5,
                borderRadius: '16px',
                borderBottomRightRadius: isMe ? '4px' : '16px',
                borderBottomLeftRadius: isMe ? '16px' : '4px',
                background: isMe ? 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)' : '#0c1828',
                color: isMe ? '#07101e' : text,
                border: isMe ? 'none' : '1px solid rgba(116,207,232,0.18)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                <div>{msg.body}</div>
                <div style={{ fontSize: '11px', marginTop: '4px', color: isMe ? 'rgba(7,16,30,0.55)' : dim }}>
                  {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0c1828' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            style={{
              flex: 1, resize: 'none', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.14)',
              background: '#07101e', color: text, fontSize: '14px', padding: '11px 14px',
              minHeight: '46px', maxHeight: '120px', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={send}
            disabled={!body.trim() || sending}
            style={{
              padding: '12px', borderRadius: '12px', border: 'none',
              background: (!body.trim() || sending) ? 'rgba(116,207,232,0.30)' : 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)',
              color: '#07101e', cursor: (!body.trim() || sending) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
            aria-label="Send"
          >
            {sending ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" /> : <Send style={{ width: 18, height: 18 }} />}
          </button>
        </div>
      </div>
    </div>
  )
}
