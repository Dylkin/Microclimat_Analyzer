import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkUser() {
  try {
    const userId = '60d1399a-56be-4d32-a745-b95aab825ec3';
    
    console.log('Проверка пользователя:', userId);
    
    const result = await pool.query('SELECT id, full_name, email FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length > 0) {
      console.log('✅ Пользователь найден:', result.rows[0]);
    } else {
      console.log('❌ Пользователь НЕ найден в БД');
      const allUsers = await pool.query('SELECT id, full_name, email FROM users LIMIT 10');
      console.log('Существующие пользователи:');
      allUsers.rows.forEach(u => console.log('  -', u.id, u.full_name, u.email));
    }
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkUser();


