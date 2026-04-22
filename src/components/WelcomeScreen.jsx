import LogoFull from './Logo'

export default function WelcomeScreen({ onAuth, onSkip }) {
  const features = [
    { icon: '🔥', title: 'Живые события', desc: 'Исчезают через 1–3 часа — только актуальное' },
    { icon: '📍', title: 'Рядом с тобой', desc: 'Только то, что происходит в твоём районе' },
    { icon: '💬', title: 'Общайся на месте', desc: 'Чат внутри каждого события' },
  ]

  return (
    <div className="absolute inset-0 z-[60] flex flex-col"
         style={{ background: 'rgba(10,14,23,0.96)', backdropFilter: 'blur(8px)' }}>

      {/* Top — logo */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12">
        <div className="flex flex-col items-center mb-4"
             style={{ filter: 'drop-shadow(0 0 28px rgba(0,255,255,0.35))' }}>
          <LogoFull iconSize={80} fontSize={28} />
        </div>
        <p className="text-base text-center leading-relaxed mb-10"
           style={{ color: 'var(--hint)', maxWidth: 280 }}>
          Живые события вокруг тебя — возникают и исчезают как искры
        </p>

        {/* Features */}
        <div className="w-full flex flex-col gap-3 mb-2" style={{ maxWidth: 360 }}>
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl px-4 py-3"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{f.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--hint)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom — buttons */}
      <div className="px-6 pb-10 flex flex-col gap-3"
           style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))' }}>
        <button onClick={() => onAuth('register')}
                className="w-full py-4 rounded-2xl text-sm font-black transition active:scale-95"
                style={{ background: 'var(--accent)', color: '#111827', boxShadow: '0 0 28px var(--accent-glow)' }}>
          ✨ Создать аккаунт
        </button>

        <button onClick={() => onAuth('login')}
                className="w-full py-4 rounded-2xl text-sm font-bold transition active:scale-95"
                style={{ background: 'rgba(34,211,238,0.08)', color: 'var(--accent)', border: '1px solid rgba(34,211,238,0.25)' }}>
          🚀 Войти
        </button>

        <button onClick={onSkip}
                className="w-full py-3 text-sm transition active:opacity-60"
                style={{ color: 'var(--hint)' }}>
          Просто посмотреть карту →
        </button>
      </div>
    </div>
  )
}
