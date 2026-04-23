import { useRef, useState, useMemo, useEffect } from 'react'
import { CATEGORY_CONFIG } from './MapComponent'

function distM(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distLabel(m) {
  return m < 1000 ? `${Math.round(m)} м` : `${(m / 1000).toFixed(1)} км`
}

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
    expired: remaining <= 0,
  }
}

function EventCard({ event, dist, onViewDetails }) {
  const cfg = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.chat
  const { label: timeLabel, urgency } = useCountdown(event.expires_at)
  const hasPhoto = event.photos?.length > 0

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#0f172a' }}>

      {hasPhoto ? (
        <img src={event.photos[0]} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 25% 35%, ${cfg.color}55 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, ${cfg.color}33 0%, transparent 55%), #0f172a`,
        }} />
      )}

      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 35%, transparent 50%, rgba(0,0,0,0.88) 100%)',
      }} />

      {/* Категория */}
      <div style={{ position: 'absolute', top: 72, left: 16 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: cfg.color, background: cfg.color + '22',
          border: `1px solid ${cfg.color}44`,
          borderRadius: 20, padding: '4px 10px',
        }}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {/* Инфо снизу */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 32px' }}>
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: '#fff',
          lineHeight: 1.3, marginBottom: 12,
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}>
          {event.title}
        </h2>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {dist !== null && (
            <span style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
              borderRadius: 20, padding: '5px 11px',
              fontSize: 12, color: '#fff', fontWeight: 600,
            }}>
              📍 {distLabel(dist)} от тебя
            </span>
          )}
          <span style={{
            background: urgency ? 'rgba(248,113,113,0.25)' : 'rgba(34,211,238,0.15)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${urgency ? 'rgba(248,113,113,0.4)' : 'rgba(34,211,238,0.3)'}`,
            borderRadius: 20, padding: '5px 11px',
            fontSize: 12, fontWeight: 600,
            color: urgency ? '#f87171' : '#22d3ee',
          }}>
            ⏱ {timeLabel}
          </span>
        </div>

        <button
          onClick={onViewDetails}
          style={{
            width: '100%', padding: '13px 0',
            borderRadius: 16, border: 'none', cursor: 'pointer',
            background: cfg.color, color: '#111827',
            fontSize: 14, fontWeight: 900, letterSpacing: '0.05em',
            boxShadow: `0 4px 20px ${cfg.color}55`,
          }}
        >
          ПОДРОБНЕЕ →
        </button>
      </div>
    </div>
  )
}

function RadarCard({ onExpand, expanded }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: 'radial-gradient(ellipse at 50% 50%, rgba(34,211,238,0.08), #0f172a 70%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 32px',
    }}>
      <style>{`
        @keyframes radar-ring {
          0%   { transform: scale(0.3); opacity: 0.7; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 28 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1.5px solid rgba(34,211,238,0.35)',
            animation: `radar-ring 2s ease-out infinite`,
            animationDelay: `${i * 0.55}s`,
          }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>
          📡
        </div>
      </div>

      <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 8, textAlign: 'center' }}>
        {expanded ? 'В радиусе 5 км тихо' : 'Рядом пока тихо'}
      </p>
      <p style={{ fontSize: 13, color: 'var(--hint)', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
        {expanded ? 'Событий не найдено. Будь первым!' : 'В 500м событий нет. Расширить поиск?'}
      </p>

      {!expanded && (
        <button onClick={onExpand} style={{
          padding: '13px 28px', borderRadius: 16,
          border: '1.5px solid rgba(34,211,238,0.4)',
          background: 'rgba(34,211,238,0.1)', color: '#22d3ee',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          backdropFilter: 'blur(12px)',
        }}>
          🔍 Расширить до 5 км
        </button>
      )}
    </div>
  )
}

export default function FeedView({ events, location, onViewEvent }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [radarExpanded, setRadarExpanded] = useState(false)
  const touchStartY = useRef(0)
  const dragging = useRef(false)

  const sorted = useMemo(() => {
    const withDist = events.map(ev => ({
      ...ev,
      dist: location ? distM(location.lat, location.lon, ev.lat, ev.lon) : null,
    }))
    const radius = radarExpanded ? 5000 : 500
    return withDist
      .filter(ev => ev.dist === null || ev.dist <= radius)
      .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))
  }, [events, location, radarExpanded])

  const totalCards = sorted.length + 1 // +1 радар в конце

  const goTo = (index) => {
    setCurrentIndex(Math.max(0, Math.min(index, totalCards - 1)))
  }

  // Сброс на первую карточку при смене списка
  useEffect(() => { setCurrentIndex(0) }, [events.length])

  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
    dragging.current = true
  }

  const onTouchEnd = (e) => {
    if (!dragging.current) return
    dragging.current = false
    const diff = touchStartY.current - e.changedTouches[0].clientY
    if (diff > 40) goTo(currentIndex + 1)
    else if (diff < -40) goTo(currentIndex - 1)
  }

  return (
    <div
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', background: '#0f172a' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {sorted.map((ev, i) => (
        <div key={ev.id} style={{
          position: 'absolute', inset: 0,
          transform: `translateY(${(i - currentIndex) * 100}%)`,
          transition: 'transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform',
        }}>
          <EventCard event={ev} dist={ev.dist} onViewDetails={() => onViewEvent(ev)} />
        </div>
      ))}

      {/* Радар — последняя карточка */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translateY(${(sorted.length - currentIndex) * 100}%)`,
        transition: 'transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'transform',
      }}>
        <RadarCard onExpand={() => setRadarExpanded(true)} expanded={radarExpanded} />
      </div>

      {/* Индикатор позиции */}
      {totalCards > 1 && (
        <div style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 5, zIndex: 10,
        }}>
          {Array.from({ length: totalCards }).map((_, i) => (
            <div key={i} style={{
              width: i === currentIndex ? 4 : 3,
              height: i === currentIndex ? 20 : 8,
              borderRadius: 4,
              background: i === currentIndex ? '#22d3ee' : 'rgba(255,255,255,0.3)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}
