import { pool } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixUsersRoleConstraint() {
  try {
    console.log('Применение миграции: расширение допустимых ролей в users.role...');

    await pool.query('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check');
    await pool.query(
      `ALTER TABLE public.users ADD CONSTRAINT users_role_check
       CHECK (role IN ('admin', 'administrator', 'user', 'viewer', 'specialist', 'manager', 'director'))`
    );

    console.log('✅ Ограничение users_role_check успешно обновлено.');
  } catch (error: unknown) {
    console.error('Ошибка миграции:', error instanceof Error ? error.message : error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixUsersRoleConstraint();
