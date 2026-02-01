import { readFileSync } from 'fs';
import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const sqlFile = process.argv[2] || 'database_setup.sql';
const sqlPath = join(process.cwd(), sqlFile);

console.log(`📄 Выполнение ${sqlFile}...\n`);

try {
  const sql = readFileSync(sqlPath, 'utf-8');
  
  // Выполняем SQL целиком
  await pool.query(sql);
  
  console.log(`✅ Успешно: ${sqlFile}`);
  await pool.end();
  process.exit(0);
} catch (error: any) {
  console.error(`❌ Ошибка в ${sqlFile}: ${error.message}`);
  await pool.end();
  process.exit(1);
}


