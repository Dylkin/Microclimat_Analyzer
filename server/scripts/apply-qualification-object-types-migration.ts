import { pool } from '../config/database.js';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  try {
    console.log('🔧 Применение миграции для типов объектов квалификации...');
    
    const migrationPath = path.join(process.cwd(), 'migrations', '20250102000002_create_qualification_object_types.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Миграция успешно применена');
    console.log('   Таблица qualification_object_types создана');
    console.log('   Начальные данные вставлены');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка применения миграции:', error.message);
    if (error.code === '42P07') {
      console.log('⚠️  Таблица уже существует');
    }
    process.exit(1);
  }
}

applyMigration();





