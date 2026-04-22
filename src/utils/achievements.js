export const ACHIEVEMENTS = {
  first_spark: {
    icon: '🔥',
    title: 'Первая искра',
    desc: 'Ты зажёг своё первое событие в районе',
  },
  ten_events: {
    icon: '🏆',
    title: 'Местная легенда',
    desc: 'Уже 10 событий — ты двигаешь район',
  },
  first_word: {
    icon: '💬',
    title: 'Первое слово',
    desc: 'Написал в чат события — разговор начался',
  },
  night_owl: {
    icon: '🦉',
    title: 'Ночная птица',
    desc: 'Не спится? Кто-то должен следить за районом',
  },
  early_bird: {
    icon: '🌅',
    title: 'Ранняя пташка',
    desc: 'Первый в районе с самого утра',
  },
  logo_secret: {
    icon: '👾',
    title: 'Пасхалка найдена',
    desc: 'Ты нашёл секрет логотипа. Мы знали, что найдёшь',
  },
  lone_wolf: {
    icon: '🌑',
    title: 'Передумал',
    desc: 'Удалил своё событие. Бывает — главное зажечь новую',
  },
}

function getList() {
  try { return JSON.parse(localStorage.getItem('ryadom_achievements') || '[]') } catch { return [] }
}

// Разблокировать достижение. Возвращает true если разблокировано впервые
export function tryUnlock(id) {
  const list = getList()
  if (list.includes(id)) return false
  localStorage.setItem('ryadom_achievements', JSON.stringify([...list, id]))
  return true
}

export function isUnlocked(id) {
  return getList().includes(id)
}

export function getAllUnlocked() {
  return getList()
}
