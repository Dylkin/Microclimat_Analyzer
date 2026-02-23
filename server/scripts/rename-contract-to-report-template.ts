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

async function renameContractToReportTemplate() {
  try {
    console.log('🔄 Применение миграции для переименования contract_template в report_template...');

    // Читаем файл миграции
    const migrationPath = path.join(__dirname, '../../migrations/20250102000005_rename_contract_template_to_report_template.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    // Применяем миграцию
    await pool.query(migrationSQL);

    console.log('✅ Миграция успешно применена');
    console.log('✅ Поля contract_template переименованы в report_template');

    // Проверяем результат
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'qualification_object_types'
      AND column_name LIKE '%template%'
      ORDER BY column_name
    `);

    console.log(`\n📊 Колонки с template в названии:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}`);
    });

  } catch (error: any) {
    console.error('❌ Ошибка при применении миграции:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

renameContractToReportTemplate();




