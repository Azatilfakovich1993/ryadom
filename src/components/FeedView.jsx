import { useEffect, useRef, useState } from 'react'
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

      {/* Фон — фото или градиент */}
      {hasPhoto ? (
        <img
          src={event.photos[0]}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse at 25% 35%, ${cfg.color}55 0%, transparent 55%),
            radial-gradient(ellipse at 75% 65%, ${cfg.color}33 0%, transparent 55%),
            radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.8), transparent 60%),
            #0f172a
          `,
        }} />
      )}

      {/* Тёмный оверлей снизу */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 35%, transparent 45%, rgba(0,0,0,0.85) 100%)',
      }} />

      {/* Категория сверху */}
      <div style={{
        position: 'absolute', top: 68, left: 16,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: cfg.color,
          background: cfg.color + '22',
          border: `1px solid ${cfg.color}44`,
          borderRadius: 20, padding: '4px 12px',
        }}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {/* Инфо снизу */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 28px' }}>

        <h2 style={{
          fontSize: 26, fontWeight: 900, color: '#fff',
          lineHeight: 1.2, marginBottom: 14,
          textShadow: '0 2px 12px rgba(0,0,0,0.5)',
        }}>
          {event.title}
        </h2>

        {/* Бейджи */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {dist !== null && (
            <span style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              borderRadius: 20, padding: '6px 14px',
              fontSize: 13, color: '#fff', fontWeight: 600,
            }}>
              📍 {distLabel(dist)} от тебя
            </span>
          )}
          <span style={{
            background: urgency ? 'rgba(248,113,113,0.25)' : 'rgba(34,211,238,0.15)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${urgency ? 'rgba(248,113,113,0.4)' : 'rgba(34,211,238,0.3)'}`,
            borderRadius: 20, padding: '6px 14px',
            fontSize: 13, fontWeight: 600,
            color: urgency ? '#f87171' : '#22d3ee',
          }}>
            ⏱ {timeLabel}
          </span>
        </div>

        {/* Кнопка */}
        <button
          onClick={onViewDetails}
          style={{
            width: '100%', padding: '16px 0',
            borderRadius: 18, border: 'none', cursor: 'pointer',
            background: cfg.color,
            color: '#111827',
            fontSize: 15, fontWeight: 900,
            letterSpacing: '0.06em',
            boxShadow: `0 4px 24px ${cfg.color}66`,
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
      {/* Анимированные кольца */}
      <div style={{ position: 'relative', width: 160, height: 160, marginBottom: 32 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            border: '1.5px solid rgba(34,211,238,0.3)',
            animation: `radar-ring ${1.5 + i * 0.5}s ease-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 52,
        }}>
          📡
        </div>
      </div>

      <style>{`
        @keyframes radar-ring {
          0%   { transform: scale(0.3); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>

      <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 10, textAlign: 'center' }}>
        {expanded ? 'В радиусе 5 км тихо' : 'Рядом пока тихо'}
      </p>
      <p style={{ fontSize: 14, color: 'var(--hint)', textAlign: 'center', lineHeight: 1.6, marginBottom: 28 }}>
        {expanded
          ? 'Событий не найдено. Будь первым!'
          : 'Событий в 500м нет. Расширить поиск до 5 км?'}
      </p>

      {!expanded && (
        <button
          onClick={onExpand}
          style={{
            padding: '16px 32px', borderRadius: 18, border: '1.5px solid rgba(34,211,238,0.4)',
            background: 'rgba(34,211,238,0.1)', color: '#22d3ee',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            marginBottom: 12,
          }}
        >
          🔍 Расширить до 5 км
        </button>
      )}
    </div>
  )
}

export default function FeedView({ events, location, onViewEvent }) {
  const [radarExpanded, setRadarExpanded] = useState(false)

  const NEAR_RADIUS = 500
  const FAR_RADIUS  = 5000

  const withDist = events.map(ev => ({
    ...ev,
    dist: location ? distM(location.lat, location.lon, ev.lat, ev.lon) : null,
  }))

  const radius = radarExpanded ? FAR_RADIUS : NEAR_RADIUS
  const nearby = withDist
    .filter(ev => ev.dist === null || ev.dist <= radius)
    .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0))

  const showRadar = nearby.length === 0 || radarExpanded

  return (
    <div style={{
      width: '100%', height: '100%',
      overflowY: 'scroll',
      scrollSnapType: 'y mandatory',
      WebkitOverflowScrolling: 'touch',
    }}>
      {nearby.map(ev => (
        <div key={ev.id} style={{ width: '100%', height: '100%', scrollSnapAlign: 'start', flexShrink: 0 }}>
          <EventCard event={ev} dist={ev.dist} onViewDetails={() => onViewEvent(ev)} />
        </div>
      ))}

      {/* Карточка радара — всегда в конце */}
      <div style={{ width: '100%', height: '100%', scrollSnapAlign: 'start', flexShrink: 0 }}>
        <RadarCard
          onExpand={() => setRadarExpanded(true)}
          expanded={showRadar && radarExpanded}
        />
      </div>
    </div>
  )
}
