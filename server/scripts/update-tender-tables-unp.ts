import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function updateTables() {
  try {
    console.log('Обновление таблиц для использования УНП вместо ИНН...');
    
    // Переименовываем колонку в tender_search_settings
    await pool.query(`
      ALTER TABLE tender_search_settings 
      RENAME COLUMN organization_inns TO organization_unps
    `);
    
    // Переименовываем колонку в tenders
    await pool.query(`
      ALTER TABLE tenders 
      RENAME COLUMN organization_inn TO organization_unp
    `);
    
    // Удаляем старый индекс
    await pool.query(`
      DROP INDEX IF EXISTS idx_tenders_organization_inn
    `);
    
    // Создаем новый индекс
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenders_organization_unp 
      ON public.tenders(organization_unp)
    `);
    
    console.log('✅ Таблицы обновлены успешно');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

updateTables();


