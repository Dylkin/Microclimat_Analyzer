import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixForeignKey() {
  try {
    console.log('Исправление внешнего ключа для tender_search_settings...');
    
    // Удаляем старое ограничение
    await pool.query(`
      ALTER TABLE tender_search_settings 
      DROP CONSTRAINT IF EXISTS tender_search_settings_user_id_fkey
    `);
    
    // Создаем новое ограничение с ON DELETE SET NULL
    await pool.query(`
      ALTER TABLE tender_search_settings 
      ADD CONSTRAINT tender_search_settings_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.users(id) 
      ON DELETE SET NULL
    `);
    
    console.log('✅ Внешний ключ исправлен');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

fixForeignKey();


