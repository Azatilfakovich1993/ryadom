import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CATEGORY_CONFIG } from './MapComponent'

const TABS = [
  { key: 'analytics', label: '📊 Аналитика' },
  { key: 'events',    label: '📍 События' },
  { key: 'users',     label: '👥 Пользователи' },
  { key: 'reviews',   label: '⭐ Отзывы' },
  { key: 'reports',   label: '🚩 Жалобы' },
  { key: 'broadcast', label: '📢 Рассылка' },
]

// ── Analytics ────────────────────────────────────────────────
function Analytics() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const load = async () => {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const weekStart  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [
        { count: totalUsers },
        { count: totalEvents },
        { count: todayEvents },
        { count: weekEvents },
        { data: byCat },
        { data: byHour },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
        supabase.from('events').select('category'),
        supabase.from('events').select('created_at'),
      ])

      // По категориям
      const catMap = {}
      byCat?.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + 1 })

      // По часам
      const hourMap = Array(24).fill(0)
      byHour?.forEach(e => {
        const h = new Date(e.created_at).getHours()
        hourMap[h]++
      })
      const maxHour = Math.max(...hourMap, 1)

      setStats({ totalUsers, totalEvents, todayEvents, weekEvents, catMap, hourMap, maxHour })
    }
    load()
  }, [])

  if (!stats) return <Loader />

  return (
    <div className="flex flex-col gap-4">
      {/* Цифры */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Пользователей', value: stats.totalUsers, color: '#22d3ee' },
          { label: 'Событий всего', value: stats.totalEvents, color: '#a855f7' },
          { label: 'Сегодня', value: stats.todayEvents, color: '#34d399' },
          { label: 'За неделю', value: stats.weekEvents, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4"
               style={{ background: 'var(--bg-2)', border: `1px solid ${s.color}33` }}>
            <p className="text-3xl font-black" style={{ color: s.color }}>{s.value ?? 0}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--hint)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* По категориям */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>По категориям</p>
        <div className="flex flex-col gap-2">
          {Object.entries(stats.catMap).sort((a,b) => b[1]-a[1]).map(([cat, cnt]) => {
            const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.chat
            const pct = Math.round(cnt / (stats.totalEvents || 1) * 100)
            return (
              <div key={cat} className="flex items-center gap-2">
                <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                <div className="flex-1">
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-3)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color }} />
                  </div>
                </div>
                <span className="text-xs font-bold w-8 text-right" style={{ color: 'var(--text)' }}>{cnt}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* По часам */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>Активность по часам</p>
        <div className="flex items-end gap-0.5" style={{ height: 60 }}>
          {stats.hourMap.map((v, h) => (
            <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-t" style={{
                height: `${Math.round(v / stats.maxHour * 52)}px`,
                background: v > 0 ? 'var(--accent)' : 'var(--bg-3)',
                minHeight: 2,
              }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {[0,6,12,18,23].map(h => (
            <span key={h} className="text-[9px]" style={{ color: 'var(--hint)' }}>{h}:00</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Events ───────────────────────────────────────────────────
function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    supabase.from('events').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setEvents(data ?? []); setLoading(false) })
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Удалить событие?')) return
    setDeletingId(id)
    const { error } = await supabase.rpc('admin_delete_event', { event_id: id })
    if (!error) setEvents(prev => prev.filter(e => e.id !== id))
    else console.error('delete error:', error)
    setDeletingId(null)
  }

  if (loading) return <Loader />

  const active = events.filter(e => new Date(e.expires_at) > new Date())
  const expired = events.filter(e => new Date(e.expires_at) <= new Date())

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs" style={{ color: 'var(--hint)' }}>
        Активных: <b style={{ color: 'var(--success)' }}>{active.length}</b> · Завершённых: <b style={{ color: 'var(--hint)' }}>{expired.length}</b>
      </p>
      {events.map(ev => {
        const cfg = CATEGORY_CONFIG[ev.category] ?? CATEGORY_CONFIG.chat
        const isActive = new Date(ev.expires_at) > new Date()
        return (
          <div key={ev.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
               style={{ background: 'var(--bg-2)', border: `1px solid ${isActive ? cfg.color + '33' : 'var(--bg-3)'}` }}>
            <span style={{ fontSize: 20 }}>{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{ev.title}</p>
              <p className="text-[10px]" style={{ color: isActive ? cfg.color : 'var(--hint)' }}>
                {isActive ? '🟢 Активно' : '⚫ Завершено'} · {new Date(ev.created_at).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <button onClick={() => handleDelete(ev.id)} disabled={deletingId === ev.id}
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-xs flex-shrink-0 transition active:scale-90 disabled:opacity-40"
                    style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--danger)' }}>
              {deletingId === ev.id ? '…' : '🗑'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Users ────────────────────────────────────────────────────
function Users() {
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setUsers(data ?? []); setLoading(false) })
  }, [])

  const filtered = search.trim()
    ? users.filter(u =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(search.toLowerCase())
      )
    : users

  const toggleBan = async (user) => {
    const newVal = !user.is_banned
    if (!confirm(newVal ? `Заблокировать ${user.username}?` : `Разблокировать ${user.username}?`)) return
    await supabase.from('profiles').update({ is_banned: newVal }).eq('id', user.id)
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: newVal } : u))
  }

  const toggleBusiness = async (user) => {
    const newVal = !user.is_business
    if (!confirm(newVal ? `Выдать бизнес-доступ ${user.username}?` : `Убрать бизнес-доступ у ${user.username}?`)) return
    await supabase.from('profiles').update({ is_business: newVal }).eq('id', user.id)
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_business: newVal } : u))
  }

  if (loading) return <Loader />

  return (
    <div className="flex flex-col gap-2">
      <input value={search} onChange={e => setSearch(e.target.value)}
             placeholder="Поиск по имени или @username…"
             className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none mb-1"
             style={{ background: 'var(--bg-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
             onFocus={e => e.target.style.borderColor = 'var(--accent)'}
             onBlur={e => e.target.style.borderColor = 'var(--border)'} />
      <p className="text-xs" style={{ color: 'var(--hint)' }}>
        {search ? `Найдено: ${filtered.length}` : `Всего: ${users.length}`}
      </p>
      {filtered.map(u => (
        <div key={u.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
             style={{ background: 'var(--bg-2)', border: `1px solid ${u.is_banned ? 'rgba(248,113,113,0.3)' : 'var(--border)'}`, opacity: u.is_banned ? 0.7 : 1 }}>
          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 font-bold text-sm"
               style={{ background: 'var(--bg-3)', color: 'var(--accent)' }}>
            {u.avatar_url
              ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
              : (u.display_name?.[0] ?? u.username?.[0] ?? '?').toUpperCase()
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
              {u.display_name || u.username}
            </p>
            <p className="text-[10px]" style={{ color: u.is_banned ? 'var(--danger)' : 'var(--hint)' }}>
              @{u.username} {u.is_banned ? '· 🚫 Заблокирован' : ''}
            </p>
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button onClick={() => toggleBusiness(u)}
                    className="px-2 py-1 rounded-xl text-[10px] font-bold transition active:scale-90"
                    style={{
                      background: u.is_business ? 'rgba(245,158,11,0.2)' : 'var(--bg-3)',
                      color: u.is_business ? '#f59e0b' : 'var(--hint)',
                      border: u.is_business ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
                    }}>
              {u.is_business ? '⭐ Бизнес' : '⭐'}
            </button>
            <button onClick={() => toggleBan(u)}
                    className="px-2 py-1 rounded-xl text-[10px] font-bold transition active:scale-90"
                    style={{
                      background: u.is_banned ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                      color: u.is_banned ? 'var(--success)' : 'var(--danger)',
                      border: u.is_banned ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(248,113,113,0.3)',
                    }}>
              {u.is_banned ? 'Разбан' : 'Бан'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Reviews ──────────────────────────────────────────────────
function Reviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setReviews(data ?? []); setLoading(false) })
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Удалить отзыв?')) return
    setDeletingId(id)
    await supabase.from('reviews').delete().eq('id', id)
    setReviews(prev => prev.filter(r => r.id !== id))
    setDeletingId(null)
  }

  if (loading) return <Loader />

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs mb-1" style={{ color: 'var(--hint)' }}>Всего отзывов: {reviews.length}</p>
      {reviews.map(r => (
        <div key={r.id} className="flex items-start gap-3 rounded-2xl px-3 py-2.5"
             style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: '#fbbf24', fontSize: 12 }}>{'⭐'.repeat(r.rating)}</span>
              <span className="text-[10px]" style={{ color: 'var(--hint)' }}>
                {new Date(r.created_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
            {r.comment && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>{r.comment}</p>
            )}
          </div>
          <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id}
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-xs flex-shrink-0 transition active:scale-90 disabled:opacity-40"
                  style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--danger)' }}>
            {deletingId === r.id ? '…' : '🗑'}
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Broadcast ────────────────────────────────────────────────
function Broadcast() {
  const [message, setMessage]       = useState('')
  const [type, setType]             = useState('info')
  const [hours, setHours]           = useState(24)
  const [sending, setSending]       = useState(false)
  const [sent, setSent]             = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [users, setUsers]           = useState([])
  const [targetId, setTargetId]     = useState(null) // null = всем
  const [userSearch, setUserSearch] = useState('')

  useEffect(() => {
    supabase.from('announcements').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setAnnouncements(data ?? []))
    supabase.from('profiles').select('id,username,display_name,avatar_url')
      .order('username').then(({ data }) => setUsers(data ?? []))
  }, [])

  const handleSend = async () => {
    if (!message.trim() || sending) return
    setSending(true)
    const expires_at = new Date(Date.now() + hours * 3600000).toISOString()
    const payload = { message: message.trim(), type, expires_at }
    if (targetId) payload.target_user_id = targetId
    const { data } = await supabase.from('announcements').insert([payload]).select().single()
    if (data) setAnnouncements(prev => [data, ...prev])
    setMessage('')
    setTargetId(null)
    setUserSearch('')
    setSent(true)
    setSending(false)
    setTimeout(() => setSent(false), 3000)
  }

  const handleDelete = async (id) => {
    await supabase.from('announcements').delete().eq('id', id)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  const TYPES = [
    { key: 'info',    label: 'ℹ️ Инфо',  color: 'var(--accent)' },
    { key: 'success', label: '✅ Обновление', color: 'var(--success)' },
    { key: 'warning', label: '❗ Важно',  color: '#f59e0b' },
  ]

  const filteredUsers = userSearch
    ? users.filter(u => u.username?.includes(userSearch) || u.display_name?.toLowerCase().includes(userSearch.toLowerCase()))
    : users

  const selectedUser = users.find(u => u.id === targetId)

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>
          Новое сообщение
        </p>

        {/* Кому */}
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--hint)' }}>Кому</p>
        <div className="flex gap-2 mb-3">
          <button onClick={() => { setTargetId(null); setUserSearch('') }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-90"
                  style={{
                    background: !targetId ? 'var(--accent)22' : 'var(--bg-3)',
                    border: `1px solid ${!targetId ? 'var(--accent)' : 'transparent'}`,
                    color: !targetId ? 'var(--accent)' : 'var(--hint)',
                  }}>
            📢 Всем
          </button>
          <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                 placeholder="Найти пользователя…"
                 className="flex-1 rounded-xl px-3 py-1.5 text-xs outline-none"
                 style={{ background: 'var(--bg-3)', color: 'var(--text)', border: `1px solid ${targetId ? 'var(--accent)44' : 'transparent'}` }} />
        </div>

        {/* User list */}
        {userSearch && (
          <div className="rounded-xl overflow-hidden mb-3" style={{ border: '1px solid var(--bg-3)', maxHeight: 140, overflowY: 'auto' }}>
            {filteredUsers.map(u => (
              <button key={u.id} onClick={() => { setTargetId(u.id); setUserSearch('') }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left transition"
                      style={{ background: targetId === u.id ? 'var(--accent)11' : 'var(--bg-2)', borderBottom: '1px solid var(--bg-3)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                  {u.display_name || u.username}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--hint)' }}>@{u.username}</span>
              </button>
            ))}
          </div>
        )}

        {selectedUser && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl"
               style={{ background: 'var(--accent)11', border: '1px solid var(--accent)33' }}>
            <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
              → {selectedUser.display_name || selectedUser.username}
            </span>
            <button onClick={() => setTargetId(null)} className="ml-auto text-xs" style={{ color: 'var(--hint)' }}>✕</button>
          </div>
        )}

        {/* Тип */}
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--hint)' }}>Тип</p>
        <div className="flex gap-2 mb-3">
          {TYPES.map(t => (
            <button key={t.key} onClick={() => setType(t.key)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-bold transition active:scale-90"
                    style={{
                      background: type === t.key ? t.color + '22' : 'var(--bg-3)',
                      border: `1px solid ${type === t.key ? t.color : 'transparent'}`,
                      color: type === t.key ? t.color : 'var(--hint)',
                    }}>
              {t.label}
            </button>
          ))}
        </div>

        <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 200))}
                  placeholder="Текст сообщения…"
                  rows={3}
                  className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none mb-3"
                  style={{ background: 'var(--bg-3)', color: 'var(--text)', border: '1px solid var(--bg-3)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--bg-3)'} />

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs" style={{ color: 'var(--hint)' }}>Показывать</span>
          {[1, 6, 24, 72].map(h => (
            <button key={h} onClick={() => setHours(h)}
                    className="px-2 py-1 rounded-lg text-xs font-bold transition active:scale-90"
                    style={{
                      background: hours === h ? 'var(--accent)22' : 'var(--bg-3)',
                      border: `1px solid ${hours === h ? 'var(--accent)' : 'transparent'}`,
                      color: hours === h ? 'var(--accent)' : 'var(--hint)',
                    }}>
              {h}ч
            </button>
          ))}
        </div>

        <button onClick={handleSend} disabled={!message.trim() || sending}
                className="w-full py-3 rounded-xl text-sm font-bold transition active:scale-95 disabled:opacity-40"
                style={{ background: sent ? 'var(--success)' : 'var(--accent)', color: '#111827' }}>
          {sent ? '✓ Отправлено!' : sending ? '⏳ Отправляю…' : targetId ? '✉️ Отправить пользователю' : '📢 Отправить всем'}
        </button>
      </div>

      {announcements.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--hint)' }}>
            Активные рассылки
          </p>
          <div className="flex flex-col gap-2">
            {announcements.map(a => (
              <div key={a.id} className="flex items-start gap-2 rounded-2xl px-3 py-2.5"
                   style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] mb-0.5" style={{ color: 'var(--hint)' }}>
                    {a.target_user_id ? '✉️ Личное' : '📢 Всем'} · {a.type}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{a.message}</p>
                </div>
                <button onClick={() => handleDelete(a.id)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                        style={{ color: 'var(--danger)' }}>🗑</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reports ──────────────────────────────────────────────────
function Reports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('reports').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setReports(data ?? []); setLoading(false) })
  }, [])

  const handleDelete = async (id) => {
    await supabase.from('reports').delete().eq('id', id)
    setReports(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return <Loader />

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs mb-1" style={{ color: 'var(--hint)' }}>Всего жалоб: {reports.length}</p>
      {reports.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--hint)' }}>Жалоб нет 🎉</p>
      )}
      {reports.map(r => (
        <div key={r.id} className="flex items-start gap-3 rounded-2xl px-3 py-2.5"
             style={{ background: 'var(--bg-2)', border: '1px solid rgba(248,113,113,0.25)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--danger)' }}>🚩 {r.reason}</p>
            <p className="text-[10px]" style={{ color: 'var(--hint)' }}>
              Событие: {r.event_id?.slice(0,8)}… · {new Date(r.created_at).toLocaleDateString('ru-RU')}
            </p>
          </div>
          <button onClick={() => handleDelete(r.id)}
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-xs flex-shrink-0 transition active:scale-90"
                  style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--danger)' }}>🗑</button>
        </div>
      ))}
    </div>
  )
}

// ── Loader ───────────────────────────────────────────────────
function Loader() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
           style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function AdminPanel({ onClose }) {
  const [tab, setTab] = useState('analytics')

  return (
    <>
      <div className="absolute inset-0 z-[90] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 z-[95] flex flex-col"
           style={{
             background: 'rgba(10,14,23,0.98)',
             backdropFilter: 'blur(24px)',
           }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h1 className="text-xl font-black" style={{ color: 'var(--accent)' }}>⚙️ Админ панель</h1>
            <p className="text-xs" style={{ color: 'var(--hint)' }}>RYADOM управление</p>
          </div>
          <button onClick={onClose}
                  className="w-9 h-9 rounded-2xl flex items-center justify-center transition active:scale-90"
                  style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-90"
                    style={{
                      background: tab === t.key ? 'var(--accent)' : 'var(--bg-2)',
                      color: tab === t.key ? '#111827' : 'var(--hint)',
                      border: `1px solid ${tab === t.key ? 'var(--accent)' : 'var(--bg-3)'}`,
                    }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {tab === 'analytics' && <Analytics />}
          {tab === 'events'    && <Events />}
          {tab === 'users'     && <Users />}
          {tab === 'reviews'   && <Reviews />}
          {tab === 'reports'   && <Reports />}
          {tab === 'broadcast' && <Broadcast />}
        </div>
      </div>
    </>
  )
}
