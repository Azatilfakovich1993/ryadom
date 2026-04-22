export default function PremiumModal({ onClose }) {
  const handleStars = () => {
    console.log('[Premium] Telegram Stars payment initiated')
    alert('Оплата через Telegram Stars — в разработке')
  }
  const handleSBP = () => {
    console.log('[Premium] СБП payment initiated')
    alert('Оплата через СБП — в разработке')
  }

  return (
    <>
      <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 z-[60] rounded-t-3xl"
           style={{
             background: 'rgba(17,24,39,0.98)',
             backdropFilter: 'blur(24px)',
             border: '1px solid rgba(168,85,247,0.25)',
             borderBottom: 'none',
             boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 0 40px rgba(168,85,247,0.08)',
             paddingBottom: 'env(safe-area-inset-bottom, 16px)',
           }}>

        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-[3px] rounded-full" style={{ background: '#374151' }} />
        </div>

        <div className="px-5 pb-5">
          <div className="text-center mb-5">
            <div className="text-4xl mb-2">⭐</div>
            <h2 className="text-xl font-black" style={{ color: '#c084fc' }}>Премиум-размещение</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--hint)' }}>
              Событие закрепится в топе карты на 30 минут
            </p>
          </div>

          <ul className="space-y-2.5 mb-5">
            {[
              ['📍', 'Закреплено в топ-3 ближайших событий'],
              ['🔔', 'Уведомление всем пользователям в 1 км'],
              ['⏱', 'Увеличенный таймер +1 час'],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-center gap-2.5 text-sm"
                  style={{ color: 'var(--text)' }}>
                <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.2)' }}>
                  {icon}
                </span>
                {text}
              </li>
            ))}
          </ul>

          <button onClick={handleStars}
                  className="w-full py-3.5 rounded-2xl font-black text-sm mb-2 transition active:scale-95"
                  style={{ background: '#f59e0b', color: '#111827', boxShadow: '0 0 16px rgba(245,158,11,0.4)' }}>
            ⭐ Telegram Stars · 50 ★
          </button>
          <button onClick={handleSBP}
                  className="w-full py-3.5 rounded-2xl font-black text-sm mb-3 transition active:scale-95"
                  style={{ background: 'var(--success)', color: '#111827', boxShadow: '0 0 16px rgba(52,211,153,0.4)' }}>
            🏦 СБП · 49 ₽
          </button>
          <button onClick={onClose}
                  className="w-full py-3 rounded-2xl text-sm font-semibold transition active:scale-95"
                  style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
            Пропустить
          </button>
        </div>
      </div>
    </>
  )
}
