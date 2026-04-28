export default function PrivacyPolicy({ onClose }) {
  return (
    <div className="absolute inset-0 z-[90] flex flex-col"
         style={{ background: 'rgba(10,14,23,0.98)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
           style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition active:scale-90"
                style={{ background: 'var(--bg-2)', color: 'var(--hint)', border: '1px solid var(--bg-3)' }}>
          ←
        </button>
        <h2 className="text-base font-bold" style={{ color: 'var(--accent)' }}>Политика конфиденциальности</h2>
      </div>

      <div className="overflow-y-auto flex-1 px-5 py-4 text-sm leading-relaxed"
           style={{ color: 'var(--text)' }}>

        <p className="mb-4" style={{ color: 'var(--hint)' }}>Последнее обновление: апрель 2026 г.</p>

        <Section title="1. Общие положения">
          Настоящая Политика конфиденциальности регулирует порядок обработки персональных данных пользователей
          приложения RYADOM (далее — «Приложение»). Используя Приложение, вы соглашаетесь с условиями
          настоящей Политики в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».
        </Section>

        <Section title="2. Какие данные мы собираем">
          <ul className="list-disc pl-4 flex flex-col gap-1">
            <li>Имя пользователя (логин) и отображаемое имя</li>
            <li>Адрес электронной почты (в служебных целях, формат: логин@ryadom.app)</li>
            <li>Фотография профиля (по желанию пользователя)</li>
            <li>Геолокация (только во время использования приложения, для отображения событий рядом)</li>
            <li>Созданные события и сообщения в чатах событий</li>
            <li>Город и краткое описание профиля (по желанию)</li>
          </ul>
        </Section>

        <Section title="3. Цели обработки данных">
          <ul className="list-disc pl-4 flex flex-col gap-1">
            <li>Идентификация пользователя в приложении</li>
            <li>Отображение событий в радиусе от местоположения пользователя</li>
            <li>Обеспечение возможности общения между участниками событий</li>
            <li>Улучшение работы приложения</li>
          </ul>
        </Section>

        <Section title="4. Передача данных третьим лицам">
          Мы не продаём и не передаём ваши персональные данные третьим лицам. Данные хранятся
          в сервисе Google Firebase. Серверная инфраструктура расположена в регионе Europe West.
        </Section>

        <Section title="5. Хранение данных">
          Данные хранятся до момента удаления аккаунта пользователем. При удалении аккаунта
          все персональные данные удаляются безвозвратно в течение 30 дней.
        </Section>

        <Section title="6. Права пользователя">
          В соответствии с 152-ФЗ вы имеете право:
          <ul className="list-disc pl-4 flex flex-col gap-1 mt-1">
            <li>Получить информацию об обрабатываемых данных</li>
            <li>Исправить неточные данные</li>
            <li>Удалить свои данные (удаление аккаунта в настройках профиля)</li>
            <li>Отозвать согласие на обработку персональных данных</li>
          </ul>
        </Section>

        <Section title="7. Геолокация">
          Приложение запрашивает доступ к геолокации только во время работы. Координаты
          используются исключительно для отображения событий рядом и не хранятся на серверах.
        </Section>

        <Section title="8. Контакты">
          По вопросам обработки персональных данных обращайтесь: azatilfakovich1993@gmail.com
        </Section>

        <div className="h-8" />
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <p className="font-bold mb-2" style={{ color: 'var(--accent)' }}>{title}</p>
      <div style={{ color: 'var(--text)' }}>{children}</div>
    </div>
  )
}
