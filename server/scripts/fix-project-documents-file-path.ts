import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixProjectDocumentsFilePath() {
  try {
    console.log('Исправление ограничения NOT NULL для file_path...');

    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250101000005_fix_project_documents_file_path_nullable.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    await pool.query(sql);
    
    console.log('✅ Ограничение NOT NULL для file_path успешно удалено!');
  } catch (error: any) {
    console.error('Ошибка обновления таблицы project_documents:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixProjectDocumentsFilePath();


