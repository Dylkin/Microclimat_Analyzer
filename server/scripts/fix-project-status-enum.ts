import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixProjectStatusEnum() {
  try {
    console.log('Исправление enum project_status...');

    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250101000002_fix_project_status_enum.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    await pool.query(sql);
    
    console.log('✅ Enum project_status успешно обновлен!');
  } catch (error: any) {
    console.error('Ошибка обновления enum:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixProjectStatusEnum();


