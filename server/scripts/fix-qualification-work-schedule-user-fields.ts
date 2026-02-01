import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fixQualificationWorkScheduleUserFields() {
  try {
    console.log('Применение миграции для изменения типа полей completed_by и cancelled_by...');
    
    const migrationPath = join(__dirname, '../../supabase/migrations/20250101000013_fix_qualification_work_schedule_user_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    await pool.query(migrationSQL);
    
    console.log('Миграция успешно применена!');
    process.exit(0);
  } catch (error: any) {
    console.error('Ошибка применения миграции:', error);
    process.exit(1);
  }
}

fixQualificationWorkScheduleUserFields();


