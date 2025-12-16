import dotenv from 'dotenv';
import { pool } from '../config/database.js';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

async function applySectionFieldsMigration() {
  try {
    console.log('Применение миграции для новых полей разделов...\n');
    
    const migrationPath = join(process.cwd(), 'supabase/migrations/20250108000002_add_section_fields.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    try {
      await pool.query(sql);
      console.log('✅ Миграция применена успешно!');
    } catch (error: any) {
      if (error.code === '42P07' || error.code === '42710' || error.message?.includes('already exists')) {
        console.log('⚠ Некоторые изменения уже применены, проверяем структуру...');
        
        const columnsCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'equipment_sections'
          AND column_name IN ('manufacturers', 'website', 'supplier_ids')
        `);
        
        const existingColumns = columnsCheck.rows.map((r: any) => r.column_name);
        const requiredColumns = ['manufacturers', 'website', 'supplier_ids'];
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length === 0) {
          console.log('✅ Все поля уже существуют');
        } else {
          console.log(`⚠ Отсутствуют поля: ${missingColumns.join(', ')}`);
          for (const col of missingColumns) {
            try {
              if (col === 'manufacturers') {
                await pool.query(`ALTER TABLE equipment_sections ADD COLUMN manufacturers TEXT[] DEFAULT '{}'`);
              } else if (col === 'website') {
                await pool.query(`ALTER TABLE equipment_sections ADD COLUMN website TEXT`);
              } else if (col === 'supplier_ids') {
                await pool.query(`ALTER TABLE equipment_sections ADD COLUMN supplier_ids UUID[] DEFAULT '{}'`);
              }
              console.log(`✓ Добавлено поле: ${col}`);
            } catch (e: any) {
              console.log(`⚠ Ошибка добавления поля ${col}: ${e.message}`);
            }
          }
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applySectionFieldsMigration();



