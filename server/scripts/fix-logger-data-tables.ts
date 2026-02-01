import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixLoggerDataTables() {
  const client = await pool.connect();
  try {
    console.log('Исправление структуры таблиц для данных логгеров...');

    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250101000010_fix_logger_data_tables.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');

    await client.query(sql);

    console.log('✅ Таблицы для данных логгеров успешно обновлены!');
  } catch (error: any) {
    console.error('Ошибка обновления таблиц для данных логгеров:', error.message);
    if (error.code !== '42701' && error.code !== '42P07' && !error.message.includes('already exists')) {
      throw error;
    } else {
      console.log('⚠️  Некоторые колонки уже существуют или произошла другая некритичная ошибка, пропускаем...');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

fixLoggerDataTables();


