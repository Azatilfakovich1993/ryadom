import { useEffect, useState } from 'react'
import { ACHIEVEMENTS } from '../utils/achievements'

export default function AchievementToast({ id, onDone }) {
  const [visible, setVisible] = useState(false)
  const ach = ACHIEVEMENTS[id]

  useEffect(() => {
    const showT = setTimeout(() => setVisible(true), 40)
    const hideT = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 350)
    }, 4200)
    return () => { clearTimeout(showT); clearTimeout(hideT) }
  }, [id])

  if (!ach) return null

  return (
    <div
      onClick={() => { setVisible(false); setTimeout(onDone, 350) }}
      style={{
        position: 'absolute',
        top: visible ? 96 : 64,
        left: '50%',
        transform: 'translateX(-50%)',
        opacity: visible ? 1 : 0,
        transition: 'top 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
        zIndex: 95,
        background: 'rgba(10,14,23,0.97)',
        border: '1.5px solid rgba(34,211,238,0.5)',
        borderRadius: 20,
        padding: '12px 18px 12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 32px rgba(0,0,0,0.7), 0 0 24px rgba(34,211,238,0.2)',
        cursor: 'pointer',
        userSelect: 'none',
        minWidth: 220,
        maxWidth: 320,
      }}
    >
      <span style={{ fontSize: 34, lineHeight: 1, flexShrink: 0 }}>{ach.icon}</span>
      <div>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          color: 'var(--accent)', marginBottom: 3, textTransform: 'uppercase',
        }}>
          ✨ Достижение разблокировано
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
          {ach.title}
        </p>
        <p style={{ fontSize: 11, color: 'var(--hint)', lineHeight: 1.4 }}>
          {ach.desc}
        </p>
      </div>
    </div>
  )
}
