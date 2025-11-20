import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkDatabase = async () => {
  // Подключаемся к базе данных postgres (системная база) для проверки
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // Подключаемся к системной базе
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    console.log('🔍 Проверка подключения к PostgreSQL...');
    
    // Проверяем подключение
    const testResult = await adminPool.query('SELECT version()');
    console.log('✅ PostgreSQL подключен успешно');
    console.log(`   Версия: ${testResult.rows[0].version.split(' ')[0]} ${testResult.rows[0].version.split(' ')[1]}`);
    
    // Проверяем, существует ли база данных microclimat
    const dbName = process.env.DB_NAME || 'microclimat';
    console.log(`\n🔍 Проверка существования базы данных "${dbName}"...`);
    
    const dbCheckResult = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    
    if (dbCheckResult.rows.length > 0) {
      console.log(`✅ База данных "${dbName}" уже существует`);
      
      // Проверяем подключение к целевой базе
      const targetPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: dbName,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
      });
      
      try {
        await targetPool.query('SELECT 1');
        console.log(`✅ Подключение к базе данных "${dbName}" успешно`);
        
        // Проверяем наличие таблиц
        const tablesResult = await targetPool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `);
        
        if (tablesResult.rows.length > 0) {
          console.log(`\n📊 Найдено таблиц: ${tablesResult.rows.length}`);
          console.log('   Таблицы:', tablesResult.rows.map(r => r.table_name).join(', '));
        } else {
          console.log(`\n⚠️  База данных "${dbName}" пуста (нет таблиц)`);
          console.log('   Необходимо выполнить SQL скрипты для создания таблиц');
        }
        
        await targetPool.end();
      } catch (error) {
        console.error(`❌ Ошибка подключения к базе "${dbName}":`, (error as Error).message);
      }
      
    } else {
      console.log(`❌ База данных "${dbName}" не найдена`);
      console.log(`\n🔧 Создание базы данных "${dbName}"...`);
      
      // Создаем базу данных
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ База данных "${dbName}" успешно создана`);
      console.log(`\n⚠️  Необходимо выполнить SQL скрипты для создания таблиц`);
    }
    
    await adminPool.end();
    console.log('\n✅ Проверка завершена');
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Ошибка при проверке базы данных:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   PostgreSQL сервер не запущен или недоступен');
      console.error('   Убедитесь, что PostgreSQL запущен и доступен на указанном хосте и порту');
    } else if (error.code === '28P01') {
      console.error('   Неверные учетные данные (пользователь/пароль)');
    } else if (error.code === '3D000') {
      console.error('   База данных не существует');
    } else {
      console.error(`   ${error.message}`);
    }
    
    console.error('\n📝 Проверьте настройки в файле .env:');
    console.error('   DB_HOST=', process.env.DB_HOST || 'localhost');
    console.error('   DB_PORT=', process.env.DB_PORT || '5432');
    console.error('   DB_USER=', process.env.DB_USER || 'postgres');
    console.error('   DB_NAME=', process.env.DB_NAME || 'microclimat');
    console.error('   DB_PASSWORD=', process.env.DB_PASSWORD ? '***' : 'не установлен');
    
    await adminPool.end();
    process.exit(1);
  }
};

checkDatabase();


