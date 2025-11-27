import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Читаем файл миграции
    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250102000003_add_template_upload_info.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    
    // Выполняем миграцию
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    console.log('✅ Миграция успешно применена: add_template_upload_info');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка применения миграции:', error);
    throw error;
  } finally {
    client.release();
  }
}

applyMigration()
  .then(() => {
    console.log('Миграция завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка:', error);
    process.exit(1);
  });





