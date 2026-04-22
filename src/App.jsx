import { useState, useEffect, useCallback, useRef } from 'react'
import MapComponent from './components/MapComponent'
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
import { useTelegram } from './hooks/useTelegram'
import { useGeolocation } from './hooks/useGeolocation'
import { supabase, fetchNearbyEvents, createEvent, getProfile } from './lib/supabase'
import { tryUnlock } from './utils/achievements'

const RADIUS_M = 15000

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
  { key: 'help',  icon: '🤝', label: 'Помощь',  color: '#f43f5e' },
]

export default function App() {
  const { tg, user, haptic } = useTelegram()
  const { location, loading: locLoading, denied: geoDenied, refetch: geoRefetch } = useGeolocation(tg)

  const [events, setEvents]             = useState([])
  const [activeFilter, setActiveFilter] = useState(null) // null = все категории
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [clusterEvents, setClusterEvents] = useState(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [showPremium, setShowPremium]   = useState(false)
  const [showAuth, setShowAuth]         = useState(false)
  const [showProfile, setShowProfile]   = useState(false)
  const [authUser, setAuthUser]         = useState(null)
  const [profile, setProfile]           = useState(null)
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
  const radarShown                          = useRef(false)

  // ── Auth state ────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user)
        getProfile(session.user.id).then(setProfile)
      }
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setAuthUser(session.user)
        getProfile(session.user.id).then(setProfile)
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
    const data = await fetchNearbyEvents(location.lat, location.lon, RADIUS_M)
    setEvents(data)
    setLoadingEvents(false)
  }, [location])

  useEffect(() => { loadEvents() }, [loadEvents])

  // ── Realtime ─────────────────────────────────────────────
  useEffect(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const ch = supabase.channel('events-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, ({ new: ev }) => {
        if (new Date(ev.expires_at) <= new Date()) return
        const loc = locationRef.current
        if (loc && distanceM(loc.lat, loc.lon, ev.lat, ev.lon) > RADIUS_M) return
        setEvents(prev => prev.find(e => e.id === ev.id) ? prev : [ev, ...prev])
        showToast(`📍 ${ev.title}`, 'info')
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events' }, ({ old: ev }) => {
        setEvents(prev => prev.filter(e => e.id !== ev.id))
        setSelectedEvent(s => s?.id === ev.id ? null : s)
      })
      .subscribe(s => setConnected(s === 'SUBSCRIBED'))
    channelRef.current = ch
    return () => supabase.removeChannel(ch)
  }, [showToast])

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

  const handleCreateSubmit = async ({ title, category, durationHours, lat, lon, photos, chatEnabled }) => {
    if (lat == null || lon == null) {
      showToast('Не удалось определить координаты', 'error')
      return
    }
    setCreating(true)
    try {
      const uid = authUser?.id ?? user?.id?.toString() ?? localStorage.getItem('ryadom_uid') ?? 'anonymous'
      const event = await createEvent({ title, category, lat, lon, durationHours, creatorId: uid, chatEnabled, photos: photos ?? [] })
      haptic('notification', 'success')
      setShowCreate(false)
      showToast('Событие опубликовано!')
      localStorage.setItem('ryadom_last_event', Date.now().toString())
      setShowCreateHint(false)
      showAchievement('first_spark')
      const cnt = (profile?.events_count ?? 0) + 1
      if (cnt >= 10) showAchievement('ten_events')
      await loadEvents()
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

      {/* DEBUG — удалить после диагностики */}
      <div style={{ position:'absolute', top:70, left:8, zIndex:9999, background:'rgba(0,0,0,0.85)', color:'#22d3ee', padding:'8px 12px', borderRadius:10, fontSize:11, pointerEvents:'none', lineHeight:1.8 }}>
        📍 loc: {location ? `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}` : 'null'}<br/>
        ⏳ loading: {locLoading ? 'true' : 'false'}<br/>
        🚫 denied: {geoDenied ? 'true' : 'false'}
      </div>

      {/* Map */}
      <div className="absolute inset-0">
        <MapComponent
          events={visibleEvents}
          onEventClick={handleEventClick}
          userLocation={location}
          radarActive={radarActive}
          onRadarDone={handleRadarDone}
        />
      </div>

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

      {/* Top bar — одна строка: лого + чипы + обновить */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-3 pt-3 pb-2">

        {/* Лого (5 тапов = пасхалка) */}
        <div className="flex items-center gap-1.5 rounded-2xl px-3 py-2 flex-shrink-0"
             onClick={handleLogoTap}
             style={{
               background: 'rgba(17,24,39,0.92)',
               backdropFilter: 'blur(20px)',
               WebkitBackdropFilter: 'blur(20px)',
               border: '1px solid var(--border)',
               boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
             }}>
          <LogoIcon size={22} />
          <span className="font-bold text-sm tracking-wide" style={{ color: 'var(--accent)' }}>RYADOM</span>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: connected ? 'var(--success)' : 'var(--warning)',
                         boxShadow: connected ? '0 0 5px #34d399' : '0 0 5px #fbbf24' }} />
        </div>

        {/* Чипы-фильтры */}
        <div className="flex gap-2 overflow-x-auto flex-1 min-w-0" style={{ scrollbarWidth: 'none' }}>
          {CHIPS.map(c => {
            const count = events.filter(e => e.category === c.key).length
            const active = activeFilter === c.key
            return (
              <button
                key={c.key}
                onClick={() => { haptic('impact', 'light'); setActiveFilter(active ? null : c.key) }}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap flex-shrink-0 transition active:scale-95"
                style={{
                  background: active ? c.color : 'rgba(17,24,39,0.92)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid ${active ? c.color : c.color + '55'}`,
                  color: active ? '#111827' : c.color,
                  boxShadow: active ? `0 0 12px ${c.color}66` : '0 2px 12px rgba(0,0,0,0.35)',
                }}>
                <span>{c.icon}</span>
                <span>{c.label}</span>
                {count > 0 && (
                  <span className="rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold"
                        style={{ background: active ? '#111827' : c.color, color: active ? c.color : '#111827' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Профиль */}
        <button onClick={() => authUser ? setShowProfile(true) : setShowAuth(true)}
                className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden transition active:scale-90"
                style={{
                  background: 'rgba(17,24,39,0.92)',
                  border: authUser ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  boxShadow: authUser ? '0 0 10px var(--accent-glow)' : '0 2px 12px rgba(0,0,0,0.35)',
                }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
            : <span style={{ color: authUser ? 'var(--accent)' : 'var(--hint)', fontSize: 16 }}>👤</span>
          }
        </button>

        {/* Обновить */}
        <button onClick={loadEvents} disabled={loadingEvents}
                className="w-9 h-9 flex items-center justify-center rounded-2xl flex-shrink-0 transition active:scale-90"
                style={{
                  background: 'rgba(17,24,39,0.92)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
                }}>
          <svg className={`w-4 h-4 ${loadingEvents ? 'animate-spin' : ''}`}
               style={{ color: 'var(--accent)' }}
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>


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

      {/* Create button */}
      {!showCreate && !selectedEvent && !clusterEvents && (
        <div className="absolute bottom-8 right-4 z-10 flex flex-col items-end gap-2"
             style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {/* Подсказка «долго не создавал» */}
          {showCreateHint && (
            <div className="rounded-2xl px-3 py-2 text-xs font-semibold animate-pulse"
                 style={{ background: 'rgba(17,24,39,0.95)', color: 'var(--accent)', border: '1px solid var(--accent)', boxShadow: '0 0 12px var(--accent-glow)', whiteSpace: 'nowrap' }}>
              Что происходит рядом? 👀
            </div>
          )}
          <button
            onClick={() => { haptic('impact', 'medium'); setShowCreate(true) }}
            className="flex items-center gap-2 rounded-2xl px-5 py-3.5 transition active:scale-95"
            style={{
              background: 'var(--accent)',
              color: '#111827',
              boxShadow: '0 0 24px var(--accent-glow), 0 4px 12px rgba(0,0,0,0.4)',
              fontWeight: 700,
            }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            <span className="text-sm">Добавить событие</span>
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
          onAuth={(u) => { setAuthUser(u); setShowAuth(false); getProfile(u.id).then(setProfile) }}
        />
      )}

      {showProfile && authUser && (
        <ProfileSheet
          authUser={authUser}
          onClose={() => setShowProfile(false)}
          onSignOut={() => { setAuthUser(null); setProfile(null); setShowProfile(false) }}
        />
      )}

      {/* Геолокация отключена — полноэкранный промпт */}
      {geoDenied && <GeoPrompt onRetry={geoRefetch} />}

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
