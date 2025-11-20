// Тестовый скрипт для проверки подключения к Supabase и таблице audit_logs
// Запустите этот скрипт в консоли браузера на странице аудита

console.log('=== Тест подключения к Supabase ===');

// Проверяем доступность Supabase клиента
try {
  const { supabase } = await import('./src/utils/supabaseClient.js');
  console.log('✅ Supabase клиент загружен:', supabase);
  
  // Проверяем подключение
  const { data, error } = await supabase.from('audit_logs').select('count').limit(1);
  
  if (error) {
    console.error('❌ Ошибка подключения к таблице audit_logs:', error);
  } else {
    console.log('✅ Подключение к таблице audit_logs успешно');
  }
  
  // Проверяем права доступа
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    console.error('❌ Ошибка получения пользователя:', userError);
  } else {
    console.log('✅ Пользователь получен:', userData.user?.email);
  }
  
} catch (err) {
  console.error('❌ Ошибка загрузки Supabase клиента:', err);
}

console.log('=== Конец теста ===');



















