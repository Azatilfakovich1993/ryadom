export const ACHIEVEMENTS = {
  first_spark: {
    icon: '🔥',
    title: 'Первая искра',
    desc: 'Ты зажёг своё первое событие в районе',
    hint: 'Создай своё первое событие',
  },
  activist: {
    icon: '⚡',
    title: 'Активист',
    desc: 'Уже 3 события — район начинает тебя замечать',
    hint: 'Создай 3 события',
  },
  legend: {
    icon: '🏆',
    title: 'Легенда района',
    desc: '10 событий — ты двигаешь весь район',
    hint: 'Создай 10 событий',
  },
  soul: {
    icon: '🗣️',
    title: 'Душа компании',
    desc: 'Общаешься больше всех — район тебя любит',
    hint: 'Отправь 20 сообщений в чатах',
  },
  early_bird: {
    icon: '🌅',
    title: 'Ранняя пташка',
    desc: 'Первый в районе с самого утра',
    hint: 'Открой приложение до 7:00',
  },
  night_owl: {
    icon: '🦉',
    title: 'Ночная птица',
    desc: 'Не спится? Кто-то должен следить за районом',
    hint: 'Открой приложение после 00:00',
  },
  logo_secret: {
    icon: '👾',
    title: 'Пасхалка найдена',
    desc: 'Ты нашёл секрет логотипа. Мы знали, что найдёшь',
    hint: 'Найди секрет в приложении',
  },
}

function getList() {
  try { return JSON.parse(localStorage.getItem('ryadom_achievements') || '[]') } catch { return [] }
}

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

export function getMessageCount() {
  return parseInt(localStorage.getItem('ryadom_msg_count') || '0', 10)
}

export function incrementMessageCount() {
  const next = getMessageCount() + 1
  localStorage.setItem('ryadom_msg_count', String(next))
  return next
}
