import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function removeProtocolPreparationStatus() {
  try {
    console.log('Удаление статуса protocol_preparation из enum project_status...');

    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250101000008_remove_protocol_preparation_status.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    await pool.query(sql);
    
    console.log('✅ Статус protocol_preparation успешно удален из enum project_status!');
    console.log('✅ Все проекты со статусом protocol_preparation обновлены на testing_execution');
  } catch (error: any) {
    console.error('Ошибка удаления статуса protocol_preparation:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

removeProtocolPreparationStatus();


