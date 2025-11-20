import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function cleanup() {
  try {
    console.log('Очистка записей с несуществующими userId...');
    
    // Находим записи с несуществующими userId
    const invalidRecords = await pool.query(`
      SELECT tss.id, tss.user_id 
      FROM tender_search_settings tss
      LEFT JOIN users u ON tss.user_id = u.id
      WHERE u.id IS NULL
    `);
    
    console.log(`Найдено записей с несуществующими userId: ${invalidRecords.rows.length}`);
    
    if (invalidRecords.rows.length > 0) {
      // Удаляем записи с несуществующими userId
      await pool.query(`
        DELETE FROM tender_search_settings
        WHERE user_id NOT IN (SELECT id FROM users)
      `);
      console.log('✅ Записи с несуществующими userId удалены');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

cleanup();


