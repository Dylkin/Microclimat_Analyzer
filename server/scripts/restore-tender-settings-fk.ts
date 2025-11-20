import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function restoreForeignKey() {
  try {
    console.log('Восстановление внешнего ключа для tender_search_settings...');
    
    // Удаляем старое ограничение если есть
    await pool.query(`
      ALTER TABLE tender_search_settings 
      DROP CONSTRAINT IF EXISTS tender_search_settings_user_id_fkey
    `);
    
    // Создаем новое ограничение (NOT NULL)
    await pool.query(`
      ALTER TABLE tender_search_settings 
      ADD CONSTRAINT tender_search_settings_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.users(id) 
      ON DELETE CASCADE
    `);
    
    console.log('✅ Внешний ключ восстановлен (NOT NULL, ON DELETE CASCADE)');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

restoreForeignKey();


