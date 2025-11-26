import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixMeasurementLevelType() {
  const client = await pool.connect();
  try {
    console.log('Исправление типа measurement_level...');

    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250101000011_fix_measurement_level_type.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');

    await client.query(sql);

    console.log('✅ Тип measurement_level успешно обновлен!');
  } catch (error: any) {
    console.error('Ошибка обновления типа measurement_level:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixMeasurementLevelType();


