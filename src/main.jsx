import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import bridge from '@vkontakte/vk-bridge'

// Инициализация VK Bridge если открыто в VK
bridge.send('VKWebAppInit').catch(() => {})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
