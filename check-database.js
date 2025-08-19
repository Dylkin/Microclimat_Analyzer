import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🚀 Запуск проверки базы данных...');
console.log('📋 Переменные окружения:');
console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'установлена' : 'НЕ НАЙДЕНА');
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'установлена' : 'НЕ НАЙДЕНА');
console.log('');

console.log('🔍 Проверка подключения к базе данных Supabase...\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Ошибка: Переменные окружения не найдены');
  console.error('Проверьте наличие VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env файле');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Список таблиц для проверки
const tablesToCheck = [
  'users',
  'clients', 
  'projects',
  'qualification_objects',
  'qualification_stages',
  'project_activities',
  'project_documents',
  'notifications',
  'uploaded_files',
  'device_metadata',
  'measurement_records',
  'analysis_sessions',
  'chart_settings',
  'vertical_markers'
];

async function checkTableAccess(tableName) {
  try {
    console.log(`🔍 Проверяем таблицу: ${tableName}...`);
    
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${tableName}: ОШИБКА - ${error.message}`);
      return { table: tableName, accessible: false, error: error.message };
    } else {
      console.log(`✅ ${tableName}: ДОСТУПНА (записей: ${count || 0})`);
      return { table: tableName, accessible: true, count: count || 0 };
    }
  } catch (err) {
    console.log(`❌ ${tableName}: ИСКЛЮЧЕНИЕ - ${err.message}`);
    return { table: tableName, accessible: false, error: err.message };
  }
}

async function checkDatabaseConnection() {
  try {
    console.log('⏳ Начинаем проверку...\n');
    
    // Проверяем базовое подключение
    console.log('🔗 Проверяем базовое подключение...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError && authError.message !== 'Invalid JWT: JWTExpired') {
      console.log(`⚠️ Аутентификация: ${authError.message}`);
    } else {
      console.log('✅ Базовое подключение установлено');
    }
    
    console.log('\n📊 Проверяем доступность таблиц:\n');
    
    // Проверяем каждую таблицу
    const results = [];
    let processedCount = 0;
    for (const table of tablesToCheck) {
      const result = await checkTableAccess(table);
      results.push(result);
      processedCount++;
      console.log(`📊 Обработано: ${processedCount}/${tablesToCheck.length}`);
    }
    
    console.log('\n📈 Сводка результатов:');
    console.log('='.repeat(50));
    
    const accessible = results.filter(r => r.accessible);
    const notAccessible = results.filter(r => !r.accessible);
    
    console.log(`✅ Доступных таблиц: ${accessible.length}`);
    console.log(`❌ Недоступных таблиц: ${notAccessible.length}`);
    
    if (accessible.length > 0) {
      console.log('\n✅ Доступные таблицы:');
      accessible.forEach(r => {
        console.log(`   • ${r.table} (записей: ${r.count})`);
      });
    }
    
    if (notAccessible.length > 0) {
      console.log('\n❌ Недоступные таблицы:');
      notAccessible.forEach(r => {
        console.log(`   • ${r.table}: ${r.error}`);
      });
    }
    
    // Проверяем RLS политики
    console.log('\n🔒 Проверяем Row Level Security (RLS):');
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role')
        .limit(1);
        
      if (error) {
        console.log(`⚠️  RLS активен - требуется аутентификация: ${error.message}`);
      } else {
        console.log('✅ RLS настроен корректно или отключен для анонимного доступа');
      }
    } catch (err) {
      console.log(`❌ Ошибка проверки RLS: ${err.message}`);
    }
    
    console.log('\n🎯 Рекомендации:');
    if (notAccessible.length > 0) {
      console.log('• Проверьте RLS политики для недоступных таблиц');
      console.log('• Убедитесь, что анонимный ключ имеет необходимые права');
      console.log('• Проверьте миграции базы данных');
    } else {
      console.log('• Все таблицы доступны! База данных настроена корректно.');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error('Стек ошибки:', error.stack);
    process.exit(1);
  }
}

console.log('🎯 Начинаем проверку базы данных...');

// Запускаем проверку
checkDatabaseConnection()
  .then(() => {
    console.log('\n✅ Проверка завершена успешно!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Проверка завершена с ошибкой:', error);
    process.exit(1);
  });