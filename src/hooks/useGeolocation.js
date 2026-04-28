import { useEffect, useState, useCallback, useRef } from 'react'
import bridge from '@vkontakte/vk-bridge'
import { Geolocation } from '@capacitor/geolocation'

const isCapacitor = window.Capacitor?.isNativePlatform?.() ?? false

async function getVKLocation() {
  const data = await bridge.send('VKWebAppGetGeodata')
  if (data.available && data.lat && data.long) {
    return { lat: data.lat, lon: data.long }
  }
  throw new Error('VK geo unavailable')
}

function waitForYmaps(ms = 6000) {
  return new Promise((resolve, reject) => {
    if (window.ymaps) return resolve(window.ymaps)
    const start = Date.now()
    const iv = setInterval(() => {
      if (window.ymaps) { clearInterval(iv); resolve(window.ymaps) }
      else if (Date.now() - start > ms) { clearInterval(iv); reject() }
    }, 200)
  })
}

async function getYandexLocation() {
  const ymaps = await waitForYmaps(6000)
  await new Promise(r => ymaps.ready(r))
  const result = await ymaps.geolocation.get({
    provider: 'yandex',
    mapStateAutoApply: false,
    autoReverseGeocode: false,
  })
  const coords = result.geoObjects.get(0)?.geometry?.getCoordinates?.()
  if (!coords?.[0] || !coords?.[1]) throw new Error('no coords')
  return { lat: coords[0], lon: coords[1] }
}

export function useGeolocation(tg) {
  const [location, setLocation] = useState(null)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [denied, setDenied]     = useState(false)
  const resolvedRef             = useRef(false)

  const requestLocation = useCallback(() => {
    setLoading(true)
    setError(null)
    setDenied(false)
    resolvedRef.current = false

    const resolve = (loc) => {
      if (resolvedRef.current) return
      resolvedRef.current = true
      setLocation(loc)
      setDenied(false)
      setLoading(false)
    }

    const doRequest = () => {
      if (!navigator.geolocation) {
        setDenied(true); setLoading(false); return
      }

      // Таймер: если за 3 сек браузер не ответил — Яндекс геолокация
      const fallbackTimer = setTimeout(async () => {
        if (resolvedRef.current) return
        try {
          const loc = await getYandexLocation()
          resolve(loc)
          // Продолжаем ждать GPS в фоне для уточнения
        } catch {
          // Яндекс тоже не ответил — ждём браузер дальше
        }
      }, 3000)

      // Быстрый запрос (WiFi/IP)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(fallbackTimer)
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        },
        (err) => {
          clearTimeout(fallbackTimer)
          if (err.code === 1) { setDenied(true); setLoading(false) }
          // При timeout/unavailable — Яндекс уже запущен по таймеру
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      )

      // Точный GPS в параллель (уточняет позицию когда придёт)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(fallbackTimer)
          // GPS точнее — обновляем даже если уже есть позиция
          resolvedRef.current = false
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        },
        () => { /* GPS не получилось — не страшно */ },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      )
    }

    // Telegram Mini App
    if (tg?.LocationManager?.isInited) {
      tg.LocationManager.getLocation((loc) => {
        if (loc) resolve({ lat: loc.latitude, lon: loc.longitude })
        else doRequest()
      })
      return
    }

    // Capacitor (Android APK)
    if (isCapacitor) {
      Geolocation.requestPermissions().then(() =>
        Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 })
      ).then(pos => {
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      }).catch(() => { setDenied(true); setLoading(false) })
      return
    }

    // VK Mini App
    if (bridge.isWebView?.()) {
      getVKLocation().then(resolve).catch(doRequest)
      return
    }

    doRequest()
  }, [tg])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  return { location, error, loading, denied, refetch: requestLocation }
}
