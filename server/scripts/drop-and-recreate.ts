import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

async function dropAndRecreate() {
  try {
    console.log('🗑️  Удаление существующих таблиц...');
    
    // Удаляем таблицы в правильном порядке (сначала зависимые)
    const dropOrder = [
      'qualification_protocols',
      'qualification_work_schedule',
      'audit_logs',
      'documentation_checks',
      'document_approval',
      'project_documents',
      'analysis_reports',
      'logger_data',
      'logger_data_summary',
      'uploaded_files',
      'testing_periods',
      'equipment',
      'qualification_objects',
      'projects',
      'contractors',
      'users'
    ];
    
    for (const table of dropOrder) {
      try {
        await pool.query(`DROP TABLE IF EXISTS public.${table} CASCADE;`);
        console.log(`  ✓ Удалена таблица: ${table}`);
      } catch (error: any) {
        if (!error.message.includes('does not exist')) {
          console.error(`  ✗ Ошибка удаления ${table}: ${error.message}`);
        }
      }
    }
    
    // Удаляем типы
    try {
      await pool.query(`DROP TYPE IF EXISTS document_type CASCADE;`);
      await pool.query(`DROP TYPE IF EXISTS project_status CASCADE;`);
      console.log('  ✓ Удалены ENUM типы');
    } catch (error: any) {
      console.log('  ⚠ Типы не удалены (возможно, не существовали)');
    }
    
    console.log('\n📄 Выполнение database_setup.sql...');
    const sql = readFileSync(join(process.cwd(), 'database_setup.sql'), 'utf-8');
    await pool.query(sql);
    
    console.log('\n✅ База данных успешно пересоздана!');
    
    // Проверяем созданные таблицы
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Создано таблиц: ${result.rows.length}`);
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

dropAndRecreate();


