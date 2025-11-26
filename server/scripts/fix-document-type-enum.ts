import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixDocumentTypeEnum() {
  try {
    console.log('Добавление commercial_offer в enum document_type...');

    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250101000004_add_commercial_offer_to_document_type.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    await pool.query(sql);
    
    console.log('✅ Значение commercial_offer успешно добавлено в enum document_type!');
  } catch (error: any) {
    console.error('Ошибка обновления enum:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixDocumentTypeEnum();


