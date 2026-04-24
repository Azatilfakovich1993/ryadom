import { useState, useEffect } from 'react'
import { fetchReviews, submitReview } from '../lib/supabase'

function Stars({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{ fontSize: size, lineHeight: 1, background: 'none', border: 'none', cursor: onChange ? 'pointer' : 'default', padding: 0 }}
        >
          <span style={{ opacity: n <= (hover || value) ? 1 : 0.25 }}>⭐</span>
        </button>
      ))}
    </div>
  )
}

function avgRating(reviews) {
  if (!reviews.length) return 0
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
}

export default function CreatorSheet({ creator, event, authUser, onClose }) {
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [rating, setRating]     = useState(0)
  const [comment, setComment]   = useState('')
  const [sending, setSending]   = useState(false)
  const [done, setDone]         = useState(false)

  const reviewerId = authUser?.id?.toString() ?? (() => {
    let id = localStorage.getItem('ryadom_uid')
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('ryadom_uid', id) }
    return id
  })()

  const isOwn = authUser && authUser.id === creator.id

  useEffect(() => {
    fetchReviews(creator.id).then(r => { setReviews(r); setLoading(false) })
    // check if already reviewed this event
  }, [creator.id])

  const alreadyReviewed = reviews.some(r => r.reviewer_id === reviewerId && r.event_id === event?.id)

  const handleSubmit = async () => {
    if (!rating || sending) return
    setSending(true)
    try {
      await submitReview({ reviewerId, targetId: creator.id, eventId: event.id, rating, comment })
      const fresh = await fetchReviews(creator.id).then(r => r)
      setReviews(fresh)
      setDone(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  const avg = avgRating(reviews)
  const initials = (creator.display_name ?? creator.username ?? '?')
    .split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  return (
    <>
      <div className="absolute inset-0 z-[70]" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 z-[80] rounded-t-3xl flex flex-col"
           style={{
             background: 'rgba(17,24,39,0.98)',
             backdropFilter: 'blur(24px)',
             border: '1px solid var(--border)',
             borderBottom: 'none',
             boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
             paddingBottom: 'env(safe-area-inset-bottom, 16px)',
             maxHeight: '88vh',
           }}>

        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-9 h-[3px] rounded-full" style={{ background: 'var(--bg-3)' }} />
        </div>

        <div className="overflow-y-auto flex-1 px-5 pt-1 pb-4">

          {/* Profile header */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-xl font-black flex-shrink-0"
                 style={{ background: 'var(--bg-2)', border: '2px solid var(--accent)44' }}>
              {creator.avatar_url
                ? <img src={creator.avatar_url} className="w-full h-full object-cover" alt="" />
                : <span style={{ color: 'var(--accent)' }}>{initials || '?'}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base truncate" style={{ color: 'var(--text)' }}>
                {creator.display_name || creator.username || 'Аноним'}
              </p>
              {creator.username && (
                <p className="text-xs mb-1" style={{ color: 'var(--hint)' }}>@{creator.username}</p>
              )}
              {reviews.length > 0 ? (
                <div className="flex items-center gap-2">
                  <Stars value={Math.round(avg)} size={14} />
                  <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                    {avg.toFixed(1)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--hint)' }}>
                    ({reviews.length} {reviews.length === 1 ? 'отзыв' : reviews.length < 5 ? 'отзыва' : 'отзывов'})
                  </span>
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--hint)' }}>Отзывов пока нет</p>
              )}
            </div>
          </div>

          {/* City + Bio */}
          {(creator.city || creator.bio) && (
            <div className="rounded-2xl px-4 py-3 mb-4 flex flex-col gap-2"
                 style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              {creator.city && (
                <p className="text-sm font-semibold" style={{ color: 'var(--hint)' }}>
                  📍 {creator.city}
                </p>
              )}
              {creator.bio && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{creator.bio}</p>
              )}
            </div>
          )}

          {/* Leave review */}
          {!isOwn && event && (
            <div className="mb-5">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>
                {alreadyReviewed || done ? '✅ Ваш отзыв' : '⭐ Оценить инициатора'}
              </p>

              {done || alreadyReviewed ? (
                <div className="rounded-2xl px-4 py-3 text-sm text-center"
                     style={{ background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.2)', color: 'var(--accent)' }}>
                  Спасибо за отзыв! 🙌
                </div>
              ) : (
                <div className="rounded-2xl p-4"
                     style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                  <div className="flex justify-center mb-3">
                    <Stars value={rating} onChange={setRating} size={32} />
                  </div>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value.slice(0, 300))}
                    placeholder="Комментарий (необязательно)…"
                    rows={2}
                    className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none mb-3"
                    style={{ background: 'var(--bg-3)', color: 'var(--text)', border: '1px solid var(--bg-3)' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--bg-3)'}
                  />
                  <button onClick={handleSubmit} disabled={!rating || sending}
                          className="w-full py-3 rounded-xl text-sm font-bold transition active:scale-95 disabled:opacity-40"
                          style={{ background: 'var(--accent)', color: '#111827' }}>
                    {sending ? '⏳ Отправляю…' : 'Отправить отзыв'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reviews list */}
          {!loading && reviews.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--hint)' }}>
                Отзывы
              </p>
              <div className="flex flex-col gap-2">
                {reviews.map(r => (
                  <div key={r.id} className="rounded-2xl px-4 py-3"
                       style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <Stars value={r.rating} size={13} />
                      <span className="text-[10px]" style={{ color: 'var(--hint)' }}>
                        {new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-sm leading-relaxed mt-1" style={{ color: 'var(--text)' }}>{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={onClose}
                  className="w-full py-3 rounded-2xl text-sm font-semibold transition active:scale-95 mt-4"
                  style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
            Закрыть
          </button>
        </div>
      </div>
    </>
  )
}
