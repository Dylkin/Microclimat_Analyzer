import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function createTable() {
  try {
    console.log('Создание таблицы contractor_contacts...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.contractor_contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE,
        employee_name TEXT NOT NULL,
        phone TEXT,
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_contractor_contacts_contractor 
      ON public.contractor_contacts(contractor_id)
    `);
    
    console.log('✅ Таблица contractor_contacts создана успешно');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createTable();


