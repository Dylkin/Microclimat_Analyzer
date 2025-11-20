import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function removeForeignKey() {
  try {
    console.log('Удаление внешнего ключа для tender_search_settings...');
    
    // Удаляем ограничение
    await pool.query(`
      ALTER TABLE tender_search_settings 
      DROP CONSTRAINT IF EXISTS tender_search_settings_user_id_fkey
    `);
    
    console.log('✅ Внешний ключ удален. Теперь можно сохранять настройки для любых userId');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

removeForeignKey();


