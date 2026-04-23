import { useEffect, useRef, useState } from 'react'

export const CATEGORY_CONFIG = {
  sport: { color: '#3b82f6', icon: '⚽', label: 'Спорт' },
  food:  { color: '#f59e0b', icon: '🍽️', label: 'Еда'   },
  chat:  { color: '#10b981', icon: '💬', label: 'Общение'},
  help:  { color: '#f43f5e', icon: '🆘', label: 'Помощь' },
}

function calcProgress(event) {
  const total = new Date(event.expires_at) - new Date(event.created_at)
  const left  = new Date(event.expires_at) - Date.now()
  if (total <= 0) return 0
  return Math.max(0, Math.min(1, left / total))
}

function spreadOverlapping(events) {
  const groups = {}
  events.forEach(ev => {
    const key = `${parseFloat(ev.lat).toFixed(5)},${parseFloat(ev.lon).toFixed(5)}`
    if (!groups[key]) groups[key] = []
    groups[key].push(ev.id)
  })
  return events.map(ev => {
    const key = `${parseFloat(ev.lat).toFixed(5)},${parseFloat(ev.lon).toFixed(5)}`
    const ids = groups[key]
    if (ids.length === 1) return ev
    const idx   = ids.indexOf(ev.id)
    const angle = (2 * Math.PI * idx) / ids.length - Math.PI / 2
    const d = 20
    const dLat = (d / 111320) * Math.cos(angle)
    const dLon = (d / (111320 * Math.cos(ev.lat * Math.PI / 180))) * Math.sin(angle)
    return { ...ev, lat: ev.lat + dLat, lon: ev.lon + dLon }
  })
}

const PIN_STYLES = `
  .rp-wrap {
    position:relative; width:48px; height:64px; cursor:pointer;
    transform: translate(-24px, -62px);
  }
  .rp-pin { position:absolute; top:0; left:0; overflow:visible; }
`

function injectStyles() {
  if (document.getElementById('ryadom-pin-css')) return
  const s = document.createElement('style')
  s.id = 'ryadom-pin-css'
  s.textContent = PIN_STYLES
  document.head.appendChild(s)
}

// SVG иконка «Я» как data-URL — самый надёжный способ для ymaps Placemark
const YA_ICON_SVG = encodeURIComponent(
  `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">` +
  `<circle cx="16" cy="16" r="14" fill="#111827" stroke="#22d3ee" stroke-width="3"/>` +
  `<text x="16" y="21" text-anchor="middle" font-size="14" font-weight="900" ` +
  `fill="white" font-family="system-ui,sans-serif">Я</text></svg>`
)
const YA_ICON_URL = `data:image/svg+xml,${YA_ICON_SVG}`

function makePinLayout(ymaps) {
  return ymaps.templateLayoutFactory.createClass(`
    <div class="rp-wrap">
      <svg class="rp-pin" width="48" height="64" viewBox="0 0 48 64">
        <defs>
          <radialGradient id="rp-glow-{{ properties.uid }}" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stop-color="{{ properties.color }}" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="{{ properties.color }}" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="24" cy="62" rx="7" ry="2.5" fill="rgba(0,0,0,0.18)"/>
        <filter id="rp-gf-{{ properties.uid }}" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <path d="M24 2 C12 2 3 11 3 23 C3 36 24 60 24 60 C24 60 45 36 45 23 C45 11 36 2 24 2 Z"
              fill="{{ properties.color }}" opacity="0.18" filter="url(#rp-gf-{{ properties.uid }})"
              transform="scale(1.15) translate(-3.1, -3)"/>
        <path d="M24 2 C12 2 3 11 3 23 C3 36 24 60 24 60 C24 60 45 36 45 23 C45 11 36 2 24 2 Z"
              fill="#111827" stroke="{{ properties.color }}" stroke-width="2.5"/>
        <path d="M24 2 C12 2 3 11 3 23 C3 36 24 60 24 60 C24 60 45 36 45 23 C45 11 36 2 24 2 Z"
              fill="url(#rp-glow-{{ properties.uid }})"/>
        <text x="24" y="25" font-size="17"
              text-anchor="middle" dominant-baseline="middle"
              style="user-select:none;pointer-events:none">{{ properties.icon }}</text>
        <circle cx="24" cy="23" r="19" fill="none"
                stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
        <circle cx="24" cy="23" r="19" fill="none"
                stroke="{{ properties.ringColor }}" stroke-width="2"
                stroke-linecap="round"
                stroke-dasharray="{{ properties.dash }} {{ properties.gap }}"
                transform="rotate(-90 24 23)"/>
      </svg>
    </div>
  `, {
    build: function () {
      this.constructor.superclass.build.call(this)
      const el = this.getParentElement().querySelector('.rp-wrap')
      if (!el) return
      this._stop = (e) => e.stopPropagation()
      el.addEventListener('mousedown',  this._stop)
      el.addEventListener('touchstart', this._stop, { passive: false })
    },
    clear: function () {
      const el = this.getParentElement().querySelector('.rp-wrap')
      if (el && this._stop) {
        el.removeEventListener('mousedown',  this._stop)
        el.removeEventListener('touchstart', this._stop)
      }
      this.constructor.superclass.clear.call(this)
    },
    getShape: function () {
      return new ymaps.shape.Rectangle(
        new ymaps.geometry.pixel.Rectangle([[-24, -62], [24, 2]])
      )
    },
  })
}

export default function MapComponent({ events, onEventClick, userLocation, radarActive, onRadarDone }) {
  const containerRef   = useRef(null)
  const mapRef         = useRef(null)
  const marksRef       = useRef([])
  const pinLayoutRef   = useRef(null)
  const userMarkRef    = useRef(null)
  const radarCleanRef  = useRef(null)
  const userLocRef     = useRef(userLocation)
  const [mapReady, setMapReady] = useState(false)
  const [tick, setTick]         = useState(0)

  useEffect(() => { userLocRef.current = userLocation }, [userLocation])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Инициализация карты ─────────────────────────────────────
  // containerRef всегда в DOM (спиннер — оверлей), поэтому polling всегда найдёт контейнер
  useEffect(() => {
    const init = () => {
      if (!window.ymaps || !containerRef.current || mapRef.current) return false
      window.ymaps.ready(() => {
        if (mapRef.current) return
        injectStyles()
        pinLayoutRef.current = makePinLayout(window.ymaps)
        const loc = userLocRef.current
        const center = loc ? [loc.lat, loc.lon] : [55.7558, 37.6176]
        mapRef.current = new window.ymaps.Map(containerRef.current, {
          center, zoom: 15,
          controls: ['zoomControl'],
          behaviors: ['drag', 'scrollZoom', 'multiTouch'],
        })
        window._ryadomMap = mapRef.current
        setMapReady(true)
      })
      return true
    }
    // Polling — пробуем каждые 200 мс пока ymaps не загрузится
    const iv = setInterval(() => { if (init()) clearInterval(iv) }, 200)
    init() // сразу первая попытка
    return () => clearInterval(iv)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Центрирование + маркер «Я» ──────────────────────────────
  useEffect(() => {
    if (!mapReady || !userLocation || !mapRef.current) return

    // Перемещаем камеру на пользователя
    mapRef.current.setCenter([userLocation.lat, userLocation.lon], 15, { duration: 700 })

    // Маркер «Я» через SVG data-URL — работает без templateLayoutFactory
    if (userMarkRef.current) {
      mapRef.current.geoObjects.remove(userMarkRef.current)
    }
    const mark = new window.ymaps.Placemark(
      [userLocation.lat, userLocation.lon],
      {},
      {
        iconLayout: 'default#image',
        iconImageHref: YA_ICON_URL,
        iconImageSize: [32, 32],
        iconImageOffset: [-16, -16],
      }
    )
    mapRef.current.geoObjects.add(mark)
    userMarkRef.current = mark
  }, [mapReady, userLocation])

  // ── Радар-волны на карте (ymaps.Circle 0→500 м) ─────────────
  useEffect(() => {
    if (!mapReady || !userLocation || !radarActive || !mapRef.current) return

    let stopped = false
    const circles = []
    const NUM    = 4
    const MAX_R  = 500
    const PERIOD = 1600
    const TOTAL  = 4500

    for (let i = 0; i < NUM; i++) {
      const c = new window.ymaps.Circle(
        [[userLocation.lat, userLocation.lon], 5],
        {},
        {
          fillColor: 'rgba(34,211,238,0.03)',
          strokeColor: 'rgba(34,211,238,0.9)',
          strokeWidth: 3,
          interactivityModel: 'default#transparent',
          zIndex: 500,
        }
      )
      mapRef.current.geoObjects.add(c)
      circles.push({ circle: c, phase: i / NUM })
    }

    const start = Date.now()
    const ticker = setInterval(() => {
      const elapsed = Date.now() - start
      if (elapsed >= TOTAL || stopped) {
        clearInterval(ticker)
        circles.forEach(({ circle }) => {
          try { mapRef.current?.geoObjects.remove(circle) } catch (_) {}
        })
        if (!stopped) onRadarDone?.()
        return
      }
      circles.forEach(({ circle, phase }) => {
        const t = ((elapsed / PERIOD) + phase) % 1
        const r = Math.max(5, t * MAX_R)
        const alpha = (1 - t) * 0.85
        try {
          circle.geometry.setRadius(r)
          circle.options.set('strokeColor', `rgba(34,211,238,${alpha.toFixed(2)})`)
          circle.options.set('strokeWidth', 1 + (1 - t) * 3)
        } catch (_) {}
      })
    }, 100)

    radarCleanRef.current = () => {
      stopped = true
      clearInterval(ticker)
      circles.forEach(({ circle }) => {
        try { mapRef.current?.geoObjects.remove(circle) } catch (_) {}
      })
    }
    return () => {
      if (radarCleanRef.current) { radarCleanRef.current(); radarCleanRef.current = null }
    }
  }, [mapReady, radarActive, userLocation]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Маркеры событий ─────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !pinLayoutRef.current || !mapRef.current) return
    marksRef.current.forEach(p => {
      try { mapRef.current.geoObjects.remove(p) } catch (_) {}
    })
    marksRef.current = []

    const spread = spreadOverlapping(events)
    const R = 19, circum = 2 * Math.PI * R

    spread.forEach((event, i) => {
      const cfg      = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.chat
      const progress = calcProgress(event)
      const dash     = (circum * progress).toFixed(2)
      const gap      = (circum * (1 - progress)).toFixed(2)
      const ringColor = progress > 0.5 ? '#34d399' : progress > 0.25 ? '#fbbf24' : '#f87171'

      const pm = new window.ymaps.Placemark(
        [event.lat, event.lon],
        { color: cfg.color, icon: cfg.icon, uid: event.id.replace(/-/g, '').slice(0, 8), dash, gap, ringColor },
        { iconLayout: pinLayoutRef.current }
      )
      pm.events.add('click', () => onEventClick(events[i]))
      mapRef.current.geoObjects.add(pm)
      marksRef.current.push(pm)
    })
  }, [mapReady, events, onEventClick, tick])

  const handleLocateMe = () => {
    if (!mapRef.current || !userLocRef.current) return
    const { lat, lon } = userLocRef.current
    mapRef.current.setCenter([lat, lon], 15, { duration: 600 })
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Контейнер карты ВСЕГДА в DOM — иначе containerRef будет null при инициализации */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Спиннер поверх карты пока она грузится */}
      {!mapReady && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg)',
        }}>
          <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-3"
               style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--hint)' }}>Загрузка карты…</p>
        </div>
      )}

      {/* Кнопка «Найти меня» */}
      {mapReady && userLocation && (
        <button
          onClick={handleLocateMe}
          style={{
            position: 'absolute', bottom: 100, right: 12, zIndex: 10,
            width: 40, height: 40,
            borderRadius: 12,
            background: 'rgba(17,24,39,0.95)',
            border: '1.5px solid rgba(34,211,238,0.5)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4), 0 0 10px rgba(34,211,238,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" strokeOpacity="0.3"/>
          </svg>
        </button>
      )}

    </div>
  )
}
