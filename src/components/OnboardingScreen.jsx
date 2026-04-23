import { useState } from 'react'

const SLIDES = [
  {
    emoji: '📍',
    title: 'RYADOM',
    subtitle: 'Живые события рядом с тобой',
    desc: 'Узнавай что происходит в твоём районе прямо сейчас — встречи, спорт, еда, помощь.',
    color: '#22d3ee',
  },
  {
    emoji: '🗺',
    title: 'Карта импульсов',
    subtitle: 'Нажми на любой пин',
    desc: 'Каждый маркер — живое событие рядом. Нажми чтобы узнать подробности и написать в чат.',
    color: '#3b82f6',
  },
  {
    emoji: '▤',
    title: 'Режим ленты',
    subtitle: 'Листай как Reels',
    desc: 'Переключись в ленту — листай события одно за другим, отсортированные по расстоянию.',
    color: '#a855f7',
  },
  {
    emoji: '⚡',
    title: 'Создай импульс',
    subtitle: 'Нажми + и зажги район',
    desc: 'Любой может создать событие. Выбери категорию, напиши название — и оно появится на карте.',
    color: '#f59e0b',
  },
]

export default function OnboardingScreen({ onDone }) {
  const [idx, setIdx] = useState(0)
  const slide = SLIDES[idx]
  const isLast = idx === SLIDES.length - 1

  return (
    <div className="absolute inset-0 z-[100] flex flex-col"
         style={{ background: 'rgba(10,14,23,0.97)', backdropFilter: 'blur(24px)' }}>

      {/* Skip */}
      <button onClick={onDone}
              className="absolute top-4 right-4 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-90"
              style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
        Пропустить
      </button>

      {/* Dots */}
      <div className="flex justify-center gap-2 pt-6">
        {SLIDES.map((_, i) => (
          <div key={i} className="rounded-full transition-all duration-300"
               style={{
                 width: i === idx ? 20 : 6,
                 height: 6,
                 background: i === idx ? slide.color : 'var(--bg-3)',
               }} />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="mb-6 rounded-3xl flex items-center justify-center"
             style={{
               width: 100, height: 100,
               background: slide.color + '18',
               border: `2px solid ${slide.color}44`,
               boxShadow: `0 0 40px ${slide.color}33`,
               fontSize: 48,
             }}>
          {slide.emoji}
        </div>

        <h1 className="text-3xl font-black mb-2" style={{ color: slide.color }}>
          {slide.title}
        </h1>
        <p className="text-base font-semibold mb-4" style={{ color: 'var(--text)' }}>
          {slide.subtitle}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--hint)', maxWidth: 300 }}>
          {slide.desc}
        </p>
      </div>

      {/* Button */}
      <div className="px-6 pb-10">
        <button
          onClick={() => isLast ? onDone() : setIdx(i => i + 1)}
          className="w-full py-4 rounded-2xl text-base font-black transition active:scale-95"
          style={{
            background: slide.color,
            color: '#111827',
            boxShadow: `0 0 24px ${slide.color}55`,
          }}>
          {isLast ? '🚀 Начать' : 'Далее →'}
        </button>
      </div>
    </div>
  )
}
