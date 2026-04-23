import { useState, useMemo } from 'react'
import { CATEGORY_CONFIG } from './MapComponent'

const RADII = [500, 1000, 2000, 5000]
const RADIUS_LABELS = ['500 м', '1 км', '2 км', '5 км']

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

export default function RadarScan({ location, events, onViewEvent, onCreateEvent, onClose }) {
  const [radiusIdx, setRadiusIdx] = useState(0)
  const radius = RADII[radiusIdx]

  const nearbyEvents = useMemo(() => {
    if (!location) return []
    return events
      .map(ev => ({ ...ev, dist: distM(location.lat, location.lon, ev.lat, ev.lon) }))
      .filter(ev => ev.dist <= radius)
      .sort((a, b) => a.dist - b.dist)
  }, [location, events, radius])

  const nearest = nearbyEvents[0] ?? null
  const cfg = nearest ? (CATEGORY_CONFIG[nearest.category] ?? CATEGORY_CONFIG.chat) : null

  return (
    <>
      {/* Фон-закрывалка */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 34 }} onClick={onClose} />

      {/* Карточка */}
      <div style={{
        position: 'absolute', bottom: 90, left: 16, right: 16, zIndex: 35,
        background: 'rgba(17,24,39,0.98)',
        border: '1.5px solid rgba(34,211,238,0.3)',
        borderRadius: 24, padding: '20px 18px 16px',
        boxShadow: '0 -4px 48px rgba(0,0,0,0.7), 0 0 30px rgba(34,211,238,0.08)',
        backdropFilter: 'blur(24px)',
      }}>

        {/* Заголовок */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: 'var(--accent)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            📡 Поиск в радиусе {RADIUS_LABELS[radiusIdx]}
          </p>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '4px 10px', fontSize: 12,
            color: 'var(--hint)', cursor: 'pointer',
          }}>✕</button>
        </div>

        {nearest ? (
          /* ─── Нашли событие ─── */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <span style={{
                fontSize: 28, flexShrink: 0,
                background: cfg.color + '22', border: `1px solid ${cfg.color}44`,
                borderRadius: 14, padding: '8px 11px',
              }}>{cfg.icon}</span>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  {nearest.title}
                </p>
                <p style={{ fontSize: 13, color: 'var(--hint)' }}>
                  📍 {distLabel(nearest.dist)} от тебя
                </p>
              </div>
            </div>

            {nearbyEvents.length > 1 && (
              <p style={{ fontSize: 12, color: 'var(--hint)', marginBottom: 12 }}>
                Ещё {nearbyEvents.length - 1} событий в этом радиусе
              </p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: '12px 0', borderRadius: 14, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: 'rgba(255,255,255,0.06)', color: 'var(--hint)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>Закрыть</button>
              <button onClick={() => { onViewEvent(nearest); onClose() }} style={{
                flex: 2, padding: '12px 0', borderRadius: 14, cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: 'var(--accent)', color: '#111827', border: 'none',
              }}>Посмотреть →</button>
            </div>
          </>
        ) : (
          /* ─── Событий нет ─── */
          <>
            <div style={{ textAlign: 'center', padding: '4px 0 16px' }}>
              <p style={{ fontSize: 36, marginBottom: 10 }}>📡</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                В радиусе {RADIUS_LABELS[radiusIdx]} тихо
              </p>
              <p style={{ fontSize: 13, color: 'var(--hint)', lineHeight: 1.5 }}>
                {radiusIdx < RADII.length - 1
                  ? 'Хочешь поискать дальше?'
                  : 'В радиусе 5 км событий нет'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {radiusIdx < RADII.length - 1 && (
                <button onClick={() => setRadiusIdx(i => i + 1)} style={{
                  width: '100%', padding: '13px 0', borderRadius: 14, cursor: 'pointer',
                  fontSize: 13, fontWeight: 700,
                  background: 'rgba(34,211,238,0.12)', color: 'var(--accent)',
                  border: '1px solid rgba(34,211,238,0.3)',
                }}>
                  🔍 Расширить до {RADIUS_LABELS[radiusIdx + 1]}
                </button>
              )}

              <button onClick={() => { onCreateEvent(); onClose() }} style={{
                width: '100%', padding: '13px 0', borderRadius: 14, cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: 'var(--accent)', color: '#111827', border: 'none',
              }}>
                ✨ Создать событие первым
              </button>

              <button onClick={onClose} style={{
                width: '100%', padding: '11px 0', borderRadius: 14, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: 'rgba(255,255,255,0.04)', color: 'var(--hint)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                Закрыть
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
