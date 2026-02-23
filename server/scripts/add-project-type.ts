import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'microclimat',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function addProjectType() {
  try {
    console.log('🔄 Применение миграции для добавления поля type в таблицу projects...');

    // Читаем файл миграции
    const migrationPath = path.join(__dirname, '../../migrations/20250102000004_add_project_type.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    // Применяем миграцию
    await pool.query(migrationSQL);

    console.log('✅ Миграция успешно применена');
    console.log('✅ Поле type добавлено в таблицу projects');
    console.log('✅ Все существующие проекты обновлены с типом "qualification"');

    // Проверяем результат
    const result = await pool.query(`
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN type = 'qualification' THEN 1 END) as qualification_count
      FROM projects
    `);

    const { total, qualification_count } = result.rows[0];
    console.log(`\n📊 Статистика:`);
    console.log(`   Всего проектов: ${total}`);
    console.log(`   Проектов типа "Квалификация": ${qualification_count}`);

  } catch (error: any) {
    console.error('❌ Ошибка при применении миграции:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addProjectType();




