import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'microclimat',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function addSaleSupplierStatus() {
  try {
    console.log('🔄 Добавление значения \"supplier_search\" в enum project_status...');

    const checkResult = await pool.query(
      `SELECT 1 
       FROM pg_enum 
       WHERE enumtypid = 'project_status'::regtype 
         AND enumlabel = 'supplier_search'`
    );

    if (checkResult.rows.length > 0) {
      console.log('✅ Значение \"supplier_search\" уже есть в enum project_status');
      return;
    }

    await pool.query(`ALTER TYPE project_status ADD VALUE 'supplier_search'`);

    console.log('✅ Значение \"supplier_search\" добавлено в enum project_status');
  } catch (error: any) {
    console.error('❌ Ошибка при добавлении supplier_search в project_status:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addSaleSupplierStatus();


