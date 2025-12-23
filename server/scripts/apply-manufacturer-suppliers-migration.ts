/**
 * Скрипт для применения миграции manufacturer_suppliers
 */

import { pool } from '../config/database.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  try {
    const migrationPath = join(__dirname, '../../supabase/migrations/20250120000000_add_manufacturer_suppliers_to_equipment_sections.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    await pool.query(sql);
    console.log('✅ Миграция manufacturer_suppliers применена успешно');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка применения миграции:', error);
    await pool.end();
    process.exit(1);
  }
}

applyMigration();


