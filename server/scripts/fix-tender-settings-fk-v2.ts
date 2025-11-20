import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixForeignKey() {
  try {
    console.log('Проверка текущего состояния внешнего ключа...');
    
    // Проверяем текущие ограничения
    const constraints = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_def
      FROM pg_constraint
      WHERE conrelid = 'tender_search_settings'::regclass
      AND contype = 'f'
    `);
    
    console.log('Текущие внешние ключи:');
    constraints.rows.forEach(c => {
      console.log(`  ${c.constraint_name}: ${c.constraint_def}`);
    });
    
    // Удаляем все старые ограничения
    for (const constraint of constraints.rows) {
      console.log(`Удаление ограничения: ${constraint.constraint_name}`);
      await pool.query(`ALTER TABLE tender_search_settings DROP CONSTRAINT IF EXISTS ${constraint.constraint_name}`);
    }
    
    // Создаем новое ограничение с ON DELETE SET NULL
    console.log('Создание нового ограничения с ON DELETE SET NULL...');
    await pool.query(`
      ALTER TABLE tender_search_settings 
      ADD CONSTRAINT tender_search_settings_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.users(id) 
      ON DELETE SET NULL
    `);
    
    console.log('✅ Внешний ключ исправлен');
    
    // Проверяем результат
    const newConstraints = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_def
      FROM pg_constraint
      WHERE conrelid = 'tender_search_settings'::regclass
      AND contype = 'f'
    `);
    
    console.log('Новые внешние ключи:');
    newConstraints.rows.forEach(c => {
      console.log(`  ${c.constraint_name}: ${c.constraint_def}`);
    });
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    console.error('Детали:', error);
    await pool.end();
    process.exit(1);
  }
}

fixForeignKey();


