import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkDefaultUser() {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, role, is_default FROM users WHERE is_default = true'
    );
    
    console.log('Пользователи по умолчанию в БД:');
    result.rows.forEach(row => {
      console.log(`  - ${row.full_name} (${row.email}), роль: ${row.role}, is_default: ${row.is_default}`);
    });
    
    if (result.rows.length === 0) {
      console.log('⚠️ Пользователь по умолчанию не найден в БД');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkDefaultUser();


