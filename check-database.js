import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Проверка подключения к базе данных Supabase...\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Ошибка: Переменные окружения не найдены');
  console.error('Проверьте наличие VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env файле');
  process.exit(1);
}

console.log('📋 Конфигурация:');
console.log(`URL: ${supabaseUrl}`);
console.log(`Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
console.log('');

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
    console.log(`🔍 Проверяем таблицу: ${tableName}`);
    
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${tableName}: ${error.message}`);
      return { table: tableName, accessible: false, error: error.message };
    } else {
      console.log(`✅ ${tableName}: доступна (записей: ${count || 0})`);
      return { table: tableName, accessible: true, count: count || 0 };
    }
  } catch (err) {
    console.log(`❌ ${tableName}: ${err.message}`);
    return { table: tableName, accessible: false, error: err.message };
  }
}

async function checkDatabaseConnection() {
  try {
    // Проверяем базовое подключение
    console.log('🔗 Проверяем базовое подключение...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError && authError.message !== 'Invalid JWT: JWTExpired') {
      console.log(`⚠️  Аутентификация: ${authError.message}`);
    } else {
      console.log('✅ Базовое подключение установлено');
    }
    
    console.log('\n📊 Проверяем доступность таблиц:\n');
    
    // Проверяем каждую таблицу
    const results = [];
    for (const table of tablesToCheck) {
      const result = await checkTableAccess(table);
      results.push(result);
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
    process.exit(1);
  }
}

// Запускаем проверку
checkDatabaseConnection();