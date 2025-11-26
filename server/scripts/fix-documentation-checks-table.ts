import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixDocumentationChecksTable() {
  try {
    console.log('Исправление таблицы documentation_checks...');

    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250101000009_fix_documentation_checks_table.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    await pool.query(sql);
    
    console.log('✅ Таблица documentation_checks успешно обновлена!');
  } catch (error: any) {
    console.error('Ошибка обновления таблицы documentation_checks:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixDocumentationChecksTable();


