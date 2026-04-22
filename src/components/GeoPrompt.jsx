export default function GeoPrompt({ onRetry }) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 70,
      background: 'rgba(10,14,23,0.97)',
      backdropFilter: 'blur(16px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'rgba(17,24,39,0.98)',
        border: '1.5px solid rgba(248,113,113,0.3)',
        borderRadius: 28,
        padding: '32px 24px 24px',
        textAlign: 'center',
        boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
      }}>
        {/* Иконка */}
        <div style={{
          width: 72, height: 72,
          borderRadius: '50%',
          background: 'rgba(248,113,113,0.1)',
          border: '1.5px solid rgba(248,113,113,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 32,
        }}>
          📍
        </div>

        <h2 style={{
          fontSize: 20, fontWeight: 800,
          color: 'var(--text)', marginBottom: 10,
        }}>
          Геолокация отключена
        </h2>

        <p style={{
          fontSize: 14, color: 'var(--hint)',
          lineHeight: 1.6, marginBottom: 24,
        }}>
          Приложение не может найти события рядом без доступа к вашему местоположению
        </p>

        {/* Инструкция */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: '16px',
          textAlign: 'left', marginBottom: 20,
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Как включить:
          </p>

          {isIOS ? (
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--hint)', lineHeight: 1.8 }}>
              <li>Настройки → Конфиденциальность</li>
              <li>Службы геолокации → Включить</li>
              <li>Найдите браузер Safari / Chrome</li>
              <li>Выберите «При использовании»</li>
            </ol>
          ) : isAndroid ? (
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--hint)', lineHeight: 1.8 }}>
              <li>Настройки → Приложения → Браузер</li>
              <li>Разрешения → Геолокация</li>
              <li>Выберите «Разрешить»</li>
            </ol>
          ) : (
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--hint)', lineHeight: 1.8 }}>
              <li>Нажмите 🔒 в адресной строке</li>
              <li>Найдите «Геолокация»</li>
              <li>Выберите «Разрешить»</li>
              <li>Обновите страницу</li>
            </ol>
          )}
        </div>

        {/* Кнопки */}
        <button
          onClick={onRetry}
          style={{
            width: '100%', padding: '14px 0',
            borderRadius: 16, border: 'none',
            background: 'var(--accent)', color: '#111827',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 0 20px var(--accent-glow)',
            marginBottom: 10,
          }}
        >
          Попробовать снова
        </button>

        <button
          onClick={() => window.location.reload()}
          style={{
            width: '100%', padding: '12px 0',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--hint)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Обновить страницу
        </button>
      </div>
    </div>
  )
}
