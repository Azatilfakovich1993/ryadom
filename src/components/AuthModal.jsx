import { useState } from 'react'
import { signIn, signUp, checkUsername } from '../lib/firebase'

function mapError(err) {
  const msg = err?.message ?? ''
  if (msg.includes('already registered') || msg.includes('already exists')) return 'Этот логин уже занят'
  if (msg.includes('Invalid login credentials') || msg.includes('invalid')) return 'Неверное имя или пароль'
  if (msg.includes('Password')) return 'Пароль минимум 6 символов'
  return msg || 'Что-то пошло не так'
}

export default function AuthModal({ onClose, onAuth }) {
  const [mode, setMode]               = useState('login')
  const [username, setUsername]       = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword]       = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const uname = username.trim().toLowerCase()

    if (!/^[a-z0-9_]{3,20}$/.test(uname)) {
      setError('Логин: 3-20 символов, только буквы a-z, цифры, _')
      return
    }
    if (password.length < 6) {
      setError('Пароль: минимум 6 символов')
      return
    }
    if (mode === 'register' && !displayName.trim()) {
      setError('Укажи имя')
      return
    }

    setLoading(true)
    try {
      if (mode === 'register') {
        const available = await checkUsername(uname)
        if (!available) { setError('Этот логин уже занят'); setLoading(false); return }
        const user = await signUp(uname, password, displayName.trim())
        onAuth(user)
      } else {
        // Retry login up to 3 times for slow proxy (VK/TG without VPN)
        let lastErr
        for (let i = 0; i < 3; i++) {
          try {
            const user = await signIn(uname, password)
            onAuth(user)
            return
          } catch (err) {
            lastErr = err
            // Don't retry on wrong credentials
            if (err?.message?.includes('Invalid') || err?.message?.includes('invalid')) throw err
            if (i < 2) await new Promise(r => setTimeout(r, 2000))
          }
        }
        throw lastErr
      }
    } catch (err) {
      setError(mapError(err))
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m) => { setMode(m); setError('') }

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
           }}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-[3px] rounded-full" style={{ background: 'var(--bg-3)' }} />
        </div>

        <form onSubmit={handleSubmit} className="px-5 pt-3 pb-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
              {mode === 'login' ? 'Войти' : 'Регистрация'}
            </h2>
            <button type="button" onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition active:scale-90"
                    style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{ background: 'var(--bg-2)' }}>
            {[['login', 'Войти'], ['register', 'Создать аккаунт']].map(([m, label]) => (
              <button key={m} type="button" onClick={() => switchMode(m)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                      style={{
                        background: mode === m ? 'var(--accent)' : 'transparent',
                        color: mode === m ? '#111827' : 'var(--hint)',
                      }}>
                {label}
              </button>
            ))}
          </div>

          {mode === 'register' && (
            <div className="mb-3">
              <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block"
                     style={{ color: 'var(--accent)' }}>Как тебя зовут?</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value.slice(0, 30))}
                     placeholder="Иван Иванов"
                     className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                     style={{ background: 'var(--bg-2)', color: 'var(--text)', border: '1px solid var(--bg-3)' }}
                     onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                     onBlur={e => e.target.style.borderColor = 'var(--bg-3)'} />
            </div>
          )}

          <div className="mb-3">
            <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block"
                   style={{ color: 'var(--accent)' }}>Логин</label>
            <input value={username} onChange={e => setUsername(e.target.value.slice(0, 20))}
                   placeholder="kolya_izh"
                   autoCapitalize="none" autoCorrect="off" spellCheck="false"
                   className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                   style={{ background: 'var(--bg-2)', color: 'var(--text)', border: '1px solid var(--bg-3)' }}
                   onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                   onBlur={e => e.target.style.borderColor = 'var(--bg-3)'} />
            {mode === 'register' && (
              <p className="text-xs mt-1" style={{ color: 'var(--hint)' }}>Только буквы a–z, цифры, _  ·  3–20 символов</p>
            )}
          </div>

          <div className="mb-5">
            <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block"
                   style={{ color: 'var(--accent)' }}>Пароль</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                   placeholder="Минимум 6 символов"
                   className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                   style={{ background: 'var(--bg-2)', color: 'var(--text)', border: '1px solid var(--bg-3)' }}
                   onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                   onBlur={e => e.target.style.borderColor = 'var(--bg-3)'} />
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-2xl text-sm"
                 style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.3)' }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" disabled={loading}
                  className="w-full py-4 rounded-2xl text-sm font-black transition active:scale-95 disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: '#111827', boxShadow: '0 0 24px var(--accent-glow)' }}>
            {loading ? '⏳ Загрузка…' : mode === 'login' ? '🚀 Войти' : '✨ Создать аккаунт'}
          </button>
        </form>
      </div>
    </>
  )
}
