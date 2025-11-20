import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function createTables() {
  try {
    console.log('Создание таблиц для оборудования...');
    
    // Создаем ENUM тип для типов оборудования
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE equipment_type AS ENUM ('-', 'Testo 174T', 'Testo 174H');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Создаем таблицу measurement_equipment
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.measurement_equipment (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        type equipment_type NOT NULL DEFAULT '-',
        name TEXT NOT NULL,
        serial_number TEXT UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Создаем таблицу equipment_verifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.equipment_verifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        equipment_id UUID NOT NULL REFERENCES public.measurement_equipment(id) ON DELETE CASCADE,
        verification_start_date DATE NOT NULL,
        verification_end_date DATE NOT NULL,
        verification_file_url TEXT,
        verification_file_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Создаем индексы
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_verifications_equipment_id 
      ON public.equipment_verifications(equipment_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_verifications_dates 
      ON public.equipment_verifications(verification_start_date, verification_end_date)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_measurement_equipment_type 
      ON public.measurement_equipment(type)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_measurement_equipment_serial 
      ON public.measurement_equipment(serial_number)
    `);
    
    console.log('✅ Таблицы для оборудования созданы успешно');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createTables();


