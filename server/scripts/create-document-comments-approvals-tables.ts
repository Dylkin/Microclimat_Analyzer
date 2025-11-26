import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createDocumentCommentsApprovalsTables() {
  try {
    console.log('Создание таблиц document_comments и document_approvals...');

    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250101000006_create_document_comments_and_approvals.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    await pool.query(sql);
    
    console.log('✅ Таблицы document_comments и document_approvals успешно созданы!');
  } catch (error: any) {
    console.error('Ошибка создания таблиц:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createDocumentCommentsApprovalsTables();


