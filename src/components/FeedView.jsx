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

// Узлы-точки на пересечениях сетки
const NODES = [
  [0,0],[60,0],[120,0],[0,60],[60,60],[120,60],[0,120],[60,120],[120,120],
  [30,30],[90,30],[30,90],[90,90],[0,30],[60,30],[0,90],[30,0],[90,0],
]

function CityBackground({ color, parallaxY = 0 }) {
  const id = color.replace('#', '')
  const svgPattern = `
    <svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
      <defs>
        <filter id='noise-${id}'>
          <feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/>
          <feColorMatrix type='saturate' values='0'/>
          <feBlend in='SourceGraphic' mode='multiply'/>
        </filter>
      </defs>
      <rect width='120' height='120' fill='${color}08'/>
      <line x1='0' y1='30' x2='120' y2='30' stroke='${color}' stroke-width='0.4' opacity='0.4'/>
      <line x1='0' y1='60' x2='120' y2='60' stroke='${color}' stroke-width='0.8' opacity='0.5'/>
      <line x1='0' y1='90' x2='120' y2='90' stroke='${color}' stroke-width='0.4' opacity='0.4'/>
      <line x1='30' y1='0' x2='30' y2='120' stroke='${color}' stroke-width='0.4' opacity='0.4'/>
      <line x1='60' y1='0' x2='60' y2='120' stroke='${color}' stroke-width='0.8' opacity='0.5'/>
      <line x1='90' y1='0' x2='90' y2='120' stroke='${color}' stroke-width='0.4' opacity='0.4'/>
      <line x1='0' y1='15' x2='45' y2='15' stroke='${color}' stroke-width='0.3' opacity='0.25'/>
      <line x1='75' y1='45' x2='120' y2='45' stroke='${color}' stroke-width='0.3' opacity='0.25'/>
      <line x1='20' y1='0' x2='20' y2='50' stroke='${color}' stroke-width='0.3' opacity='0.25'/>
      <line x1='100' y1='70' x2='100' y2='120' stroke='${color}' stroke-width='0.3' opacity='0.25'/>
      <rect width='120' height='120' filter='url(#noise-${id})' opacity='0.06'/>
    </svg>
  `
  const encoded = `url("data:image/svg+xml,${encodeURIComponent(svgPattern)}")`

  return (
    <div style={{
      position: 'absolute', inset: '-20%',
      transform: `translateY(${parallaxY}px)`,
      transition: 'transform 0.38s cubic-bezier(0.25,0.46,0.45,0.94)',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: '#0a0f1e' }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: encoded,
        backgroundSize: '120px 120px',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 30% 25%, ${color}30 0%, transparent 50%), radial-gradient(ellipse at 70% 75%, ${color}18 0%, transparent 45%)`,
      }} />

      {/* Светящиеся узлы на пересечениях */}
      <style>{`
        @keyframes node-pulse-${id} {
          0%,100% { opacity: 0; }
          50%      { opacity: 1; }
        }
      `}</style>
      {NODES.map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `calc(${(x / 120) * 100}% - 2px)`,
          top:  `calc(${(y / 120) * 100}% - 2px)`,
          width: 4, height: 4,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`,
          animation: `node-pulse-${id} ${2.5 + (i % 5) * 0.7}s ease-in-out infinite`,
          animationDelay: `${(i * 0.37) % 3}s`,
        }} />
      ))}
    </div>
  )
}

function PhotoSlider({ photos }) {
  const [idx, setIdx] = useState(0)
  const touchX = useRef(0)

  return (
    <div style={{
      position: 'relative', width: '100%',
      borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      border: '1.5px solid rgba(255,255,255,0.1)',
      aspectRatio: '4/3',
    }}
      onTouchStart={e => { touchX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        const diff = touchX.current - e.changedTouches[0].clientX
        if (diff > 40 && idx < photos.length - 1) setIdx(i => i + 1)
        else if (diff < -40 && idx > 0) setIdx(i => i - 1)
      }}
    >
      {photos.map((url, i) => (
        <img key={i} src={url} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover',
          transform: `translateX(${(i - idx) * 100}%)`,
          transition: 'transform 0.3s ease',
        }} />
      ))}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 5, zIndex: 3,
        }}>
          {photos.map((_, i) => (
            <div key={i} style={{
              width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
              background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventCard({ event, dist, onViewDetails, parallaxY }) {
  const cfg = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.chat
  const { label: timeLabel, urgency } = useCountdown(event.expires_at)
  const hasPhoto = event.photos?.length > 0

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#0a0f1e' }}>

      {/* Городская сетка с параллаксом */}
      <CityBackground color={cfg.color} parallaxY={parallaxY} />

      {/* Голограмма — иконка категории */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        <span style={{
          fontSize: 220,
          opacity: 0.13,
          filter: `drop-shadow(0 0 30px ${cfg.color}) drop-shadow(0 0 60px ${cfg.color}) drop-shadow(0 0 100px ${cfg.color}88)`,
        }}>
          {cfg.icon}
        </span>
      </div>

      {/* Фото поверх — на весь экран */}
      {hasPhoto && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
          <PhotoSlider photos={event.photos} />
        </div>
      )}

      {/* Рамка по контуру */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 4,
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.15)',
        pointerEvents: 'none',
      }} />

      {/* Затемнение снизу для текста */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 35%, transparent 45%, rgba(0,0,0,0.88) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Категория */}
      <div style={{ position: 'absolute', top: 72, left: 16, zIndex: 5 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: cfg.color, background: cfg.color + '22',
          border: `1px solid ${cfg.color}44`,
          borderRadius: 20, padding: '4px 10px',
          backdropFilter: 'blur(8px)',
        }}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {/* Инфо снизу */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5, padding: '0 16px 90px' }}>
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: '#fff',
          lineHeight: 1.3, marginBottom: 10,
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}>
          {event.title}
        </h2>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {dist !== null && (
            <span style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 20, padding: '5px 11px',
              fontSize: 12, color: '#fff', fontWeight: 600,
            }}>
              📍 {distLabel(dist)} от тебя
            </span>
          )}
          <span style={{
            background: urgency ? 'rgba(248,113,113,0.25)' : 'rgba(34,211,238,0.15)',
            border: `1px solid ${urgency ? 'rgba(248,113,113,0.4)' : 'rgba(34,211,238,0.3)'}`,
            borderRadius: 20, padding: '5px 11px',
            fontSize: 12, fontWeight: 600,
            color: urgency ? '#f87171' : '#22d3ee',
          }}>
            ⏱ {timeLabel}
          </span>
        </div>

        <button onClick={onViewDetails} style={{
          width: '100%', padding: '13px 0',
          borderRadius: 16, cursor: 'pointer',
          background: 'rgba(17,24,39,0.75)',
          border: `1.5px solid ${cfg.color}`,
          color: '#fff',
          fontSize: 14, fontWeight: 900, letterSpacing: '0.08em',
          boxShadow: `0 0 20px ${cfg.color}44`,
          textShadow: `0 0 12px ${cfg.color}`,
        }}>
          ПОДРОБНЕЕ →
        </button>
      </div>
    </div>
  )
}

const RADII = [500, 1500, 3000]
const RADIUS_LABELS = ['500 м', '1500 м', '3 км']

function RadarCard({ hasEvents, radiusIdx, onExpand, onCreateEvent }) {
  const isLast = radiusIdx >= RADII.length - 1
  const label = RADIUS_LABELS[radiusIdx]

  const title = hasEvents
    ? `В радиусе ${label} больше активных событий нет`
    : 'Активных событий не найдено'

  const sub = hasEvents
    ? isLast
      ? 'Ты посмотрел все активные события в радиусе 3 км. Создай своё!'
      : 'Хочешь поискать дальше?'
    : 'В этом районе пока тихо. Стань первым, кто оживит его!'

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'radial-gradient(ellipse at 50% 50%, rgba(34,211,238,0.07), #0f172a 70%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 28px',
    }}>
      <style>{`
        @keyframes radar-ring {
          0%   { transform: scale(0.3); opacity: 0.7; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
      <div style={{ position: 'relative', width: 110, height: 110, marginBottom: 28 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1.5px solid rgba(34,211,238,0.3)',
            animation: `radar-ring 2s ease-out infinite`,
            animationDelay: `${i * 0.55}s`,
          }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42 }}>
          {hasEvents ? '🔍' : '📡'}
        </div>
      </div>

      <p style={{ fontSize: 17, fontWeight: 900, color: '#fff', marginBottom: 8, textAlign: 'center' }}>
        {title}
      </p>
      <p style={{ fontSize: 13, color: 'var(--hint)', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
        {sub}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        {!isLast && (
          <button onClick={onExpand} style={{
            width: '100%', padding: '13px 0', borderRadius: 16,
            border: '1.5px solid rgba(34,211,238,0.4)',
            background: 'rgba(34,211,238,0.1)', color: '#22d3ee',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            🔍 Расширить до {RADIUS_LABELS[radiusIdx + 1]}
          </button>
        )}
        <button onClick={onCreateEvent} style={{
          width: '100%', padding: '13px 0', borderRadius: 16,
          border: 'none', background: 'var(--accent)', color: '#111827',
          fontSize: 13, fontWeight: 800, cursor: 'pointer',
        }}>
          ✨ Создать событие первым
        </button>
      </div>
    </div>
  )
}

export default function FeedView({ events, location, onViewEvent, onCreateEvent }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [radiusIdx, setRadiusIdx] = useState(0)
  const touchStartY = useRef(0)
  const dragging = useRef(false)

  const sorted = useMemo(() => {
    const radius = RADII[radiusIdx]
    return events
      .map(ev => ({ ...ev, dist: location ? distM(location.lat, location.lon, ev.lat, ev.lon) : null }))
      .filter(ev => ev.dist === null || ev.dist <= radius)
      .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))
  }, [events, location, radiusIdx])

  const totalCards = sorted.length + 1

  const goTo = (index) => setCurrentIndex(Math.max(0, Math.min(index, totalCards - 1)))


  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; dragging.current = true }
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
          <EventCard
            event={ev} dist={ev.dist}
            onViewDetails={() => onViewEvent(ev)}
            parallaxY={(i - currentIndex) * -40}
          />
        </div>
      ))}

      <div style={{
        position: 'absolute', inset: 0,
        transform: `translateY(${(sorted.length - currentIndex) * 100}%)`,
        transition: 'transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'transform',
      }}>
        <RadarCard
          hasEvents={sorted.length > 0}
          radiusIdx={radiusIdx}
          onExpand={() => setRadiusIdx(i => Math.min(i + 1, RADII.length - 1))}
          onCreateEvent={onCreateEvent}
        />
      </div>

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
