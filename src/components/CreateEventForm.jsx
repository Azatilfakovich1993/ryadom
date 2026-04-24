import { useState, useEffect, useRef, useCallback } from 'react'
import { CATEGORY_CONFIG } from './MapComponent'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

const DURATIONS = [
  { value: 1, label: '1 ч' },
  { value: 2, label: '2 ч' },
  { value: 3, label: '3 ч' },
]

function geocodeAddress(address, userLocation) {
  return new Promise((resolve, reject) => {
    const opts = { results: 1 }
    if (userLocation) {
      const d = 0.5
      opts.boundedBy = [
        [userLocation.lat - d, userLocation.lon - d],
        [userLocation.lat + d, userLocation.lon + d],
      ]
    }
    window.ymaps.geocode(address, opts)
      .then(res => {
        const obj = res.geoObjects.get(0)
        if (!obj) return reject(new Error('Адрес не найден'))
        const [lat, lon] = obj.geometry.getCoordinates()
        const fullAddress = obj.getAddressLine?.() || address
        resolve({ lat, lon, fullAddress })
      })
      .catch(reject)
  })
}

export default function CreateEventForm({ onSubmit, onClose, loading, userLocation, isBusiness = false }) {
  const [title, setTitle]       = useState('')
  const [category, setCategory] = useState('chat')
  const [duration, setDuration] = useState(1)
  const [chatEnabled, setChatEnabled] = useState(true)
  const [showEmoji, setShowEmoji] = useState(false)

  // Photos
  const [photos, setPhotos]           = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [useBusinessPin, setUseBusinessPin] = useState(false)
  const maxPhotos = isBusiness ? 5 : 3
  const galleryInputRef = useRef(null)
  const cameraInputRef  = useRef(null)

  // Address
  const [query, setQuery]             = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSug, setShowSug]         = useState(false)
  const [resolved, setResolved]       = useState(null)
  const [geocoding, setGeocoding]     = useState(false)
  const [addrError, setAddrError]     = useState('')

  const debounceRef  = useRef(null)
  const justPicked   = useRef(false)
  const resolvedRef  = useRef(null)
  const inputRef     = useRef(null)
  const textareaRef  = useRef(null)

  const saveResolved = (val) => {
    resolvedRef.current = val
    setResolved(val)
  }

  // ── Photos ─────────────────────────────────────────────────
  const compressImage = (file) => new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1600
        let w = img.width, h = img.height
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX }
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.90))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })

  const addPhoto = async (file) => {
    if (!file || photos.length >= maxPhotos) return
    const dataUrl = await compressImage(file)
    setPhotos(prev => [...prev, dataUrl])
    setPhotoPreviews(prev => [...prev, dataUrl])
  }

  const removePhoto = (i) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== i))
    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  // ── Emoji ──────────────────────────────────────────────────
  const insertEmoji = (emoji) => {
    const ta = textareaRef.current
    if (!ta) { setTitle(prev => (prev + emoji).slice(0, 100)); setShowEmoji(false); return }
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const next  = (title.slice(0, start) + emoji + title.slice(end)).slice(0, 100)
    setTitle(next)
    setShowEmoji(false)
    setTimeout(() => {
      ta.focus()
      const pos = Math.min(start + emoji.length, next.length)
      ta.setSelectionRange(pos, pos)
    }, 0)
  }

  // ── Suggestions ───────────────────────────────────────────
  useEffect(() => {
    if (justPicked.current) { justPicked.current = false; return }
    saveResolved(null)
    setAddrError('')
    setSuggestions([])
    if (!query.trim() || query.length < 2) { setShowSug(false); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!window.ymaps) return
      const opts = { results: 6, kind: 'house' }
      if (userLocation) {
        const d = 0.5
        opts.boundedBy = [
          [userLocation.lat - d, userLocation.lon - d],
          [userLocation.lat + d, userLocation.lon + d],
        ]
        opts.strictBounds = false
      }
      window.ymaps.geocode(query, opts)
        .then(res => {
          const list = []
          res.geoObjects.each(obj => {
            const addr = obj.getAddressLine?.()
            if (addr && !list.includes(addr)) list.push(addr)
          })
          setSuggestions(list)
          setShowSug(list.length > 0)
        })
        .catch(() => setSuggestions([]))
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query, userLocation])

  // ── Pick suggestion ───────────────────────────────────────
  const handlePick = useCallback(async (s) => {
    justPicked.current = true
    setQuery(s)
    setSuggestions([])
    setShowSug(false)
    setGeocoding(true)
    setAddrError('')
    try {
      const result = await geocodeAddress(s, userLocation)
      saveResolved(result)
    } catch {
      setAddrError('Не удалось определить координаты')
    } finally {
      setGeocoding(false)
    }
  }, [userLocation])

  const handleClear = () => {
    justPicked.current = false
    setQuery('')
    setSuggestions([])
    setShowSug(false)
    saveResolved(null)
    setAddrError('')
    inputRef.current?.focus()
  }

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    let coords = resolvedRef.current
    if (!coords && query.trim()) {
      setGeocoding(true)
      try {
        coords = await geocodeAddress(query.trim(), userLocation)
        saveResolved(coords)
      } catch {
        setAddrError('Адрес не найден. Выберите из подсказок.')
        setGeocoding(false)
        return
      }
      setGeocoding(false)
    }
    if (!coords) {
      if (!userLocation) { setAddrError('Укажите адрес или разрешите геолокацию'); return }
      coords = { lat: userLocation.lat, lon: userLocation.lon }
    }
    onSubmit({
      title: title.trim(),
      category,
      durationHours: duration,
      lat: coords.lat,
      lon: coords.lon,
      photos,
      chatEnabled,
      useBusinessPin: isBusiness && useBusinessPin,
    })
  }

  const isSubmitting = loading || geocoding

  return (
    <>
      <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl"
           style={{
             background: 'rgba(17,24,39,0.98)',
             backdropFilter: 'blur(24px)',
             border: '1px solid var(--border)',
             borderBottom: 'none',
             boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
             paddingBottom: 'env(safe-area-inset-bottom, 20px)',
             maxHeight: '92vh', overflowY: 'auto',
           }}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-[3px] rounded-full" style={{ background: 'var(--bg-3)' }} />
        </div>

        <form onSubmit={handleSubmit} className="px-5 pt-3 pb-4"
              onClick={() => showEmoji && setShowEmoji(false)}>

          {/* Заголовок */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>Новое событие</h2>
            <button type="button" onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition active:scale-90"
                    style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
              ✕
            </button>
          </div>

          {/* Описание */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider"
                     style={{ color: 'var(--accent)' }}>Что происходит?</label>
              <button type="button" onClick={() => setShowEmoji(v => !v)}
                      className="text-base px-2 py-0.5 rounded-lg transition active:scale-90"
                      style={{ background: showEmoji ? 'var(--accent)22' : 'var(--bg-2)', border: '1px solid var(--bg-3)' }}>
                😊
              </button>
            </div>

            {showEmoji && (
              <div className="mb-2 rounded-2xl overflow-hidden"
                   style={{ border: '1px solid var(--bg-3)' }}
                   onClick={e => e.stopPropagation()}>
                <Picker
                  data={data}
                  onEmojiSelect={em => insertEmoji(em.native)}
                  theme="dark"
                  locale="ru"
                  previewPosition="none"
                  skinTonePosition="none"
                  maxFrequentRows={2}
                  perLine={8}
                  set="native"
                  exceptEmojis={['rainbow-flag']}
                />
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 100))}
              placeholder="Играем в волейбол на поляне…"
              rows={2} autoFocus
              className="w-full rounded-2xl px-4 py-3 text-sm resize-none outline-none"
              style={{ background: 'var(--bg-2)', color: 'var(--text)', border: '1px solid var(--bg-3)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--bg-3)'}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs" style={{ color: title.length > 80 ? 'var(--warning)' : 'var(--hint)' }}>
                {title.length}/100
              </span>
            </div>
          </div>

          {/* Фото */}
          <div className="mb-4">
            <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block"
                   style={{ color: 'var(--accent)' }}>Фото (до 3-х)</label>

            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden"
                   onChange={e => { addPhoto(e.target.files[0]); e.target.value = '' }} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                   onChange={e => { addPhoto(e.target.files[0]); e.target.value = '' }} />

            <div className="flex gap-2 mb-2">
              {photoPreviews.map((preview, i) => (
                <div key={i} className="relative flex-shrink-0 rounded-2xl overflow-hidden"
                     style={{ width: 80, height: 80 }}>
                  <img src={preview} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}>
                    ✕
                  </button>
                </div>
              ))}
              {photos.length < maxPhotos && (
                <button type="button" onClick={() => galleryInputRef.current?.click()}
                        className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-2xl transition active:scale-95"
                        style={{ width: 80, height: 80, background: 'var(--bg-2)', border: '1.5px dashed var(--bg-3)', color: 'var(--hint)' }}>
                  <span style={{ fontSize: 22 }}>🖼️</span>
                  <span style={{ fontSize: 10 }}>Галерея</span>
                </button>
              )}
            </div>

            {photos.length < maxPhotos && (
              <button type="button" onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-2 text-sm py-2.5 px-4 rounded-2xl transition active:scale-95"
                      style={{ background: 'var(--bg-2)', color: 'var(--accent)', border: '1px solid var(--bg-3)' }}>
                <span>📸</span>
                <span>Сделать снимок сейчас</span>
              </button>
            )}

            {/* Бизнес: выбор типа пина */}
            {isBusiness && (
              <div className="flex items-center justify-between rounded-2xl px-4 py-3 mt-1"
                   style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>⭐ Золотой пин партнёра</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--hint)' }}>С пульсацией и бейджем</p>
                </div>
                <button type="button" onClick={() => setUseBusinessPin(v => !v)}
                        className="w-12 h-6 rounded-full flex items-center transition-all duration-200 flex-shrink-0"
                        style={{ background: useBusinessPin ? '#f59e0b' : 'var(--bg-3)', padding: '2px' }}>
                  <div className="w-5 h-5 rounded-full bg-white transition-all duration-200"
                       style={{ transform: useBusinessPin ? 'translateX(24px)' : 'translateX(0)' }} />
                </button>
              </div>
            )}
          </div>

          {/* Адрес */}
          <div className="mb-4">
            <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block"
                   style={{ color: 'var(--accent)' }}>Адрес события</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: resolved ? 'var(--success)' : 'var(--accent)', fontSize: 14 }}>
                {geocoding ? '⏳' : resolved ? '✓' : '📍'}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 200)}
                placeholder="Начни вводить адрес…"
                className="w-full rounded-2xl text-sm outline-none"
                style={{
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  border: `1px solid ${addrError ? 'var(--danger)' : resolved ? 'var(--success)' : 'var(--bg-3)'}`,
                  padding: '12px 36px 12px 36px',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = addrError ? 'var(--danger)' : 'var(--accent)'}
                onBlurCapture={e => {
                  e.target.style.borderColor = addrError ? 'var(--danger)' : resolved ? 'var(--success)' : 'var(--bg-3)'
                }}
              />
              {query && (
                <button type="button" onMouseDown={e => { e.preventDefault(); handleClear() }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-xs"
                        style={{ background: 'var(--bg-3)', color: 'var(--hint)' }}>
                  ✕
                </button>
              )}
            </div>
            {showSug && suggestions.length > 0 && (
              <div className="mt-1 rounded-2xl overflow-hidden"
                   style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                {suggestions.map((s, i) => (
                  <button key={i} type="button"
                          onMouseDown={e => { e.preventDefault(); handlePick(s) }}
                          className="w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition active:opacity-60"
                          style={{ color: 'var(--text)', borderBottom: i < suggestions.length - 1 ? '1px solid var(--bg-3)' : 'none' }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0, fontSize: 13 }}>📍</span>
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-1.5 min-h-[16px]">
              {addrError ? (
                <p className="text-xs flex items-center gap-1" style={{ color: 'var(--danger)' }}>⚠ {addrError}</p>
              ) : resolved ? (
                <p className="text-xs flex items-center gap-1 truncate" style={{ color: 'var(--success)' }}>✓ {resolved.fullAddress}</p>
              ) : !query && userLocation ? (
                <p className="text-xs" style={{ color: 'var(--hint)' }}>📍 Оставь пустым — используем твоё местоположение</p>
              ) : null}
            </div>
          </div>

          {/* Категория */}
          <div className="mb-4">
            <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block"
                   style={{ color: 'var(--accent)' }}>Категория</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => setCategory(key)}
                        className="flex flex-col items-center gap-1 py-3 rounded-2xl text-xs font-semibold transition active:scale-95"
                        style={{
                          background: category === key ? cfg.color + '22' : 'var(--bg-2)',
                          color: category === key ? cfg.color : 'var(--hint)',
                          border: `1px solid ${category === key ? cfg.color + '66' : 'var(--bg-3)'}`,
                          boxShadow: category === key ? `0 0 12px ${cfg.color}33` : 'none',
                        }}>
                  <span className="text-xl">{cfg.icon}</span>
                  <span style={{ fontSize: 10 }}>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Длительность */}
          <div className="mb-4">
            <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block"
                   style={{ color: 'var(--accent)' }}>Продолжительность</label>
            <div className="grid grid-cols-3 gap-2">
              {DURATIONS.map(d => (
                <button key={d.value} type="button" onClick={() => setDuration(d.value)}
                        className="py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                        style={{
                          background: duration === d.value ? 'var(--accent)' : 'var(--bg-2)',
                          color: duration === d.value ? '#111827' : 'var(--hint)',
                          border: `1px solid ${duration === d.value ? 'var(--accent)' : 'var(--bg-3)'}`,
                          boxShadow: duration === d.value ? '0 0 16px var(--accent-glow)' : 'none',
                        }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Чат */}
          <div className="mb-6">
            <button type="button" onClick={() => setChatEnabled(v => !v)}
                    className="w-full flex items-center justify-between rounded-2xl px-4 py-3 transition active:scale-95"
                    style={{
                      background: chatEnabled ? 'rgba(34,211,238,0.08)' : 'var(--bg-2)',
                      border: `1px solid ${chatEnabled ? 'rgba(34,211,238,0.3)' : 'var(--bg-3)'}`,
                    }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">💬</span>
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: chatEnabled ? 'var(--accent)' : 'var(--hint)' }}>
                    Открыть чат события
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--hint)' }}>
                    {chatEnabled ? 'Участники смогут переписываться' : 'Чат отключён'}
                  </p>
                </div>
              </div>
              <div className="w-11 h-6 rounded-full flex-shrink-0 transition-all duration-200 relative"
                   style={{ background: chatEnabled ? 'var(--accent)' : 'var(--bg-3)' }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
                     style={{
                       background: '#fff',
                       left: chatEnabled ? 'calc(100% - 22px)' : '2px',
                       boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                     }} />
              </div>
            </button>
          </div>

          {/* Кнопка */}
          <button type="submit" disabled={!title.trim() || isSubmitting}
                  className="w-full py-4 rounded-2xl text-sm font-black transition active:scale-95 disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: '#111827', boxShadow: '0 0 24px var(--accent-glow)' }}>
            {geocoding ? '🔍 Определяю адрес…' : loading ? '⏳ Публикую…' : '🚀 Опубликовать'}
          </button>
        </form>
      </div>
    </>
  )
}
