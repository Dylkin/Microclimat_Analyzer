import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

async function createDefaultUser() {
  try {
    console.log('Проверка существования пользователя по умолчанию...');
    
    // Проверяем, существует ли пользователь по умолчанию
    const checkResult = await pool.query(
      'SELECT id FROM users WHERE is_default = true LIMIT 1'
    );
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Пользователь по умолчанию уже существует');
      await pool.end();
      return;
    }
    
    console.log('Создание пользователя по умолчанию...');
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash('00016346', 10);
    
    // Создаем пользователя по умолчанию
    const result = await pool.query(
      `INSERT INTO users (id, full_name, email, password, role, is_default)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         password = EXCLUDED.password,
         role = EXCLUDED.role,
         is_default = EXCLUDED.is_default
       RETURNING id, full_name, email, role, is_default`,
      [
        '00000000-0000-0000-0000-000000000001',
        'Дылкин П.А.',
        'pavel.dylkin@gmail.com',
        hashedPassword,
        'admin',
        true
      ]
    );
    
    console.log('✅ Пользователь по умолчанию создан:', result.rows[0]);
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createDefaultUser();


