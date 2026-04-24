import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import MapComponent from './components/MapComponent'
import FeedView from './components/FeedView'
import BottomSheet from './components/BottomSheet'
import ClusterSheet from './components/ClusterSheet'
import CreateEventForm from './components/CreateEventForm'
import PremiumModal from './components/PremiumModal'
import AuthModal from './components/AuthModal'
import { LogoIcon } from './components/Logo'
import ProfileSheet from './components/ProfileSheet'
import WelcomeScreen from './components/WelcomeScreen'
import AchievementToast from './components/AchievementToast'
import RadarScan from './components/RadarScan'
import GeoPrompt from './components/GeoPrompt'
import OnboardingScreen from './components/OnboardingScreen'
import AdminPanel from './components/AdminPanel'
import { useTelegram } from './hooks/useTelegram'
import { useGeolocation } from './hooks/useGeolocation'
import { supabase, fetchNearbyEvents, createEvent, getProfile, uploadEventVideo, updateEventVideo } from './lib/supabase'
import { tryUnlock } from './utils/achievements'
import { CATEGORY_CONFIG } from './components/MapComponent'

const RADIUS_M = 15000

function EventsPeek({ events, location, onSelect }) {
  const [open, setOpen] = useState(false)

  const sorted = useMemo(() => {
    if (!location) return events
    return [...events].sort((a, b) => {
      const da = Math.hypot(a.lat - location.lat, a.lon - location.lon)
      const db = Math.hypot(b.lat - location.lat, b.lon - location.lon)
      return da - db
    })
  }, [events, location])

  const active = sorted.filter(e => new Date(e.expires_at) > new Date())

  return (
    <div className="absolute left-0 right-0 z-10 transition-all duration-300"
         style={{ bottom: open ? 0 : -4, maxHeight: open ? '55vh' : 'auto' }}>

      {/* Handle */}
      <button onClick={() => setOpen(v => !v)}
              className="w-full flex flex-col items-center pt-2 pb-1"
              style={{
                background: 'rgba(17,24,39,0.88)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid var(--border)',
                borderRadius: open ? 0 : '16px 16px 0 0',
              }}>
        <div className="w-9 h-[3px] rounded-full mb-1" style={{ background: 'var(--bg-3)' }} />
        <p className="text-[10px] font-bold" style={{ color: 'var(--hint)' }}>
          {open ? '▼ скрыть' : `▲ ${active.length} активных события рядом`}
        </p>
      </button>

      {/* List */}
      {open && (
        <div className="overflow-y-auto pb-4 px-3 flex flex-col gap-2"
             style={{
               maxHeight: 'calc(55vh - 44px)',
               background: 'rgba(17,24,39,0.95)',
               backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
             }}>
          {active.map(ev => {
            const cfg = CATEGORY_CONFIG[ev.category] ?? CATEGORY_CONFIG.chat
            const remaining = Math.max(0, new Date(ev.expires_at) - Date.now())
            const mins = Math.floor(remaining / 60000)
            const timeLabel = mins >= 60 ? `${Math.floor(mins/60)}ч ${mins%60}м` : `${mins}м`
            return (
              <button key={ev.id} onClick={() => { setOpen(false); onSelect(ev) }}
                      className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition active:scale-95"
                      style={{ background: 'var(--bg-2)', border: `1px solid ${cfg.color}33` }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ background: cfg.color + '22' }}>
                  {cfg.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{ev.title}</p>
                  <p className="text-[10px]" style={{ color: cfg.color }}>⏱ {timeLabel}</p>
                </div>
                <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--hint)' }}
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function distanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

const CHIPS = [
  { key: 'sport', icon: '⚽', label: 'Спорт',   color: '#3b82f6' },
  { key: 'food',  icon: '🍕', label: 'Еда',     color: '#f59e0b' },
  { key: 'chat',  icon: '💬', label: 'Общение', color: '#10b981' },
  { key: 'help',  icon: '🆘', label: 'Помощь',  color: '#f43f5e' },
]

export default function App() {
  const { tg, user, haptic } = useTelegram()
  const { location, loading: locLoading, denied: geoDenied, refetch: geoRefetch } = useGeolocation(tg)

  const [events, setEvents]             = useState(() => {
    try { return JSON.parse(localStorage.getItem('ryadom_events') || '[]') } catch { return [] }
  })
  const [activeFilter, setActiveFilter] = useState(null) // null = все категории
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [clusterEvents, setClusterEvents] = useState(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [showPremium, setShowPremium]   = useState(false)
  const [showAuth, setShowAuth]         = useState(false)
  const [showProfile, setShowProfile]   = useState(false)
  const [authUser, setAuthUser]         = useState(null)
  const [profile, setProfile]           = useState(() => {
    try { return JSON.parse(localStorage.getItem('ryadom_profile') || 'null') } catch { return null }
  })
  const [authChecked, setAuthChecked]   = useState(false)
  const [skippedWelcome, setSkippedWelcome] = useState(false)
  const [creating, setCreating]         = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [connected, setConnected]       = useState(false)
  const [toast, setToast]               = useState(null)
  const [achievement, setAchievement]   = useState(null)
  const [logoTaps, setLogoTaps]         = useState(0)
  const [showFirstVisit, setShowFirstVisit] = useState(() => !localStorage.getItem('ryadom_visited'))
  const [showCreateHint, setShowCreateHint] = useState(false)
  const [radarActive, setRadarActive]       = useState(false)
  const [showRadarCard, setShowRadarCard]   = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [mode, setMode]                     = useState('map') // 'map' | 'feed'
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('ryadom_onboarded'))
  const [showAdmin, setShowAdmin]           = useState(false)
  const [announcement, setAnnouncement]     = useState(null)
  const radarShown                          = useRef(false)

  // ── Announcements ─────────────────────────────────────────
  useEffect(() => {
    const loadAnnouncement = async () => {
      const uid = authUser?.id ?? null
      const { data } = await supabase.from('announcements').select('*')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10)
      const relevant = (data ?? []).find(a => !a.target_user_id || a.target_user_id === uid)
      if (relevant) setAnnouncement(relevant)
    }
    loadAnnouncement()
  }, [authUser])

  // ── Auth state ────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user)
        getProfile(session.user.id).then(p => { if (p) { setProfile(p); localStorage.setItem('ryadom_profile', JSON.stringify(p)) } })
      }
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setAuthUser(session.user)
        getProfile(session.user.id).then(p => { if (p) { setProfile(p); localStorage.setItem('ryadom_profile', JSON.stringify(p)) } })
      } else {
        setAuthUser(null)
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const locationRef  = useRef(location)
  const channelRef   = useRef(null)
  const toastTimer   = useRef(null)
  const logoTapTimer = useRef(null)
  useEffect(() => { locationRef.current = location }, [location])

  // showToast объявляем первым — на него ссылаются все хелперы ниже
  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  // ── Achievement helper ────────────────────────────────────
  const showAchievement = useCallback((id) => {
    if (tryUnlock(id)) setAchievement(id)
  }, [])

  // ── Logo taps easter egg (5 раз) ─────────────────────────
  const handleLogoTap = useCallback(() => {
    setLogoTaps(prev => {
      const next = prev + 1
      clearTimeout(logoTapTimer.current)
      if (next >= 5) {
        showAchievement('logo_secret')
        showToast('👾 Пасхалка найдена! Мы знали, что найдёшь', 'info')
        return 0
      }
      logoTapTimer.current = setTimeout(() => setLogoTaps(0), 2500)
      return next
    })
  }, [showAchievement, showToast])

  // ── Время суток ───────────────────────────────────────────
  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 0 && h < 4) {
      setTimeout(() => {
        showToast('Не спится? 🌙 Кто-то должен следить за районом', 'info')
        showAchievement('night_owl')
      }, 2000)
    } else if (h >= 5 && h < 7) {
      setTimeout(() => {
        showToast('Раннее утро ☀️ Самое живое время', 'info')
        showAchievement('early_bird')
      }, 2000)
    }
  }, []) // eslint-disable-line

  // ── Первый визит (tooltip) ────────────────────────────────
  useEffect(() => {
    if (!showFirstVisit) return
    const t = setTimeout(() => {
      setShowFirstVisit(false)
      localStorage.setItem('ryadom_visited', '1')
    }, 6000)
    return () => clearTimeout(t)
  }, [showFirstVisit])

  // ── Подсказка «долго не создавал» ────────────────────────
  useEffect(() => {
    if (!authUser) return
    const last = localStorage.getItem('ryadom_last_event')
    if (last && Date.now() - parseInt(last) > 12 * 60 * 60 * 1000) {
      setShowCreateHint(true)
    }
  }, [authUser])

  // ── Радар при старте: волны на карте → карточка результата ──
  const handleRadarDone = useCallback(() => {
    setRadarActive(false)
    setShowRadarCard(true)
  }, [])

  useEffect(() => {
    if (!location || !authChecked) return
    if (radarShown.current) return
    radarShown.current = true
    const t = setTimeout(() => setRadarActive(true), 1200)
    return () => clearTimeout(t)
  }, [location, authChecked])

  // ── Initial load ─────────────────────────────────────────
  const loadEvents = useCallback(async () => {
    if (!location) return
    setLoadingEvents(true)
    try {
      const data = await Promise.race([
        fetchNearbyEvents(location.lat, location.lon, RADIUS_M),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
      ])
      if (data.length > 0) {
        setEvents(data)
        localStorage.setItem('ryadom_events', JSON.stringify(data))
      }
    } catch (e) {
      console.warn('loadEvents:', e.message)
    } finally {
      setLoadingEvents(false)
    }
  }, [location])

  useEffect(() => { loadEvents() }, [loadEvents])

  // Realtime отключён — WebSocket заблокирован провайдерами РФ, вызывает тормоза

  // ── Auto-expire ───────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setEvents(prev => prev.filter(e => new Date(e.expires_at) > new Date()))
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  // ── Handlers ─────────────────────────────────────────────
  const handleEventClick = useCallback((event) => {
    haptic('impact', 'light')
    setSelectedEvent(event)
  }, [haptic])

  const handleCreateSubmit = async ({ title, category, durationHours, lat, lon, photos, video, chatEnabled, useBusinessPin }) => {
    if (profile?.is_banned) {
      showToast('Ваш аккаунт заблокирован', 'error')
      return
    }
    if (lat == null || lon == null) {
      showToast('Не удалось определить координаты', 'error')
      return
    }
    setCreating(true)
    try {
      if (!authUser) {
        showToast('Войдите в аккаунт чтобы создавать события', 'error')
        setCreating(false)
        return
      }
      const uid = authUser.id
      const event = await Promise.race([
        createEvent({ title, category, lat, lon, durationHours, creatorId: uid, chatEnabled, photos: photos ?? [], creatorIsBusiness: !!useBusinessPin }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Превышено время ожидания. Попробуй ещё раз.')), 15000)),
      ])
      haptic('notification', 'success')
      setShowCreate(false)
      showToast('Событие опубликовано!')
      localStorage.setItem('ryadom_last_event', Date.now().toString())
      setShowCreateHint(false)
      showAchievement('first_spark')
      const cnt = (profile?.events_count ?? 0) + 1
      if (cnt >= 3)  showAchievement('activist')
      if (cnt >= 10) showAchievement('legend')
      if (video) {
        try {
          const videoUrl = await uploadEventVideo(video, event.id)
          await updateEventVideo(event.id, videoUrl)
          event.video_url = videoUrl
        } catch (e) { console.warn('video upload failed:', e) }
      }
      setEvents(prev => prev.find(e => e.id === event.id) ? prev : [event, ...prev])
      loadEvents()
    } catch (err) {
      console.error('createEvent failed:', err)
      showToast('Ошибка: ' + (err.message ?? JSON.stringify(err)), 'error')
    } finally {
      setCreating(false)
    }
  }

  const plural = (n) => n === 1 ? 'событие' : n < 5 ? 'события' : 'событий'
  const visibleEvents = activeFilter ? events.filter(e => e.category === activeFilter) : events

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Map */}
      <div className="absolute inset-0" style={{ display: mode === 'map' ? 'block' : 'none' }}>
        <MapComponent
          events={visibleEvents}
          onEventClick={handleEventClick}
          userLocation={location}
          radarActive={radarActive}
          onRadarDone={handleRadarDone}
        />
      </div>

      {/* Feed */}
      {mode === 'feed' && (
        <div className="absolute inset-0" style={{ top: 0 }}>
          <FeedView
            events={visibleEvents}
            location={location}
            onViewEvent={(ev) => { setMode('map'); handleEventClick(ev) }}
            onCreateEvent={() => setShowCreate(true)}
          />
        </div>
      )}

      {/* Карточка результата радара */}
      {showRadarCard && (
        <RadarScan
          location={location}
          events={events}
          onViewEvent={handleEventClick}
          onCreateEvent={() => setShowCreate(true)}
          onClose={() => setShowRadarCard(false)}
        />
      )}

      {/* Top bar — единая панель */}
      {mode === 'map' && (
        <div className="absolute top-0 left-0 right-0 z-20 px-3 pt-3 pb-2">
          {/* Строка 1: лого / переключатель / профиль */}
          <div className="flex items-center gap-2 mb-2">
            {/* Лого */}
            <div className="flex items-center gap-1.5 rounded-2xl px-3 py-2 flex-shrink-0"
                 onClick={handleLogoTap}
                 style={{
                   background: 'rgba(17,24,39,0.93)',
                   border: '1px solid rgba(255,255,255,0.08)',
                   boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                   cursor: 'pointer',
                 }}>
              <LogoIcon size={18} />
              <span className="font-bold text-xs tracking-wide" style={{ color: 'var(--accent)' }}>RYADOM</span>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--success)', boxShadow: '0 0 5px #34d399' }} />
            </div>

            <div className="flex-1" />

            {/* Переключатель Лента / Карта */}
            <div style={{
              display: 'flex', borderRadius: 14, padding: 3, flexShrink: 0,
              background: 'rgba(17,24,39,0.93)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}>
              {[{ key: 'feed', label: '▤ Лента' }, { key: 'map', label: '🗺 Карта' }].map(m => (
                <button key={m.key} onClick={() => setMode(m.key)}
                        style={{
                          padding: '6px 12px', borderRadius: 11,
                          fontSize: 12, fontWeight: 700,
                          border: 'none', cursor: 'pointer',
                          background: mode === m.key ? 'var(--accent)' : 'transparent',
                          color: mode === m.key ? '#111827' : 'var(--hint)',
                          transition: 'all 0.2s',
                        }}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Профиль */}
            <button onClick={() => authUser ? setShowProfile(true) : setShowAuth(true)}
                    className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden transition active:scale-90"
                    style={{
                      background: 'rgba(17,24,39,0.93)',
                      border: authUser ? '1.5px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: authUser ? '0 0 10px var(--accent-glow)' : '0 2px 12px rgba(0,0,0,0.3)',
                    }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                : <span style={{ color: authUser ? 'var(--accent)' : 'var(--hint)', fontSize: 16 }}>👤</span>
              }
            </button>
          </div>

          {/* Строка 2: фильтры + обновить */}
          <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {CHIPS.map(c => {
              const active = activeFilter === c.key
              return (
                <button key={c.key}
                        onClick={() => { haptic('impact', 'light'); setActiveFilter(active ? null : c.key) }}
                        className="flex items-center gap-1.5 flex-shrink-0 transition active:scale-90"
                        style={{
                          height: 32, borderRadius: 10, padding: '0 10px',
                          fontSize: 13,
                          background: active ? c.color + '22' : 'rgba(17,24,39,0.93)',
                          border: `1.5px solid ${active ? c.color : c.color + '55'}`,
                          boxShadow: active ? `0 0 12px ${c.color}55` : 'none',
                          color: active ? c.color : 'var(--hint)',
                          fontWeight: active ? 700 : 400,
                        }}>
                  <span>{c.icon}</span>
                  <span style={{ fontSize: 11 }}>{c.label}</span>
                </button>
              )
            })}

            <button onClick={loadEvents} disabled={loadingEvents}
                    className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition active:scale-90"
                    style={{
                      background: 'rgba(17,24,39,0.93)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
                    }}>
              <svg className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin' : ''}`}
                   style={{ color: 'var(--accent)' }}
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Top bar — режим ленты (только переключатель) */}
      {mode === 'feed' && (
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-3 pb-2">
          <div style={{
            display: 'flex', borderRadius: 14, padding: 3,
            background: 'rgba(17,24,39,0.85)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
          }}>
            {[{ key: 'feed', label: '▤ Лента' }, { key: 'map', label: '🗺 Карта' }].map(m => (
              <button key={m.key} onClick={() => setMode(m.key)}
                      style={{
                        padding: '6px 12px', borderRadius: 11,
                        fontSize: 12, fontWeight: 700,
                        border: 'none', cursor: 'pointer',
                        background: mode === m.key ? 'var(--accent)' : 'transparent',
                        color: mode === m.key ? '#111827' : 'var(--hint)',
                        transition: 'all 0.2s',
                      }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Кнопка "+" в режиме ленты — над кнопкой ПОДРОБНЕЕ */}
      {mode === 'feed' && !showCreate && (
        <button
          onClick={() => { haptic('impact', 'medium'); setShowCreate(true) }}
          className="absolute z-20 transition active:scale-90"
          style={{
            bottom: 110, right: 16,
            width: 60, height: 60, borderRadius: 18,
            background: 'var(--accent)', color: '#111827',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 0 24px var(--accent-glow), 0 4px 16px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
      )}


      {/* Подсказка первого визита */}
      {showFirstVisit && events.length > 0 && !selectedEvent && (
        <div className="absolute z-20 animate-bounce"
             style={{ top: '45%', left: '50%', transform: 'translateX(-50%)' }}>
          <div className="rounded-2xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
               style={{ background: 'rgba(17,24,39,0.95)', color: 'var(--accent)', border: '1px solid var(--accent)', boxShadow: '0 0 16px var(--accent-glow)' }}>
            📍 Нажми на событие на карте
          </div>
          <div style={{ width: 0, height: 0, margin: '0 auto', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid var(--accent)' }} />
        </div>
      )}

      {/* FAB кнопки — только в режиме карты */}
      {mode === 'map' && !showCreate && !selectedEvent && !clusterEvents && (
        <div className="absolute z-10 flex flex-col items-center gap-3"
             style={{ bottom: 100, right: 16 }}>
          {showCreateHint && (
            <div className="rounded-2xl px-3 py-2 text-xs font-semibold animate-pulse"
                 style={{ background: 'rgba(17,24,39,0.95)', color: 'var(--accent)', border: '1px solid var(--accent)', boxShadow: '0 0 12px var(--accent-glow)', whiteSpace: 'nowrap' }}>
              Что происходит рядом? 👀
            </div>
          )}
          {/* Моё местоположение */}
          <button
            onClick={() => {
              haptic('impact', 'light')
              if (location && window._ryadomMap) {
                window._ryadomMap.setCenter([location.lat, location.lon], 15, { duration: 500 })
              }
            }}
            className="transition active:scale-90"
            style={{
              width: 44, height: 44, borderRadius: 13,
              background: 'rgba(17,24,39,0.93)',
              border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--accent)' }}>
              <circle cx="12" cy="12" r="3" fill="var(--accent)" stroke="none"/>
              <path strokeLinecap="round" d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              <circle cx="12" cy="12" r="7" strokeOpacity="0.4"/>
            </svg>
          </button>
          {/* Добавить событие */}
          <button
            onClick={() => { haptic('impact', 'medium'); setShowCreate(true) }}
            className="transition active:scale-90"
            style={{
              width: 60, height: 60, borderRadius: 18,
              background: 'var(--accent)', color: '#111827',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 0 24px var(--accent-glow), 0 4px 16px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>
      )}

      {clusterEvents && (
        <ClusterSheet
          events={clusterEvents}
          onSelect={(ev) => { setClusterEvents(null); setSelectedEvent(ev) }}
          onClose={() => setClusterEvents(null)}
        />
      )}

      {selectedEvent && (
        <BottomSheet
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onPremium={() => { setSelectedEvent(null); setShowPremium(true) }}
          user={user}
          authUser={authUser}
          onDelete={() => {
            setEvents(prev => prev.filter(e => e.id !== selectedEvent.id))
            setSelectedEvent(null)
          }}
        />
      )}

      {showCreate && (
        <CreateEventForm
          onSubmit={handleCreateSubmit}
          onClose={() => setShowCreate(false)}
          loading={creating}
          userLocation={location}
          isBusiness={!!profile?.is_business}
        />
      )}

      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}

      {authChecked && !authUser && !skippedWelcome && !showAuth && (
        <WelcomeScreen
          onAuth={(mode) => { setShowAuth(true); }}
          onSkip={() => setSkippedWelcome(true)}
        />
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuth={(u) => { setAuthUser(u); setShowAuth(false); getProfile(u.id).then(p => { if (p) { setProfile(p); localStorage.setItem('ryadom_profile', JSON.stringify(p)) } }) }}
        />
      )}

      {showProfile && authUser && (
        <ProfileSheet
          authUser={authUser}
          onClose={() => setShowProfile(false)}
          onSignOut={() => { setAuthUser(null); setProfile(null); localStorage.removeItem('ryadom_profile'); setShowProfile(false) }}
          onAdmin={() => { setShowProfile(false); setShowAdmin(true) }}
        />
      )}

      {/* Геолокация отключена — полноэкранный промпт */}
      {geoDenied && <GeoPrompt onRetry={geoRefetch} />}

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {announcement && (() => {
        const colors = { warning: ['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.4)'], success: ['rgba(52,211,153,0.15)', 'rgba(52,211,153,0.4)'], info: ['rgba(34,211,238,0.15)', 'rgba(34,211,238,0.4)'] }
        const icons  = { warning: '❗', success: '✅', info: 'ℹ️' }
        const [bg, border] = colors[announcement.type] ?? colors.info
        return (
          <div className="absolute top-20 left-4 right-4 z-30 rounded-2xl px-4 py-3"
               style={{ background: bg, border: `1px solid ${border}`, backdropFilter: 'blur(16px)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: 14 }}>{icons[announcement.type] ?? 'ℹ️'}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hint)' }}>
                Сообщение от администратора
              </span>
              <button onClick={() => setAnnouncement(null)} className="ml-auto" style={{ color: 'var(--hint)', fontSize: 14 }}>✕</button>
            </div>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{announcement.message}</p>
          </div>
        )
      })()}}

      {showOnboarding && (
        <OnboardingScreen onDone={() => {
          localStorage.setItem('ryadom_onboarded', '1')
          setShowOnboarding(false)
        }} />
      )}

      {/* Achievement toast */}
      {achievement && (
        <AchievementToast id={achievement} onDone={() => setAchievement(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute top-[88px] left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl text-sm font-semibold"
             style={{
               background: toast.type === 'error' ? 'var(--danger)' : toast.type === 'info' ? '#1f2937' : '#1f2937',
               color: toast.type === 'error' ? '#fff' : 'var(--accent)',
               border: toast.type === 'error' ? 'none' : '1px solid var(--border)',
               boxShadow: toast.type === 'error' ? '0 4px 16px rgba(248,113,113,0.4)' : '0 4px 16px rgba(0,0,0,0.5), 0 0 16px var(--accent-glow)',
               whiteSpace: 'nowrap',
             }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
