import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixProjectDocumentsColumns() {
  try {
    console.log('Исправление колонок в таблице project_documents...');

    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250101000003_fix_project_documents_columns.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    await pool.query(sql);
    
    console.log('✅ Колонки в project_documents успешно обновлены!');
  } catch (error: any) {
    console.error('Ошибка обновления колонок:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixProjectDocumentsColumns();


