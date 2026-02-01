import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function createTables() {
  try {
    console.log('Создание таблиц для поиска тендеров...');
    
    // Таблица настроек поиска тендеров
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.tender_search_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        purchase_items TEXT[] DEFAULT '{}',
        organization_inns TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Таблица тендеров
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.tenders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        search_settings_id UUID REFERENCES public.tender_search_settings(id) ON DELETE CASCADE,
        tender_number TEXT NOT NULL,
        title TEXT NOT NULL,
        organization_name TEXT NOT NULL,
        organization_inn TEXT NOT NULL,
        purchase_item TEXT,
        publication_date DATE NOT NULL,
        deadline_date DATE,
        tender_url TEXT NOT NULL,
        status TEXT,
        parsed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Таблица истории поиска
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.tender_search_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        search_settings_id UUID REFERENCES public.tender_search_settings(id) ON DELETE SET NULL,
        search_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        found_tenders_count INTEGER DEFAULT 0,
        parsing_status TEXT NOT NULL CHECK (parsing_status IN ('success', 'error', 'in_progress')),
        error_message TEXT
      )
    `);
    
    // Создаем индексы
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tender_search_settings_user_id 
      ON public.tender_search_settings(user_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenders_search_settings_id 
      ON public.tenders(search_settings_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenders_organization_inn 
      ON public.tenders(organization_inn)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tender_search_history_user_id 
      ON public.tender_search_history(user_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tender_search_history_search_date 
      ON public.tender_search_history(search_date DESC)
    `);
    
    console.log('✅ Таблицы для поиска тендеров созданы успешно');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createTables();


