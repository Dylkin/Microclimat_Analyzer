import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addMissingColumns() {
  try {
    console.log('Добавление недостающих колонок в qualification_objects...');

    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250101000000_add_qualification_objects_file_fields.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    await pool.query(sql);
    
    console.log('✅ Колонки успешно добавлены!');
  } catch (error: any) {
    console.error('Ошибка добавления колонок:', error.message);
    if (error.code !== '42710' && error.code !== '42P07') { // Игнорируем ошибки "уже существует"
      throw error;
    } else {
      console.log('⚠️  Некоторые объекты уже существуют, пропускаем...');
    }
  } finally {
    await pool.end();
  }
}

addMissingColumns();


