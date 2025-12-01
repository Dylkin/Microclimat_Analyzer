import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v5 as uuidv5 } from 'uuid';

dotenv.config();

// Значения по умолчанию для первого пользователя можно переопределить через .env
// DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_ROLE
// Генерируем UUID версии 5 на основе namespace и имени пользователя
// Используем стандартный DNS namespace UUID и email пользователя для детерминированной генерации
const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'pavel.dylkin@gmail.com';
const DEFAULT_ADMIN_ID = uuidv5(DEFAULT_ADMIN_EMAIL, DNS_NAMESPACE);
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME || 'Дылкин П.А.';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || '00016346';
// В БД допустимы роли 'admin', 'user', 'viewer' (см. CHECK в database_setup.sql)
let DEFAULT_ADMIN_ROLE = process.env.DEFAULT_ADMIN_ROLE || 'admin';

// На всякий случай приводим возможное значение 'administrator' к 'admin'
if (DEFAULT_ADMIN_ROLE === 'administrator') {
  DEFAULT_ADMIN_ROLE = 'admin';
}

async function createDefaultUser() {
  try {
    console.log('Проверка существования пользователя по умолчанию...');
    console.log(`Ожидаемый UUID: ${DEFAULT_ADMIN_ID}`);
    console.log(`Ожидаемый email: ${DEFAULT_ADMIN_EMAIL}`);

    // Проверяем, существует ли пользователь с нужным UUID
    const checkByIdResult = await pool.query(
      'SELECT id, email, full_name, role, is_default FROM users WHERE id = $1',
      [DEFAULT_ADMIN_ID]
    );

    if (checkByIdResult.rows.length > 0) {
      const existingUser = checkByIdResult.rows[0];
      console.log('✅ Пользователь с нужным UUID уже существует:', existingUser);
      
      // Обновляем флаг is_default, если его нет
      if (!existingUser.is_default) {
        console.log('Обновление флага is_default...');
        await pool.query(
          'UPDATE users SET is_default = true WHERE id = $1',
          [DEFAULT_ADMIN_ID]
        );
        console.log('✅ Флаг is_default обновлен');
      }
      
      await pool.end();
      return;
    }

    // Проверяем, существует ли пользователь с нужным email
    const checkByEmailResult = await pool.query(
      'SELECT id, email, full_name, role, is_default FROM users WHERE email = $1',
      [DEFAULT_ADMIN_EMAIL]
    );

    if (checkByEmailResult.rows.length > 0) {
      const existingUser = checkByEmailResult.rows[0];
      console.log('⚠️ Найден пользователь с нужным email, но другим UUID:', existingUser);
      console.log(`Обновление UUID с ${existingUser.id} на ${DEFAULT_ADMIN_ID}...`);
      
      // Обновляем UUID пользователя
      await pool.query(
        'UPDATE users SET id = $1, is_default = true WHERE email = $2',
        [DEFAULT_ADMIN_ID, DEFAULT_ADMIN_EMAIL]
      );
      
      console.log('✅ UUID пользователя обновлен');
      await pool.end();
      return;
    }

    // Проверяем, есть ли вообще пользователь с флагом is_default
    const checkDefaultResult = await pool.query(
      'SELECT id, email, full_name, role FROM users WHERE is_default = true LIMIT 1'
    );

    if (checkDefaultResult.rows.length > 0) {
      const existingDefault = checkDefaultResult.rows[0];
      console.log('⚠️ Найден другой пользователь с флагом is_default:', existingDefault);
      console.log('Создаем пользователя с нужным UUID...');
    } else {
      console.log('Создание пользователя по умолчанию...');
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

    // Создаем/обновляем пользователя по умолчанию
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
        DEFAULT_ADMIN_ID,
        DEFAULT_ADMIN_NAME,
        DEFAULT_ADMIN_EMAIL,
        hashedPassword,
        DEFAULT_ADMIN_ROLE,
        true
      ]
    );

    console.log('✅ Пользователь по умолчанию создан/обновлён:', result.rows[0]);

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка создания пользователя по умолчанию:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createDefaultUser();

