import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function makeLoggerDataFieldsNullable() {
  const client = await pool.connect();
  try {
    console.log('Делаем поля device_type, device_model, serial_number nullable в logger_data_records...');

    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250101000012_make_logger_data_fields_nullable.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');

    await client.query(sql);

    console.log('✅ Поля в logger_data_records успешно обновлены!');
  } catch (error: any) {
    console.error('Ошибка обновления полей logger_data_records:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

makeLoggerDataFieldsNullable();


