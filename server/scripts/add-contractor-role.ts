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

async function addContractorRole() {
  try {
    console.log('🔄 Применение миграции для добавления поля role в таблицу contractors...');

    // Читаем файл миграции
    const migrationPath = path.join(__dirname, '../../migrations/20250102000006_add_contractor_role.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    // Применяем миграцию
    await pool.query(migrationSQL);

    console.log('✅ Миграция успешно применена');
    console.log('✅ Поле role добавлено в таблицу contractors');

    // Проверяем результат
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors'
      AND column_name = 'role'
    `);

    if (result.rows.length > 0) {
      console.log(`\n📊 Колонка role:`);
      console.log(`   Тип: ${result.rows[0].data_type}`);
      console.log(`   По умолчанию: ${result.rows[0].column_default}`);
    }

  } catch (error: any) {
    console.error('❌ Ошибка при применении миграции:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addContractorRole();




