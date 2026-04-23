import { useEffect, useState, useRef } from 'react'
import { CATEGORY_CONFIG } from './MapComponent'
import { supabase, fetchMessages, sendMessage, deleteEvent, getProfile } from '../lib/supabase'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

function useCountdown(expiresAt) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt) - Date.now()))
  useEffect(() => {
    if (remaining <= 0) return
    const id = setInterval(() => setRemaining(Math.max(0, new Date(expiresAt) - Date.now())), 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  const s = Math.floor(remaining / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = n => String(n).padStart(2, '0')
  return {
    label: h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`,
    urgency: remaining < 15 * 60 * 1000,
    critical: remaining < 5 * 60 * 1000,
    expired: remaining <= 0,
  }
}

const CHAT_EMOJIS = [
  '😀','😂','🥰','😎','🤔','😅','🙏','👍','👎','❤️',
  '🔥','✨','🎉','💪','🤝','👋','😢','😡','🥳','😴',
  '🍕','⚽','🎮','🎵','🏃','☕','🍺','🌊','🌳','🎯',
]

function EventChat({ event, user }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const inputRef = useRef(null)
  const endRef = useRef(null)

  useEffect(() => {
    fetchMessages(event.id).then(setMessages)

    const ch = supabase.channel(`chat-${event.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, ({ new: msg }) => {
        if (msg.event_id === event.id) setMessages(prev => [...prev, msg])
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [event.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const myId = user?.id?.toString() ?? (() => {
    let id = localStorage.getItem('ryadom_uid')
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('ryadom_uid', id) }
    return id
  })()

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await sendMessage({ eventId: event.id, content: text, creatorId: myId })
      setInput('')
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const insertEmoji = (emoji) => {
    setInput(prev => (prev + emoji).slice(0, 500))
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  return (
    <div className="mb-4" onClick={() => showEmoji && setShowEmoji(false)}>
      <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block"
             style={{ color: 'var(--accent)' }}>💬 Чат события</label>

      <div className="rounded-2xl overflow-hidden"
           style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>

        {/* Messages */}
        <div className="overflow-y-auto p-3 flex flex-col gap-2" style={{ height: 200 }}>
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--hint)' }}>Напиши первым 👋</p>
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.creator_id === myId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="px-3 py-2 rounded-2xl text-sm break-words"
                     style={{
                       maxWidth: '75%',
                       background: isMe ? 'var(--accent)' : 'var(--bg-3)',
                       color: isMe ? '#111827' : 'var(--text)',
                     }}>
                  {msg.content}
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>

        {/* Emoji picker */}
        {showEmoji && (
          <div style={{ borderTop: '1px solid var(--bg-3)' }}
               onClick={e => e.stopPropagation()}>
            <Picker
              data={data}
              onEmojiSelect={em => insertEmoji(em.native)}
              theme="dark"
              locale="ru"
              previewPosition="none"
              skinTonePosition="none"
              maxFrequentRows={2}
              perLine={8}
              set="native"
              exceptEmojis={['rainbow-flag']}
            />
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-2 p-2"
              style={{ borderTop: '1px solid var(--bg-3)' }}>
          <button type="button" onClick={() => setShowEmoji(v => !v)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg transition active:scale-90"
                  style={{ background: showEmoji ? 'var(--accent)22' : 'var(--bg-3)', border: showEmoji ? '1px solid var(--accent)44' : 'none' }}>
            😊
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value.slice(0, 500))}
            onKeyDown={handleKey}
            placeholder="Написать…"
            className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background: 'var(--bg-3)', color: 'var(--text)', border: 'none' }}
          />
          <button type="submit" disabled={!input.trim() || sending}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition active:scale-90 disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: '#111827' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

export default function BottomSheet({ event, onClose, onPremium, user, authUser, onDelete }) {
  const { label, urgency, critical, expired } = useCountdown(event.expires_at)
  const cfg = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.chat
  const hasPhotos = event.photos?.length > 0
  const [lightbox, setLightbox] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [creator, setCreator] = useState(null)
  const isOwner = authUser && event.creator_id === authUser.id

  useEffect(() => {
    if (!event.creator_id) return
    getProfile(event.creator_id).then(p => setCreator(p ?? null))
  }, [event.creator_id])

  const handleDelete = async () => {
    setDeleting(true)
    try { await deleteEvent(event.id); onDelete?.() } finally { setDeleting(false) }
  }

  return (
    <>
      {/* Lightbox */}
      {lightbox !== null && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.95)' }}
             onClick={() => setLightbox(null)}>
          <img src={event.photos[lightbox]} alt=""
               className="max-w-full max-h-full object-contain"
               style={{ borderRadius: 12 }} />
          <button className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            ✕
          </button>
          {event.photos.length > 1 && (
            <div className="absolute bottom-6 flex gap-2">
              {event.photos.map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full"
                     style={{ background: i === lightbox ? '#fff' : 'rgba(255,255,255,0.4)' }} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="absolute inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col"
           style={{
             background: 'rgba(17,24,39,0.97)',
             backdropFilter: 'blur(24px)',
             border: '1px solid var(--border)',
             borderBottom: 'none',
             boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 0 40px rgba(34,211,238,0.06)',
             paddingBottom: 'env(safe-area-inset-bottom, 16px)',
             maxHeight: '88vh',
           }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-9 h-[3px] rounded-full" style={{ background: 'var(--bg-3)' }} />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 pt-1">

          {/* Creator */}
          {creator && (
            <div className="flex items-center gap-3 mb-4 rounded-2xl px-3 py-2.5"
                 style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 text-sm font-bold"
                   style={{ background: cfg.color + '33', border: `1.5px solid ${cfg.color}55` }}>
                {creator.avatar_url
                  ? <img src={creator.avatar_url} className="w-full h-full object-cover" alt="" />
                  : <span style={{ color: cfg.color }}>
                      {(creator.display_name ?? creator.username ?? '?')[0].toUpperCase()}
                    </span>
                }
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hint)' }}>Инициатор</p>
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {creator.display_name || creator.username || 'Аноним'}
                </p>
              </div>
            </div>
          )}

          {/* Category + title */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: cfg.color + '22', border: `1px solid ${cfg.color}44` }}>
              {cfg.icon}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: cfg.color }}>
                {cfg.label}
              </p>
              <h2 className="text-base font-semibold leading-tight" style={{ color: 'var(--text)' }}>
                {event.title}
              </h2>
            </div>
          </div>

          {/* Photos */}
          {hasPhotos && (
            <div className="flex gap-2 overflow-x-auto mb-4 pb-1" style={{ scrollbarWidth: 'none' }}>
              {event.photos.map((url, i) => (
                <button key={i} type="button" onClick={() => setLightbox(i)}
                        className="flex-shrink-0 rounded-2xl overflow-hidden transition active:scale-95"
                        style={{ width: 120, height: 90 }}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Timer */}
          <div className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
               style={{
                 background: urgency ? 'rgba(248,113,113,0.08)' : 'var(--bg-2)',
                 border: urgency ? '1px solid rgba(248,113,113,0.3)' : '1px solid var(--border)',
               }}>
            <span className="text-xl">{expired ? '💀' : urgency ? '🔥' : '⏱'}</span>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--hint)' }}>
                {expired ? 'Событие завершено' : 'Исчезнет через'}
              </p>
              <p className={`text-2xl font-mono font-black tabular-nums${critical ? ' animate-pulse' : ''}`}
                 style={{
                   color: urgency ? 'var(--danger)' : 'var(--accent)',
                   textShadow: urgency ? '0 0 12px rgba(248,113,113,0.5)' : '0 0 12px var(--accent-glow)',
                 }}>
                {expired ? '—' : label}
              </p>
            </div>
          </div>

          {/* Chat */}
          {event.chat_enabled && !expired && (
            <EventChat event={event} user={user} />
          )}

          {expired && event.chat_enabled && (
            <div className="rounded-2xl px-4 py-3 mb-4 text-sm text-center"
                 style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
              💬 Чат сгорел вместе с событием
            </div>
          )}

          {/* Delete own event */}
          {isOwner && !expired && (
            <button onClick={handleDelete} disabled={deleting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold mb-3 transition active:scale-95 disabled:opacity-40"
                    style={{ background: 'rgba(248,113,113,0.08)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.2)' }}>
              {deleting ? '⏳ Удаляю…' : '🗑 Удалить событие'}
            </button>
          )}

          {/* Premium */}
          <button onClick={onPremium}
                  className="w-full flex items-center justify-between rounded-2xl px-4 py-3 mb-3 transition active:scale-95"
                  style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}>
            <div>
              <p className="text-sm font-bold" style={{ color: '#c084fc' }}>⭐ Премиум-размещение</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hint)' }}>Telegram Stars или СБП</p>
            </div>
            <svg className="w-4 h-4" style={{ color: '#c084fc' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>

          {/* Close */}
          <button onClick={onClose}
                  className="w-full py-3 rounded-2xl text-sm font-semibold transition active:scale-95 mb-2"
                  style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
            Закрыть
          </button>
        </div>
      </div>
    </>
  )
}
