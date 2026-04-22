import { CATEGORY_CONFIG } from './MapComponent'

function timeLeft(expiresAt) {
  const ms = Math.max(0, new Date(expiresAt) - Date.now())
  const m = Math.floor(ms / 60000)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h} ч ${m % 60} мин`
  return `${m} мин`
}

export default function ClusterSheet({ events, onSelect, onClose }) {
  return (
    <>
      <div className="absolute inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl"
           style={{
             background: 'rgba(17,24,39,0.97)',
             backdropFilter: 'blur(24px)',
             border: '1px solid var(--border)',
             borderBottom: 'none',
             boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 0 40px rgba(34,211,238,0.06)',
             paddingBottom: 'env(safe-area-inset-bottom, 16px)',
           }}>

        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-[3px] rounded-full" style={{ background: 'var(--bg-3)' }} />
        </div>

        <div className="px-5 pb-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>
            {events.length} события в этом месте
          </p>

          <div className="flex flex-col gap-2">
            {events.map(event => {
              const cfg = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.chat
              return (
                <button key={event.id} onClick={() => onSelect(event)}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition active:scale-95"
                        style={{ background: 'var(--bg-2)', border: '1px solid var(--bg-3)' }}>
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: cfg.color + '22', border: `1px solid ${cfg.color}33` }}>
                    {cfg.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{event.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--hint)' }}>
                      {cfg.label} · ⏱ {timeLeft(event.expires_at)}
                    </p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }}
                       fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
