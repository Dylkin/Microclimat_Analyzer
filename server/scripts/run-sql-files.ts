import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const rootDir = path.resolve(__dirname, '../../');

const getSqlFiles = (): string[] => {
  const entries = fs.readdirSync(rootDir);
  const sqlFiles = entries
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const orderedFiles = sqlFiles.filter((f) => f !== 'database_setup.sql');
  return ['database_setup.sql', ...orderedFiles];
};

const runSqlFile = async (pool: Pool, filePath: string) => {
  const absolutePath = path.join(rootDir, filePath);
  const sql = fs.readFileSync(absolutePath, 'utf-8');

  console.log(`\n📄 Выполнение ${filePath}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`✅ Успешно: ${filePath}`);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error(`❌ Ошибка в ${filePath}: ${error.message}`);
  } finally {
    client.release();
  }
};

const runAllSqlFiles = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'microclimat',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const files = getSqlFiles();
    console.log(`Найдено SQL файлов: ${files.length}`);

    for (const file of files) {
      await runSqlFile(pool, file);
    }

    console.log('\n✅ Выполнение всех SQL файлов завершено');
  } catch (error: any) {
    console.error('❌ Ошибка при выполнении SQL файлов:', error.message);
  } finally {
    await pool.end();
  }
};

runAllSqlFiles();


