import { useEffect, useState } from 'react'

export function useTelegram() {
  const [tg, setTg] = useState(null)
  const [user, setUser] = useState(null)
  const [isTMA, setIsTMA] = useState(false)
  const [colorScheme, setColorScheme] = useState('light')

  useEffect(() => {
    const webApp = window?.Telegram?.WebApp
    if (!webApp) return

    webApp.ready()
    webApp.expand()

    setTg(webApp)
    setIsTMA(true)
    setUser(webApp.initDataUnsafe?.user ?? null)
    setColorScheme(webApp.colorScheme ?? 'light')

    // Sync Telegram theme CSS vars
    const applyTheme = () => {
      const params = webApp.themeParams ?? {}
      const root = document.documentElement.style
      if (params.bg_color)            root.setProperty('--tg-theme-bg-color', params.bg_color)
      if (params.text_color)          root.setProperty('--tg-theme-text-color', params.text_color)
      if (params.hint_color)          root.setProperty('--tg-theme-hint-color', params.hint_color)
      if (params.link_color)          root.setProperty('--tg-theme-link-color', params.link_color)
      if (params.button_color)        root.setProperty('--tg-theme-button-color', params.button_color)
      if (params.button_text_color)   root.setProperty('--tg-theme-button-text-color', params.button_text_color)
      if (params.secondary_bg_color)  root.setProperty('--tg-theme-secondary-bg-color', params.secondary_bg_color)
    }

    applyTheme()
    webApp.onEvent('themeChanged', applyTheme)
    return () => webApp.offEvent('themeChanged', applyTheme)
  }, [])

  const haptic = (type = 'impact', style = 'light') => {
    tg?.HapticFeedback?.[type]?.({ impact_style: style })
  }

  return { tg, user, isTMA, colorScheme, haptic }
}
