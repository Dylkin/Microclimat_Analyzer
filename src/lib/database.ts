import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Создаем отдельный клиент с service role для административных операций
const adminSupabase = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
    )
  : supabase;

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  return url && 
         key && 
         url !== 'https://placeholder.supabase.co' && 
         key !== 'placeholder-anon-key' &&
         !url.includes('placeholder') &&
         !key.includes('placeholder');
};

// Функция для создания пользователя по умолчанию
export async function createDefaultUser() {
  if (!isSupabaseConfigured()) {
    console.log('Supabase не настроен. Пропускаем создание пользователя по умолчанию.');
    return;
  }

  if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Service role key не настроен. Пропускаем создание пользователя по умолчанию.');
    return;
  }

  try {
    // Проверяем, существует ли пользователь
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'pavel.dylkin@gmail.com');

    if (existingUsers && existingUsers.length > 0) {
      console.log('Пользователь по умолчанию уже существует');
      return;
    }

    // Используем Admin API для создания пользователя с подтвержденным email
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: 'pavel.dylkin@gmail.com',
      password: '00016346',
      email_confirm: true,
      user_metadata: {
        full_name: 'Дылкин П.А.'
      }
    });

    if (authError) {
      console.error('Ошибка создания пользователя в auth:', authError);
      return;
    }

    if (!authData.user) {
      console.error('Не удалось получить данные пользователя после создания');
      return;
    }

    const userId = authData.user.id;

    // Создаем или обновляем профиль пользователя
    const { error: profileError } = await adminSupabase
      .from('users')
      .upsert({
        id: userId,
        email: 'pavel.dylkin@gmail.com',
        full_name: 'Дылкин П.А.',
        role: 'administrator'
      });

    if (profileError) {
      console.error('Ошибка создания/обновления профиля:', profileError);
    } else {
      console.log('Пользователь по умолчанию создан/обновлен успешно');
    }
  } catch (error) {
    console.error('Ошибка при создании пользователя по умолчанию:', error);
  }
}

// Функция для инициализации базы данных
export async function initializeDatabase() {
  if (!isSupabaseConfigured()) {
    console.log('Supabase не настроен. База данных будет инициализирована после подключения.');
    return;
  }

  try {
    await createDefaultUser();
  } catch (error) {
    console.error('Ошибка инициализации базы данных:', error);
  }
}