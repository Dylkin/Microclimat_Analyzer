import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createProjectQualificationObjectsTable() {
  try {
    console.log('Создание таблицы project_qualification_objects...');

    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250101000001_create_project_qualification_objects.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    await pool.query(sql);
    
    console.log('✅ Таблица project_qualification_objects успешно создана!');
  } catch (error: any) {
    console.error('Ошибка создания таблицы:', error.message);
    if (error.code !== '42710' && error.code !== '42P07') { // Игнорируем ошибки "уже существует"
      throw error;
    } else {
      console.log('⚠️  Таблица уже существует, пропускаем...');
    }
  } finally {
    await pool.end();
  }
}

createProjectQualificationObjectsTable();


