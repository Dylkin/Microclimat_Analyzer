import React from 'react'
import { supabase } from './lib/supabase'

function App() {
  const testConnection = async () => {
    try {
      // Простая проверка подключения без обращения к таблицам
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.log('Ошибка при проверке сессии:', error.message)
      } else {
        console.log('Supabase успешно подключен!', data)
      }
    } catch (err) {
      console.log('Ошибка подключения к Supabase:', err)
    }
  }

  React.useEffect(() => {
    testConnection()
  }, [])

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#333', marginBottom: '1rem' }}>
          Microclimat Analyzer
        </h1>
        <p style={{ color: '#666' }}>
          Система анализа микроклимата
        </p>
        <p style={{ color: '#999', fontSize: '0.9rem', marginTop: '1rem' }}>
          Supabase подключен. Проверьте консоль для статуса соединения.
        </p>
        <p style={{ color: '#999', fontSize: '0.9rem', marginTop: '1rem' }}>
          Проект очищен и готов к разработке
        </p>
      </div>
    </div>
  )
}

export default App