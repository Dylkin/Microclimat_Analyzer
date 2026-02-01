import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createProjectFilesTracking() {
  try {
    console.log('Создание таблицы project_files для отслеживания всех файлов проекта...');

    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250101000007_create_project_files_tracking.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    await pool.query(sql);
    
    console.log('✅ Таблица project_files успешно создана!');
  } catch (error: any) {
    console.error('Ошибка создания таблицы project_files:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createProjectFilesTracking();


