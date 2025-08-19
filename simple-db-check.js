// Простая проверка базы данных без сложных зависимостей
console.log('🚀 Начинаем простую проверку базы данных...');

// Проверяем переменные окружения
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('📋 Проверка переменных окружения:');
console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'установлена ✅' : 'НЕ НАЙДЕНА ❌');
console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'установлена ✅' : 'НЕ НАЙДЕНА ❌');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Переменные окружения не настроены!');
  process.exit(1);
}

// Простая проверка подключения через fetch
async function testConnection() {
  try {
    console.log('\n🔍 Тестируем подключение к Supabase...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/users?select=count`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Статус ответа:', response.status);
    console.log('Статус текст:', response.statusText);

    if (response.ok) {
      console.log('✅ Подключение к Supabase успешно!');
      const data = await response.text();
      console.log('Ответ сервера:', data.substring(0, 200) + '...');
    } else {
      console.log('❌ Ошибка подключения:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Детали ошибки:', errorText);
    }

  } catch (error) {
    console.error('❌ Критическая ошибка подключения:', error.message);
  }
}

// Запускаем проверку
testConnection()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  });