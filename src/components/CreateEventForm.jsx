import { useState, useEffect, useRef, useCallback } from 'react'
import { CATEGORY_CONFIG } from './MapComponent'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

function MapPicker({ userLocation, onSelect, onClose }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [resolving, setResolving] = useState(false)
  const [hint, setHint] = useState('Переместите карту на нужное место')

  useEffect(() => {
    if (!window.ymaps || !containerRef.current) return
    window.ymaps.ready(() => {
      const center = userLocation ? [userLocation.lat, userLocation.lon] : [55.7558, 37.6176]
      mapRef.current = new window.ymaps.Map(containerRef.current, {
        center, zoom: 16,
        controls: [],
        behaviors: ['drag', 'scrollZoom', 'multiTouch', 'dblClickZoom'],
      })
    })
    return () => { try { mapRef.current?.destroy() } catch {} }
  }, [])

  const handleSelect = async () => {
    if (!mapRef.current) return
    setResolving(true)
    setHint('Определяю адрес…')
    const center = mapRef.current.getCenter()
    try {
      const res = await window.ymaps.geocode(center, { results: 1 })
      const obj = res.geoObjects.get(0)
      const address = obj?.getAddressLine?.() ?? `${center[0].toFixed(5)}, ${center[1].toFixed(5)}`
      onSelect({ lat: center[0], lon: center[1], address })
    } catch {
      onSelect({ lat: center[0], lon: center[1], address: `${center[0].toFixed(5)}, ${center[1].toFixed(5)}` })
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="absolute inset-0 z-[110] flex flex-col" style={{ background: '#000' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
           style={{ background: 'rgba(17,24,39,0.95)', borderBottom: '1px solid var(--border)' }}>
        <button type="button" onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--bg-2)', color: 'var(--hint)' }}>←</button>
        <p className="text-sm font-semibold flex-1" style={{ color: 'var(--text)' }}>Выберите место на карте</p>
      </div>

      {/* Map */}
      <div ref={containerRef} className="flex-1 relative" />

      {/* Center pin */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
        <div style={{ transform: 'translateY(-16px)', textAlign: 'center' }}>
          <div style={{ fontSize: 32 }}>📍</div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 px-4 py-3 flex flex-col gap-2"
           style={{ background: 'rgba(17,24,39,0.95)', borderTop: '1px solid var(--border)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--hint)' }}>{hint}</p>
        <button type="button" onClick={handleSelect} disabled={resolving}
                className="w-full py-3 rounded-2xl text-sm font-bold transition active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#111827' }}>
          {resolving ? '⏳ Определяю адрес…' : '✓ Выбрать это место'}
        </button>
      </div>
    </div>
  )
}

const isCapacitor = window.Capacitor?.isNativePlatform?.() ?? false

async function takePhotoNative() {
  const { Camera, CameraResultType, CameraSource } = await import(/* @vite-ignore */ '@capacitor/camera')
  const image = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera,
  })
  const res = await fetch(image.dataUrl)
  const blob = await res.blob()
  return new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
}

function CameraCapture({ onCapture, onClose }) {
  const videoRef  = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => onClose())
    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, [onClose])

  const capture = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      onCapture(new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.88)
  }

  return (
    <div className="absolute inset-0 z-[100] flex flex-col" style={{ background: '#000' }}>
      <video ref={videoRef} autoPlay playsInline muted className="flex-1 w-full object-cover" />
      <div className="flex items-center justify-between px-10 py-6" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <button type="button" onClick={onClose}
                className="text-sm font-semibold px-4 py-2 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
          Отмена
        </button>
        <button type="button" onClick={capture}
                className="w-16 h-16 rounded-full border-4 border-white transition active:scale-90"
                style={{ background: 'rgba(255,255,255,0.9)' }} />
        <div className="w-16" />
      </div>
    </div>
  )
}

const DURATIONS = [
  { value: 1, label: '1 ч' },
  { value: 2, label: '2 ч' },
  { value: 3, label: '3 ч' },
]
const DURATIONS_BUSINESS = [
  { value: 1, label: '1 ч' },
  { value: 2, label: '2 ч' },
  { value: 3, label: '3 ч' },
  { value: 4, label: '4 ч' },
  { value: 5, label: '5 ч' },
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

const DRAFT_KEY = 'ryadom_event_draft'

export default function CreateEventForm({ onSubmit, onClose, loading, userLocation, isBusiness = false }) {
  const savedDraft = (() => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') } catch { return null } })()

  const [title, setTitle]       = useState(savedDraft?.title || '')
  const [category, setCategory] = useState(savedDraft?.category || 'chat')
  const [duration, setDuration] = useState(savedDraft?.duration || 1)
  const [chatEnabled, setChatEnabled] = useState(savedDraft?.chatEnabled ?? true)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showRestoreBar, setShowRestoreBar] = useState(!!savedDraft?.title)

  // Photos & video
  const [photoFiles, setPhotoFiles]   = useState([]) // for UI (length check)
  const photoFilesRef = useRef([])                   // always up-to-date for submit
  const [photoPreviews, setPhotoPreviews] = useState([]) // blob URLs for display
  const [uploading, setUploading]     = useState(false)
  const [video, setVideo]             = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [useBusinessPin, setUseBusinessPin] = useState(false)
  const maxPhotos = isBusiness ? 5 : 3
  const durations = isBusiness ? DURATIONS_BUSINESS : DURATIONS
  const [showCamera, setShowCamera] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const galleryInputRef = useRef(null)
  const videoInputRef   = useRef(null)

  // Address
  const [query, setQuery]             = useState(savedDraft?.address || '')
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

  // ── Photos: instant preview + Cloudinary on submit ────────
  const addPhoto = (file) => {
    if (!file || photoFilesRef.current.length >= maxPhotos) return
    photoFilesRef.current = [...photoFilesRef.current, file]
    setPhotoFiles([...photoFilesRef.current])
    setPhotoPreviews(prev => [...prev, URL.createObjectURL(file)])
  }

  const removePhoto = (i) => {
    URL.revokeObjectURL(photoPreviews[i])
    photoFilesRef.current = photoFilesRef.current.filter((_, idx) => idx !== i)
    setPhotoFiles([...photoFilesRef.current])
    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const uploadAllToCloudinary = async (files) => {
    const urls = []
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'ryadom')
      formData.append('folder', 'ryadom_events')
      const res = await fetch('https://api.cloudinary.com/v1_1/dp9jsepjg/image/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Ошибка загрузки фото')
      const data = await res.json()
      urls.push(data.secure_url)
    }
    return urls
  }


  // ── Автосохранение черновика ──────────────────────────────
  useEffect(() => {
    if (!title && !query) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, category, duration, chatEnabled, address: query }))
  }, [title, category, duration, chatEnabled, query])

  const addVideo = (file) => {
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { alert('Видео не более 50 МБ'); return }
    setVideo(file)
    setVideoPreview(URL.createObjectURL(file))
  }

  // ── Emoji ──────────────────────────────────────────────────
  const insertEmoji = (emoji) => {
    const ta = textareaRef.current
    if (!ta) { setTitle(prev => (prev + emoji).slice(0, 200)); return }
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const next  = (title.slice(0, start) + emoji + title.slice(end)).slice(0, 200)
    setTitle(next)
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
    localStorage.removeItem(DRAFT_KEY)
    let uploadedPhotos = []
    if (photoFilesRef.current.length > 0) {
      setUploading(true)
      try {
        uploadedPhotos = await uploadAllToCloudinary(photoFilesRef.current)
      } catch (err) {
        alert('Ошибка загрузки фото: ' + err.message)
        setUploading(false)
        return
      }
      setUploading(false)
    }
    onSubmit({
      title: title.trim(),
      category,
      durationHours: duration,
      lat: coords.lat,
      lon: coords.lon,
      photos: uploadedPhotos,
      video: null,
      chatEnabled,
      useBusinessPin: isBusiness && useBusinessPin,
    })
  }

  const isSubmitting = loading || geocoding || uploading

  return (
    <>
      {showCamera && (
        <CameraCapture
          onCapture={file => { addPhoto(file); setShowCamera(false) }}
          onClose={() => setShowCamera(false)}
        />
      )}
      {showMapPicker && (
        <MapPicker
          userLocation={userLocation}
          onClose={() => setShowMapPicker(false)}
          onSelect={({ lat, lon, address }) => {
            setQuery(address)
            saveResolved({ lat, lon, fullAddress: address })
            setShowMapPicker(false)
          }}
        />
      )}
      <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <SwipeToClose onClose={onClose}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-[3px] rounded-full" style={{ background: 'var(--bg-3)' }} />
        </div>
        {showRestoreBar && (
          <div className="mx-4 mb-2 px-4 py-2.5 rounded-2xl flex items-center gap-3"
               style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)' }}>
            <span className="text-xs flex-1" style={{ color: 'var(--accent)' }}>📝 Восстановлен черновик (фото не сохраняются)</span>
            <button type="button" onClick={() => {
              setTitle(''); setQuery(''); setCategory('chat'); setDuration(1)
              localStorage.removeItem(DRAFT_KEY); setShowRestoreBar(false)
            }} className="text-xs" style={{ color: 'var(--hint)' }}>Очистить</button>
          </div>
        )}

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
              onChange={e => setTitle(e.target.value.slice(0, 200))}
              placeholder="Играем в волейбол на поляне…"
              rows={2} autoFocus
              className="w-full rounded-2xl px-4 py-3 text-sm resize-none outline-none"
              style={{ background: 'var(--bg-2)', color: 'var(--text)', border: '1px solid var(--bg-3)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--bg-3)'}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs" style={{ color: title.length > 80 ? 'var(--warning)' : 'var(--hint)' }}>
                {title.length}/200
              </span>
            </div>
          </div>

          {/* Фото */}
          <div className="mb-4">
            <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block"
                   style={{ color: 'var(--accent)' }}>Фото (до {maxPhotos})</label>

            <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden"
                   onChange={e => {
                     const files = Array.from(e.target.files).slice(0, maxPhotos - photoFiles.length)
                     files.forEach(f => addPhoto(f))
                     e.target.value = ''
                   }} />

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
              {photoFiles.length < maxPhotos && (
                <button type="button" onClick={() => galleryInputRef.current?.click()}
                        className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-2xl transition active:scale-95"
                        style={{ width: 80, height: 80, background: 'var(--bg-2)', border: '1.5px dashed var(--bg-3)', color: 'var(--hint)' }}>
                  <span style={{ fontSize: 22 }}>🖼️</span>
                  <span style={{ fontSize: 10 }}>Галерея</span>
                </button>
              )}
            </div>

            {photoFiles.length < maxPhotos && (
              <button type="button" onClick={async () => {
                if (isCapacitor) {
                  try { const file = await takePhotoNative(); addPhoto(file) } catch {}
                } else { setShowCamera(true) }
              }}
                      className="flex items-center gap-2 text-sm py-2.5 px-4 rounded-2xl transition active:scale-95"
                      style={{ background: 'var(--bg-2)', color: 'var(--accent)', border: '1px solid var(--bg-3)' }}>
                <span>📸</span>
                <span>Сделать снимок сейчас</span>
              </button>
            )}


            {/* Бизнес: золотой пин */}
            {isBusiness && (
              <div className="rounded-2xl px-4 py-3 mt-1"
                   style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold" style={{ color: '#FFD700' }}>⭐ Вам доступен золотой пин партнёра</p>
                  <button type="button" onClick={() => setUseBusinessPin(v => !v)}
                          className="w-12 h-6 rounded-full flex items-center transition-all duration-200 flex-shrink-0"
                          style={{ background: useBusinessPin ? '#FFD700' : 'var(--bg-3)', padding: '2px' }}>
                    <div className="w-5 h-5 rounded-full bg-white transition-all duration-200"
                         style={{ transform: useBusinessPin ? 'translateX(24px)' : 'translateX(0)' }} />
                  </button>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--hint)' }}>
                  Что это даёт: пин выделяется золотистым цветом и пульсацией на карте, до 5 фото и 1 видео в событии, продолжительность события до 5 часов.
                </p>
              </div>
            )}
          </div>

          {/* Адрес */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider"
                     style={{ color: 'var(--accent)' }}>Адрес события</label>
              <button type="button" onClick={() => setShowMapPicker(true)}
                      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-xl transition active:scale-90"
                      style={{ background: 'var(--bg-2)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                🗺 Выбрать на карте
              </button>
            </div>
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
                          className="w-full text-left px-4 py-3 text-sm flex items-start gap-3 transition active:opacity-60"
                          style={{ color: 'var(--text)', borderBottom: i < suggestions.length - 1 ? '1px solid var(--bg-3)' : 'none' }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0, fontSize: 13, marginTop: 1 }}>📍</span>
                    <span style={{ wordBreak: 'break-word' }}>{s}</span>
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
                <div>
                  <p className="text-xs" style={{ color: 'var(--hint)' }}>📍 Оставь пустым — используем твоё местоположение</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--hint)' }}>🗺 Или нажми «Выбрать на карте» чтобы тыкнуть на точку</p>
                </div>
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
              {durations.map(d => (
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
          <button type="button"
                  disabled={!title.trim() || isSubmitting}
                  onClick={e => { document.activeElement?.blur(); handleSubmit(e) }}
                  className="w-full py-4 rounded-2xl text-sm font-black transition active:scale-95 disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: '#111827', boxShadow: '0 0 24px var(--accent-glow)' }}>
            {uploading ? '📸 Загружаю фото…' : geocoding ? '🔍 Определяю адрес…' : loading ? '⏳ Публикую…' : '🚀 Опубликовать'}
          </button>
        </form>
      </SwipeToClose>
    </>
  )
}

function SwipeToClose({ onClose, children }) {
  const [ty, setTy] = useState(0)
  const startY = useRef(0)
  const startTime = useRef(0)
  const isDragging = useRef(false)

  return (
    <div
      onTouchStart={e => {
        if (e.target.closest('button,a,input,textarea,select')) return
        startY.current = e.touches[0].clientY
        startTime.current = Date.now()
        isDragging.current = true
      }}
      onTouchMove={e => {
        if (!isDragging.current) return
        const d = e.touches[0].clientY - startY.current
        if (d > 0) setTy(d)
      }}
      onTouchEnd={() => {
        if (!isDragging.current) return
        isDragging.current = false
        const elapsed = Math.max(1, Date.now() - startTime.current)
        const velocity = ty / elapsed
        if (ty > 300 || (ty > 150 && velocity > 0.6)) onClose()
        else setTy(0)
      }}
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
        borderRadius: '24px 24px 0 0',
        background: 'rgba(17,24,39,0.98)',
        border: '1px solid var(--border)', borderBottom: 'none',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        maxHeight: '92vh', overflowY: 'auto',
        transform: `translateY(${ty}px)`,
        transition: ty === 0 ? 'transform 0.3s ease' : 'none',
      }}>
      {children}
    </div>
  )
}
