import { createClient } from '@supabase/supabase-js';

// Получаем конфигурацию Supabase из переменных окружения или используем значения по умолчанию
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rcplxggzlkqsypffugno.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcGx4Z2d6bGtxc3lwZmZ1Z25vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MzQsImV4cCI6MjA1MDU1MDgzNH0.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q';

// Проверяем, что у нас есть конфигурация
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Конфигурация Supabase не найдена');
}

// Создаем единый экземпляр Supabase клиента
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Экспортируем типы для использования в других файлах
export type { SupabaseClient } from '@supabase/supabase-js';
