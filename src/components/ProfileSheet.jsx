import { useState, useEffect, useRef } from 'react'
import { CATEGORY_CONFIG } from './MapComponent'
import { getProfile, updateProfile, fetchMyEvents, deleteEvent, signOut } from '../lib/supabase'
import { ACHIEVEMENTS, getAllUnlocked } from '../utils/achievements'

const KARMA_LEVELS = [
  { min: 0,  label: 'Искра',           icon: '🌱', color: '#6b7280' },
  { min: 3,  label: 'Активный',        icon: '⭐', color: '#f59e0b' },
  { min: 7,  label: 'Энергичный',      icon: '🔥', color: '#f97316' },
  { min: 15, label: 'Организатор',     icon: '💎', color: '#3b82f6' },
  { min: 30, label: 'Легенда района',  icon: '👑', color: '#a855f7' },
]

function getLevel(count) {
  return [...KARMA_LEVELS].reverse().find(l => count >= l.min) ?? KARMA_LEVELS[0]
}

function compressAvatar(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const SIZE = 200
        const canvas = document.createElement('canvas')
        canvas.width = SIZE; canvas.height = SIZE
        const ctx = canvas.getContext('2d')
        const side = Math.min(img.width, img.height)
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function ProfileSheet({ authUser, onClose, onSignOut }) {
  const [profile, setProfile]         = useState(null)
  const [myEvents, setMyEvents]       = useState([])
  const [editing, setEditing]         = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio]                 = useState('')
  const [city, setCity]               = useState('')
  const [avatar, setAvatar]           = useState(null)
  const [saving, setSaving]           = useState(false)
  const [showEvents, setShowEvents]   = useState(false)
  const [deletingId, setDeletingId]   = useState(null)
  const avatarInputRef = useRef(null)

  useEffect(() => {
    if (!authUser) return
    getProfile(authUser.id).then(p => {
      if (p) {
        setProfile(p)
        setDisplayName(p.display_name ?? '')
        setBio(p.bio ?? '')
        setCity(p.city ?? '')
        setAvatar(p.avatar_url ?? null)
      }
    })
    fetchMyEvents(authUser.id).then(setMyEvents)
  }, [authUser])

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const compressed = await compressAvatar(file)
    setAvatar(compressed)
    e.target.value = ''
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile(authUser.id, {
        display_name: displayName.trim(),
        bio: bio.trim(),
        city: city.trim(),
        avatar_url: avatar,
      })
      setProfile(prev => ({
        ...prev,
        display_name: displayName.trim(),
        bio: bio.trim(),
        city: city.trim(),
        avatar_url: avatar,
      }))
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (eventId) => {
    setDeletingId(eventId)
    try {
      await deleteEvent(eventId)
      setMyEvents(prev => prev.filter(e => e.id !== eventId))
    } finally {
      setDeletingId(null)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    onSignOut()
  }

  const activeEvents   = myEvents.filter(e => new Date(e.expires_at) > new Date())
  const archivedEvents = myEvents.filter(e => new Date(e.expires_at) <= new Date())
  const totalCreated   = profile?.events_count ?? myEvents.length
  const level          = getLevel(totalCreated)

  const initials = (profile?.display_name ?? profile?.username ?? '?')
    .split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  return (
    <>
      <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col"
           style={{
             background: 'rgba(17,24,39,0.98)',
             backdropFilter: 'blur(24px)',
             border: '1px solid var(--border)',
             borderBottom: 'none',
             boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
             paddingBottom: 'env(safe-area-inset-bottom, 20px)',
             maxHeight: '92vh',
           }}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-9 h-[3px] rounded-full" style={{ background: 'var(--bg-3)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
          <h2 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>Профиль</h2>
          <div className="flex gap-2">
            {!editing && (
              <button onClick={() => setEditing(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95"
                      style={{ background: 'var(--bg-2)', color: 'var(--accent)', border: '1px solid var(--bg-3)' }}>
                ✏️ Редактировать
              </button>
            )}
            <button onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition active:scale-90"
                    style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-4">

          {/* Avatar + name */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-black"
                   style={{ border: `2.5px solid ${level.color}`, background: avatar ? 'transparent' : 'var(--bg-2)' }}>
                {avatar
                  ? <img src={avatar} className="w-full h-full object-cover" alt="" />
                  : <span style={{ color: level.color }}>{initials || '?'}</span>
                }
              </div>
              {editing && (
                <>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                         onChange={handleAvatarChange} />
                  <button type="button" onClick={() => avatarInputRef.current?.click()}
                          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs transition active:scale-90"
                          style={{ background: 'var(--accent)', color: '#111827' }}>
                    📷
                  </button>
                </>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {editing ? (
                <input value={displayName} onChange={e => setDisplayName(e.target.value.slice(0, 30))}
                       placeholder="Твоё имя"
                       className="w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none mb-1"
                       style={{ background: 'var(--bg-2)', color: 'var(--text)', border: '1px solid var(--accent)44' }} />
              ) : (
                <p className="font-bold text-base truncate" style={{ color: 'var(--text)' }}>
                  {profile?.display_name || 'Без имени'}
                </p>
              )}
              <p className="text-xs mb-1" style={{ color: 'var(--hint)' }}>@{profile?.username}</p>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                   style={{ background: level.color + '22', border: `1px solid ${level.color}44` }}>
                <span style={{ fontSize: 12 }}>{level.icon}</span>
                <span className="text-xs font-bold" style={{ color: level.color }}>{level.label}</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-3">
            <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block"
                   style={{ color: 'var(--accent)' }}>О себе</label>
            {editing ? (
              <>
                <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 200))}
                          placeholder="Люблю теннис, живу в Ленинском…"
                          rows={2}
                          className="w-full rounded-2xl px-4 py-3 text-sm resize-none outline-none"
                          style={{ background: 'var(--bg-2)', color: 'var(--text)', border: '1px solid var(--bg-3)' }}
                          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                          onBlur={e => e.target.style.borderColor = 'var(--bg-3)'} />
                <div className="flex justify-end mt-1">
                  <span className="text-xs" style={{ color: 'var(--hint)' }}>{bio.length}/200</span>
                </div>
              </>
            ) : (
              <p className="text-sm rounded-2xl px-4 py-3 leading-relaxed"
                 style={{ background: 'var(--bg-2)', color: profile?.bio ? 'var(--text)' : 'var(--hint)', border: '1px solid var(--bg-3)' }}>
                {profile?.bio || 'Расскажи немного о себе…'}
              </p>
            )}
          </div>

          {/* City */}
          <div className="mb-4">
            <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block"
                   style={{ color: 'var(--accent)' }}>Город / район</label>
            {editing ? (
              <input value={city} onChange={e => setCity(e.target.value.slice(0, 50))}
                     placeholder="Ижевск, Ленинский"
                     className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                     style={{ background: 'var(--bg-2)', color: 'var(--text)', border: '1px solid var(--bg-3)' }}
                     onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                     onBlur={e => e.target.style.borderColor = 'var(--bg-3)'} />
            ) : (
              <p className="text-sm rounded-2xl px-4 py-3"
                 style={{ background: 'var(--bg-2)', color: profile?.city ? 'var(--text)' : 'var(--hint)', border: '1px solid var(--bg-3)' }}>
                📍 {profile?.city || 'Не указан'}
              </p>
            )}
          </div>

          {/* Save / Cancel */}
          {editing && (
            <div className="flex gap-2 mb-5">
              <button onClick={() => setEditing(false)}
                      className="flex-1 py-3 rounded-2xl text-sm font-semibold transition active:scale-95"
                      style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
                Отмена
              </button>
              <button onClick={handleSave} disabled={saving}
                      className="flex-1 py-3 rounded-2xl text-sm font-bold transition active:scale-95 disabled:opacity-40"
                      style={{ background: 'var(--accent)', color: '#111827' }}>
                {saving ? '⏳ Сохраняю…' : '✓ Сохранить'}
              </button>
            </div>
          )}

          {/* Karma */}
          <div className="rounded-2xl p-4 mb-4"
               style={{ background: level.color + '11', border: `1px solid ${level.color}33` }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: level.color }}>
              {level.icon} Активность
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-black" style={{ color: 'var(--text)' }}>{totalCreated}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--hint)' }}>Создано событий</p>
              </div>
              <div>
                <p className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{activeEvents.length}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--hint)' }}>Активных</p>
              </div>
              <div>
                <p className="text-2xl" style={{ color: level.color }}>{level.icon}</p>
                <p className="text-[10px] mt-0.5 font-bold" style={{ color: level.color }}>{level.label}</p>
              </div>
            </div>
            {/* Next level hint */}
            {(() => {
              const nextLevel = KARMA_LEVELS.find(l => l.min > totalCreated)
              if (!nextLevel) return null
              return (
                <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--hint)' }}>
                  До «{nextLevel.label}» ещё {nextLevel.min - myEvents.length} {nextLevel.min - myEvents.length === 1 ? 'событие' : 'событий'}
                </p>
              )
            })()}
          </div>

          {/* Достижения */}
          {(() => {
            const unlocked = getAllUnlocked()
            const all = Object.entries(ACHIEVEMENTS)
            if (all.length === 0) return null
            return (
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider mb-3"
                   style={{ color: 'var(--accent)' }}>
                  🏅 Достижения ({unlocked.length}/{all.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {all.map(([id, ach]) => {
                    const got = unlocked.includes(id)
                    return (
                      <div key={id} className="rounded-2xl px-3 py-2.5 flex items-center gap-2.5"
                           style={{
                             background: got ? 'rgba(34,211,238,0.07)' : 'var(--bg-2)',
                             border: `1px solid ${got ? 'rgba(34,211,238,0.25)' : 'var(--bg-3)'}`,
                             opacity: got ? 1 : 0.45,
                           }}>
                        <span style={{ fontSize: 22, filter: got ? 'none' : 'grayscale(1)' }}>{ach.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: got ? 'var(--text)' : 'var(--hint)' }}>
                            {ach.title}
                          </p>
                          <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--hint)' }}>
                            {got ? ach.desc : '???'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* My events */}
          <div className="mb-4">
            <button onClick={() => setShowEvents(v => !v)}
                    className="w-full flex items-center justify-between rounded-2xl px-4 py-3 transition active:scale-95"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--bg-3)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                📍 Мои импульсы ({myEvents.length})
              </span>
              <span style={{ color: 'var(--hint)', fontSize: 12 }}>{showEvents ? '▲' : '▼'}</span>
            </button>

            {showEvents && (
              <div className="mt-2 flex flex-col gap-2">
                {myEvents.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--hint)' }}>
                    Ты ещё не создавал событий
                  </p>
                )}
                {myEvents.map(ev => {
                  const cfg = CATEGORY_CONFIG[ev.category] ?? CATEGORY_CONFIG.chat
                  const isActive = new Date(ev.expires_at) > new Date()
                  return (
                    <div key={ev.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
                         style={{ background: 'var(--bg-2)', border: `1px solid ${isActive ? cfg.color + '33' : 'var(--bg-3)'}` }}>
                      <span className="text-xl flex-shrink-0">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate"
                           style={{ color: isActive ? 'var(--text)' : 'var(--hint)' }}>
                          {ev.title}
                        </p>
                        <p className="text-[10px]" style={{ color: isActive ? cfg.color : 'var(--hint)' }}>
                          {isActive ? '🟢 Активно' : '⚫ Завершено'}
                        </p>
                      </div>
                      {isActive && (
                        <button onClick={() => handleDelete(ev.id)}
                                disabled={deletingId === ev.id}
                                className="w-7 h-7 rounded-xl flex items-center justify-center text-xs flex-shrink-0 transition active:scale-90 disabled:opacity-40"
                                style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--danger)' }}>
                          {deletingId === ev.id ? '…' : '🗑'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Feedback */}
          <button onClick={() => window.open('mailto:feedback@ryadom.app', '_blank')}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 mb-3 transition active:scale-95"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--bg-3)' }}>
            <span className="text-xl">💡</span>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Предложить идею / сообщить о баге</p>
              <p className="text-xs" style={{ color: 'var(--hint)' }}>Пиши — слушаем каждого</p>
            </div>
          </button>

          {/* Logout */}
          <button onClick={handleSignOut}
                  className="w-full py-3 rounded-2xl text-sm font-semibold transition active:scale-95"
                  style={{ background: 'rgba(248,113,113,0.08)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.2)' }}>
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </>
  )
}
