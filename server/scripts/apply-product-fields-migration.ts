import dotenv from 'dotenv';
import { pool } from '../config/database.js';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

async function applyProductFieldsMigration() {
  try {
    console.log('Применение миграции для новых полей карточек товаров...\n');
    
    const migrationPath = join(process.cwd(), 'supabase/migrations/20250108000001_add_product_card_fields.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    try {
      await pool.query(sql);
      console.log('✅ Миграция применена успешно!');
    } catch (error: any) {
      if (error.code === '42P07' || error.code === '42710' || error.message.includes('already exists') || error.message.includes('does not exist')) {
        console.log('⚠ Некоторые изменения уже применены, проверяем структуру...');
        
        // Проверяем наличие новых полей
        const columnsCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'equipment_cards'
          AND column_name IN ('series', 'channels_count', 'dosing_volume', 'volume_step', 'dosing_accuracy', 'reproducibility', 'autoclavable')
        `);
        
        const existingColumns = columnsCheck.rows.map(r => r.column_name);
        const requiredColumns = ['series', 'channels_count', 'dosing_volume', 'volume_step', 'dosing_accuracy', 'reproducibility', 'autoclavable'];
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length === 0) {
          console.log('✅ Все поля уже существуют');
        } else {
          console.log(`⚠ Отсутствуют поля: ${missingColumns.join(', ')}`);
          // Применяем только недостающие поля
          for (const col of missingColumns) {
            try {
              if (col === 'series') {
                await pool.query(`ALTER TABLE equipment_cards RENAME COLUMN model TO series`);
              } else if (col === 'channels_count') {
                await pool.query(`ALTER TABLE equipment_cards ADD COLUMN channels_count INTEGER`);
              } else if (col === 'dosing_volume') {
                await pool.query(`ALTER TABLE equipment_cards ADD COLUMN dosing_volume TEXT`);
              } else if (col === 'volume_step') {
                await pool.query(`ALTER TABLE equipment_cards ADD COLUMN volume_step TEXT`);
              } else if (col === 'dosing_accuracy') {
                await pool.query(`ALTER TABLE equipment_cards ADD COLUMN dosing_accuracy TEXT`);
              } else if (col === 'reproducibility') {
                await pool.query(`ALTER TABLE equipment_cards ADD COLUMN reproducibility TEXT`);
              } else if (col === 'autoclavable') {
                await pool.query(`ALTER TABLE equipment_cards ADD COLUMN autoclavable BOOLEAN`);
              }
              console.log(`✓ Добавлено поле: ${col}`);
            } catch (e: any) {
              console.log(`⚠ Ошибка добавления поля ${col}: ${e.message}`);
            }
          }
        }
      } else {
        console.error('❌ Ошибка применения миграции:', error.message);
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

applyProductFieldsMigration();



