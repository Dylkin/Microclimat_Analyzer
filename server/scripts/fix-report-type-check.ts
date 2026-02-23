import { pool } from '../config/database.js';
import * as fs from 'fs';
import * as path from 'path';

async function fixReportTypeCheck() {
  try {
    console.log('🔧 Исправление ограничения CHECK для report_type...');
    
    const migrationPath = path.join(process.cwd(), 'migrations', '20250102000001_fix_analysis_reports_report_type_check.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Ограничение CHECK для report_type успешно обновлено');
    console.log('   Теперь поддерживаются типы: trial, summary, template, analysis');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка применения миграции:', error.message);
    if (error.code === '42710') {
      console.log('⚠️  Ограничение уже существует, возможно, оно уже было обновлено');
    }
    process.exit(1);
  }
}

fixReportTypeCheck();

