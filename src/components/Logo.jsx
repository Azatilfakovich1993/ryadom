import { useId } from 'react'

// Пин-тело: капля вниз, центр головки в (50,42), радиус 13, кончик на y=72
const PIN = [
  'M 50,29',
  'C 43,29 37,35 37,42',
  'C 37,52 50,72 50,72',
  'C 50,72 63,52 63,42',
  'C 63,35 57,29 50,29',
  'Z',
].join(' ')

// Дуга (270°) вокруг центра с пробелом внизу (45°–135°)
function arcPath(r) {
  const cx = 50, cy = 42
  const rad = d => d * Math.PI / 180
  const x1 = (cx + r * Math.cos(rad(135))).toFixed(2)
  const y1 = (cy + r * Math.sin(rad(135))).toFixed(2)
  const x2 = (cx + r * Math.cos(rad(45))).toFixed(2)
  const y2 = (cy + r * Math.sin(rad(45))).toFixed(2)
  // large-arc=1, sweep=1 (по часовой, длинный путь через верх и стороны)
  return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`
}

export function LogoIcon({ size = 48 }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '_')

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Градиент: снизу тёмно-синий → сверху ярко-голубой, в координатах SVG */}
        <linearGradient id={`${uid}g`} x1="50" y1="75" x2="50" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0869A6" />
          <stop offset="55%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#00E5FF" />
        </linearGradient>

        {/* Мягкое свечение для дуг */}
        <filter id={`${uid}gl`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        {/* Сильное свечение для центральной точки */}
        <filter id={`${uid}gs`} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        {/* Клип: всё пространство минус тело пина (evenodd = вырез) */}
        <clipPath id={`${uid}c`}>
          <path clipRule="evenodd" d={`M 0,0 H 100 V 100 H 0 Z ${PIN}`} />
        </clipPath>
      </defs>

      {/* Дуги-радар — рисуются только снаружи пина */}
      <g clipPath={`url(#${uid}c)`} filter={`url(#${uid}gl)`}>
        <path d={arcPath(30)} stroke={`url(#${uid}g)`} strokeWidth="2.2" opacity="0.42" strokeLinecap="round" />
        <path d={arcPath(22)} stroke={`url(#${uid}g)`} strokeWidth="2.6" opacity="0.72" strokeLinecap="round" />
        <path d={arcPath(15)} stroke={`url(#${uid}g)`} strokeWidth="3"   opacity="1"    strokeLinecap="round" />
      </g>

      {/* Контур пина */}
      <path d={PIN} stroke={`url(#${uid}g)`} strokeWidth="2.4" fill="none" strokeLinejoin="round" />

      {/* Центральная точка */}
      <circle cx="50" cy="42" r="5.5" fill={`url(#${uid}g)`} filter={`url(#${uid}gs)`} />
      <circle cx="48" cy="40" r="2" fill="white" opacity="0.45" />
    </svg>
  )
}

export function LogoText({ fontSize = 28 }) {
  return (
    <span style={{
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 900,
      fontSize,
      color: '#ffffff',
      letterSpacing: '0.12em',
      lineHeight: 1,
    }}>
      RYADOM
    </span>
  )
}

// Полный логотип: иконка + надпись (для сплеш-экрана)
export default function LogoFull({ iconSize = 108, fontSize = 26 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <LogoIcon size={iconSize} />
      <LogoText fontSize={fontSize} />
    </div>
  )
}
