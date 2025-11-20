import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkTable() {
  try {
    console.log('Проверка структуры таблицы tender_search_settings...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tender_search_settings' 
      ORDER BY ordinal_position
    `);
    
    console.log('Колонки таблицы tender_search_settings:');
    result.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`);
    });
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkTable();


