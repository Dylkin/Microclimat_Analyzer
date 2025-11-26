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

async function addSaleProjectFields() {
  try {
    console.log('🔄 Применение миграции для добавления полей проектов типа "Продажа"...');

    // Читаем файл миграции
    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250102000007_add_sale_project_fields.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    // Применяем миграцию
    await pool.query(migrationSQL);

    console.log('✅ Миграция успешно применена');
    console.log('✅ Поля tender_link и tender_date добавлены в таблицу projects');
    console.log('✅ Тип проекта "sale" добавлен в enum project_type');
    console.log('✅ Таблица project_items создана');

    // Проверяем результат
    const projectsCheck = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'projects'
      AND column_name IN ('tender_link', 'tender_date')
    `);

    if (projectsCheck.rows.length > 0) {
      console.log(`\n📊 Колонки в таблице projects:`);
      projectsCheck.rows.forEach((row: any) => {
        console.log(`   ${row.column_name}: ${row.data_type}`);
      });
    }

    const itemsCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'project_items'
    `);

    if (itemsCheck.rows.length > 0) {
      console.log(`\n✅ Таблица project_items существует`);
    }

  } catch (error: any) {
    console.error('❌ Ошибка при применении миграции:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addSaleProjectFields();



