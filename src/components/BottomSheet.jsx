import { useEffect, useState, useRef } from 'react'
import { CATEGORY_CONFIG } from './MapComponent'
import { supabase, fetchMessages, sendMessage, deleteEvent, updateEvent, getProfile, fetchReactions, toggleReaction, submitReport } from '../lib/supabase'
import { tryUnlock, incrementMessageCount } from '../utils/achievements'
import CreatorSheet from './CreatorSheet'
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

function EventChat({ event, user, authUser }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [expanded, setExpanded] = useState(false)
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
    if (expanded) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, expanded])

  const myId = authUser?.id?.toString() ?? user?.id?.toString() ?? null

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await sendMessage({ eventId: event.id, content: text, creatorId: myId })
      setMessages(prev => [...prev, {
        id: `tmp-${Date.now()}`,
        event_id: event.id,
        content: text,
        creator_id: myId,
        created_at: new Date().toISOString(),
      }])
      setInput('')
      const msgCount = incrementMessageCount()
      if (msgCount >= 20) tryUnlock('soul')
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

  const lastMsg = messages[messages.length - 1]

  return (
    <div className="mb-4" onClick={() => showEmoji && setShowEmoji(false)}>

      {/* Collapsed: tap to expand */}
      {!expanded ? (
        <button type="button" onClick={() => setExpanded(true)}
                className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 transition active:scale-95"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <span className="text-xl flex-shrink-0">💬</span>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--accent)' }}>
              Чат события · {messages.length}
            </p>
            <p className="text-sm truncate" style={{ color: lastMsg ? 'var(--text)' : 'var(--hint)' }}>
              {lastMsg ? lastMsg.content : 'Напиши первым 👋'}
            </p>
          </div>
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--hint)' }}>▲ открыть</span>
        </button>
      ) : (

      <div className="rounded-2xl overflow-hidden"
           style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>

        {/* Header with collapse button */}
        <button type="button" onClick={() => setExpanded(false)}
                className="w-full flex items-center justify-between px-3 py-2.5 transition active:opacity-70"
                style={{ borderBottom: '1px solid var(--bg-3)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
            💬 Чат события · {messages.length}
          </span>
          <span className="text-xs" style={{ color: 'var(--hint)' }}>▼ свернуть</span>
        </button>

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
        {!myId ? (
          <div className="p-3 text-center text-xs" style={{ borderTop: '1px solid var(--bg-3)', color: 'var(--hint)' }}>
            🔒 Войдите в аккаунт чтобы написать
          </div>
        ) : (
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
        )}
      </div>
      )}
    </div>
  )
}

export default function BottomSheet({ event, onClose, onPremium, user, authUser, onDelete }) {
  const { label, urgency, critical, expired } = useCountdown(event.expires_at)
  const cfg = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.chat
  const hasPhotos = event.photos?.length > 0
  const [lightbox, setLightbox]       = useState(null)
  const [deleting, setDeleting]       = useState(false)
  const [confirmDelete, setConfirm]   = useState(false)
  const [reactions, setReactions]     = useState([])
  const [showReport, setShowReport]   = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSent, setReportSent]   = useState(false)

  const myId = authUser?.id?.toString() ?? null

  useEffect(() => {
    fetchReactions(event.id).then(setReactions)
  }, [event.id])

  const handleReact = async (type) => {
    if (!myId) return
    const counts = { ...reactionCounts }
    const hadIt = reactions.some(r => r.user_id === myId && r.type === type)
    if (hadIt) {
      setReactions(prev => prev.filter(r => !(r.user_id === myId && r.type === type)))
    } else {
      setReactions(prev => [...prev, { user_id: myId, type }])
    }
    await toggleReaction(event.id, myId, type)
  }

  const handleReport = async () => {
    if (!reportReason.trim()) return
    const rid = myId ?? 'anonymous'
    await submitReport(event.id, rid, reportReason)
    setReportSent(true)
  }

  const reactionCounts = ['👍','🔥','❤️'].reduce((acc, t) => {
    acc[t] = reactions.filter(r => r.type === t).length
    return acc
  }, {})
  const [creator, setCreator]         = useState(null)
  const [showCreator, setShowCreator] = useState(false)
  const [showYaMode, setShowYaMode]   = useState(false)
  const [address, setAddress]         = useState('')

  useEffect(() => {
    if (!event.lat || !event.lon) return
    if (!window.ymaps) return
    window.ymaps.ready(() => {
      window.ymaps.geocode([event.lat, event.lon], { results: 1 }).then(res => {
        const obj = res.geoObjects.get(0)
        if (obj) setAddress(obj.getAddressLine())
      }).catch(() => {})
    })
  }, [event.lat, event.lon])

  const openYandex = (mode) => {
    const schemes = { auto: 'yandexnavi', pd: 'yandexmaps', mt: 'yandexmaps' }
    const rtt = { auto: 'auto', pd: 'pd', mt: 'mt' }
    window.location.href = `${schemes[mode]}://maps.yandex.ru/?rtext=~${event.lat},${event.lon}&rtt=${rtt[mode]}`
    setTimeout(() => {
      window.open(`https://yandex.ru/maps/?rtext=~${event.lat},${event.lon}&rtt=${rtt[mode]}`, '_blank')
    }, 1500)
    setShowYaMode(false)
  }
  const [editing, setEditing]         = useState(false)
  const [editTitle, setEditTitle]     = useState(event.title)
  const [editAddress, setEditAddress] = useState('')
  const [addrSuggestions, setAddrSuggestions] = useState([])
  const [showAddrSug, setShowAddrSug] = useState(false)
  const [geocoding, setGeocoding]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const addrDebounce                  = useRef(null)
  const isOwner = authUser && event.creator_id === authUser.id

  useEffect(() => {
    if (!event.creator_id) return
    getProfile(event.creator_id).then(p => setCreator(p ?? null))
  }, [event.creator_id])

  const handleDelete = async () => {
    setDeleting(true)
    try { await deleteEvent(event.id); onDelete?.() } finally { setDeleting(false) }
  }

  const handleAddrChange = (val) => {
    setEditAddress(val)
    clearTimeout(addrDebounce.current)
    if (!val.trim() || val.length < 2) { setShowAddrSug(false); return }
    addrDebounce.current = setTimeout(() => {
      if (!window.ymaps) return
      window.ymaps.geocode(val, { results: 5, kind: 'house' })
        .then(res => {
          const list = []
          res.geoObjects.each(obj => {
            const a = obj.getAddressLine?.()
            if (a && !list.includes(a)) list.push(a)
          })
          setAddrSuggestions(list)
          setShowAddrSug(list.length > 0)
        }).catch(() => {})
    }, 400)
  }

  const handleAddrPick = (s) => {
    setEditAddress(s)
    setAddrSuggestions([])
    setShowAddrSug(false)
  }

  const handleSaveEdit = async () => {
    const title = editTitle.trim()
    if (!title || saving) return
    setSaving(true)
    try {
      const updates = { title }
      if (editAddress.trim()) {
        setGeocoding(true)
        await new Promise((resolve) => {
          window.ymaps.ready(() => {
            window.ymaps.geocode(editAddress.trim(), { results: 1 }).then(res => {
              const obj = res.geoObjects.get(0)
              if (obj) {
                const [lat, lon] = obj.geometry.getCoordinates()
                updates.lat = lat
                updates.lon = lon
                event.lat = lat
                event.lon = lon
                setAddress(obj.getAddressLine())
              }
              setGeocoding(false)
              resolve()
            }).catch(() => { setGeocoding(false); resolve() })
          })
        })
      }
      await updateEvent(event.id, updates)
      event.title = title
      setEditAddress('')
      setEditing(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
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
            <button type="button" onClick={() => setShowCreator(true)}
                    className="w-full flex items-center gap-3 mb-4 rounded-2xl px-3 py-2.5 transition active:scale-95"
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
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hint)' }}>Инициатор</p>
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {creator.display_name || creator.username || 'Аноним'}
                </p>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--hint)' }}>★ профиль →</span>
            </button>
          )}

          {showCreator && creator && (
            <CreatorSheet
              creator={creator}
              event={event}
              authUser={authUser}
              onClose={() => setShowCreator(false)}
            />
          )}

          {/* Business badge */}
          {event.creator_is_business && (
            <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-xl self-start"
                 style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.35)' }}>
              <span style={{ fontSize: 13 }}>⭐</span>
              <span className="text-xs font-bold" style={{ color: '#FFD700' }}>Партнёр RYADOM</span>
            </div>
          )}

          {/* Category + title */}
          <div className="mb-4">
            {/* Категория */}
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: (event.creator_is_business ? '#FFD700' : cfg.color) + '22', border: `1px solid ${(event.creator_is_business ? '#FFD700' : cfg.color)}44` }}>
                {cfg.icon}
              </span>
              <p className="text-xs font-bold uppercase tracking-wider flex-1" style={{ color: event.creator_is_business ? '#FFD700' : cfg.color }}>
                {cfg.label}
              </p>
              {isOwner && !expired && !editing && (
                <button onClick={() => setEditing(true)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition active:scale-90"
                        style={{ background: 'var(--bg-2)', border: '1px solid var(--bg-3)', color: 'var(--hint)', fontSize: 13 }}>
                  ✏️
                </button>
              )}
            </div>
            {/* Название в рамке */}
            <div className="rounded-2xl px-4 py-3"
                 style={{ background: 'var(--bg-2)', border: `1px solid ${event.creator_is_business ? 'rgba(255,215,0,0.25)' : cfg.color + '33'}` }}>
              {editing ? (
                <div>
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value.slice(0, 200))}
                    autoFocus
                    placeholder="Название события"
                    className="w-full rounded-xl px-2 py-1 text-base font-bold outline-none mb-2"
                    style={{ background: 'var(--bg-3)', color: 'var(--text)', border: `1px solid ${cfg.color}66` }}
                  />
                  <div className="relative mb-2">
                    <input
                      value={editAddress}
                      onChange={e => handleAddrChange(e.target.value)}
                      placeholder={`Новый адрес (сейчас: ${address || '...'})`}
                      className="w-full rounded-xl px-2 py-1 text-sm outline-none"
                      style={{ background: 'var(--bg-3)', color: 'var(--text)', border: `1px solid ${showAddrSug ? cfg.color + '66' : 'var(--bg-3)'}` }}
                      onFocus={() => addrSuggestions.length > 0 && setShowAddrSug(true)}
                    />
                    {showAddrSug && addrSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 rounded-xl overflow-hidden mt-1"
                           style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                        {addrSuggestions.map((s, i) => (
                          <button key={i} type="button" onMouseDown={() => handleAddrPick(s)}
                                  className="w-full text-left px-3 py-2 text-xs transition active:opacity-70"
                                  style={{ color: 'var(--text)', borderBottom: i < addrSuggestions.length - 1 ? '1px solid var(--bg-3)' : 'none' }}>
                            📍 {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(false); setEditTitle(event.title); setEditAddress('') }}
                            className="flex-1 py-1.5 rounded-lg text-xs transition active:scale-90"
                            style={{ background: 'var(--bg-3)', color: 'var(--hint)' }}>
                      Отмена
                    </button>
                    <button onClick={handleSaveEdit} disabled={!editTitle.trim() || saving || geocoding}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition active:scale-90 disabled:opacity-40"
                            style={{ background: cfg.color, color: '#111827' }}>
                      {geocoding ? '📍...' : saving ? '⏳' : 'Сохранить'}
                    </button>
                  </div>
                </div>
              ) : (
                <h2 className="text-base font-bold leading-snug" style={{ color: 'var(--text)', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {event.title}
                </h2>
              )}
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

          {/* Video */}
          {event.video_url && (
            <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <video src={event.video_url} controls className="w-full" style={{ maxHeight: 220, background: '#000' }} />
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

          {/* Добраться */}
          {!expired && (
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--hint)' }}>
                🧭 Добраться
              </p>
              {address ? (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl"
                     style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 14 }}>📍</span>
                  <p className="text-xs leading-snug" style={{ color: 'var(--text)' }}>{address}</p>
                </div>
              ) : (
                <div className="h-7 mb-2 rounded-xl animate-pulse" style={{ background: 'var(--bg-2)' }} />
              )}
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1.5">
                  {!showYaMode ? (
                    <button onClick={() => setShowYaMode(true)}
                            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                            style={{ background: 'rgba(252,211,77,0.15)', border: '1px solid rgba(252,211,77,0.4)', color: '#fcd34d' }}>
                      🚕 Яндекс
                    </button>
                  ) : (
                    <div className="flex gap-1.5">
                      <button onClick={() => openYandex('auto')}
                              className="flex-1 flex flex-col items-center py-2 rounded-xl text-xs font-bold transition active:scale-95"
                              style={{ background: 'rgba(252,211,77,0.2)', border: '1px solid rgba(252,211,77,0.5)', color: '#fcd34d' }}>
                        <span>🚗</span><span>Авто</span>
                      </button>
                      <button onClick={() => openYandex('pd')}
                              className="flex-1 flex flex-col items-center py-2 rounded-xl text-xs font-bold transition active:scale-95"
                              style={{ background: 'rgba(252,211,77,0.2)', border: '1px solid rgba(252,211,77,0.5)', color: '#fcd34d' }}>
                        <span>🚶</span><span>Пешком</span>
                      </button>
                      <button onClick={() => openYandex('mt')}
                              className="flex-1 flex flex-col items-center py-2 rounded-xl text-xs font-bold transition active:scale-95"
                              style={{ background: 'rgba(252,211,77,0.2)', border: '1px solid rgba(252,211,77,0.5)', color: '#fcd34d' }}>
                        <span>🚌</span><span>Транспорт</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chat */}
          {event.chat_enabled && !expired && (
            authUser?.is_banned || user?.is_banned ? (
              <div className="rounded-2xl px-4 py-3 mb-4 text-sm text-center"
                   style={{ background: 'rgba(248,113,113,0.08)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.2)' }}>
                🚫 Ваш аккаунт заблокирован
              </div>
            ) : (
              <EventChat event={event} user={user} authUser={authUser} />
            )
          )}

          {expired && event.chat_enabled && (
            <div className="rounded-2xl px-4 py-3 mb-4 text-sm text-center"
                 style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
              💬 Чат сгорел вместе с событием
            </div>
          )}

          {/* Реакции */}
          <div className="flex gap-2 mb-4">
            {['👍','🔥','❤️'].map(type => {
              const count = reactionCounts[type] ?? 0
              const active = reactions.some(r => r.user_id === myId && r.type === type)
              return (
                <button key={type} onClick={() => handleReact(type)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl transition active:scale-95 flex-1 justify-center"
                        style={{
                          background: active ? cfg.color + '22' : 'var(--bg-2)',
                          border: `1px solid ${active ? cfg.color + '66' : 'var(--border)'}`,
                        }}>
                  <span style={{ fontSize: 18 }}>{type}</span>
                  {count > 0 && <span className="text-xs font-bold" style={{ color: active ? cfg.color : 'var(--hint)' }}>{count}</span>}
                </button>
              )
            })}
          </div>

          {/* Поделиться + Пожаловаться */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => {
                      const url = `${window.location.origin}${window.location.pathname}?event=${event.id}`
                      if (navigator.share) {
                        navigator.share({ title: event.title, text: `Событие рядом: ${event.title}`, url })
                      } else {
                        navigator.clipboard.writeText(url)
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold transition active:scale-95"
                    style={{ background: 'var(--bg-2)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
              🔗 Поделиться
            </button>
            {!isOwner && (
              <button onClick={() => setShowReport(v => !v)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold transition active:scale-95"
                      style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--border)' }}>
                🚩 Пожаловаться
              </button>
            )}
          </div>

          {/* Форма жалобы */}
          {showReport && !isOwner && (
            <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg-2)', border: '1px solid rgba(248,113,113,0.3)' }}>
              {reportSent ? (
                <p className="text-sm text-center" style={{ color: 'var(--success)' }}>✅ Жалоба отправлена, разберёмся!</p>
              ) : (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--danger)' }}>Причина жалобы</p>
                  <div className="flex flex-col gap-2 mb-3">
                    {['Спам', 'Неуместный контент', 'Ложная информация', 'Другое'].map(r => (
                      <button key={r} onClick={() => setReportReason(r)}
                              className="py-2 px-3 rounded-xl text-sm text-left transition active:scale-95"
                              style={{
                                background: reportReason === r ? 'rgba(248,113,113,0.15)' : 'var(--bg-3)',
                                border: `1px solid ${reportReason === r ? 'rgba(248,113,113,0.4)' : 'transparent'}`,
                                color: reportReason === r ? 'var(--danger)' : 'var(--text)',
                              }}>
                        {reportReason === r ? '✓ ' : ''}{r}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleReport} disabled={!reportReason}
                          className="w-full py-2.5 rounded-xl text-sm font-bold transition active:scale-95 disabled:opacity-40"
                          style={{ background: 'var(--danger)', color: '#fff' }}>
                    Отправить жалобу
                  </button>
                </>
              )}
            </div>
          )}

          {/* Premium */}
          <div className="w-full flex items-center justify-between rounded-2xl px-4 py-3 mb-3"
               style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)', opacity: 0.6 }}>
            <div>
              <p className="text-sm font-bold" style={{ color: '#c084fc' }}>⭐ Премиум-размещение</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hint)' }}>Скоро появится</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
              Скоро
            </span>
          </div>

          {/* Close */}
          <button onClick={onClose}
                  className="w-full py-3 rounded-2xl text-sm font-semibold transition active:scale-95 mb-3"
                  style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
            Закрыть
          </button>

          {/* Delete own event — bottom, with confirmation */}
          {isOwner && !expired && (
            confirmDelete ? (
              <div className="rounded-2xl px-4 py-3 mb-2"
                   style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)' }}>
                <p className="text-sm font-semibold text-center mb-3" style={{ color: 'var(--danger)' }}>
                  Удалить событие? Это нельзя отменить
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirm(false)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition active:scale-95"
                          style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
                    Отмена
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition active:scale-95 disabled:opacity-40"
                          style={{ background: 'var(--danger)', color: '#fff' }}>
                    {deleting ? '⏳ Удаляю…' : '🗑 Да, удалить'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirm(true)}
                      className="w-full py-3 rounded-2xl text-sm font-semibold mb-2 transition active:scale-95"
                      style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.2)' }}>
                🗑 Удалить событие
              </button>
            )
          )}
        </div>
      </div>
    </>
  )
}
