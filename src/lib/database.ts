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

    console.log('Создаем пользователя по умолчанию...');

    // Сначала пытаемся создать пользователя через обычный signup
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'pavel.dylkin@gmail.com',
      password: '00016346',
    });

    if (signUpError) {
      console.error('Ошибка создания пользователя:', signUpError.message);
      return;
    }

    if (!signUpData.user) {
      console.error('Не удалось получить данные пользователя');
      return;
    }

    // Создаем профиль пользователя в таблице users
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: signUpData.user.id,
        email: 'pavel.dylkin@gmail.com',
        full_name: 'Дылкин П.А.',
        role: 'administrator'
      });

    if (profileError) {
      console.error('Ошибка создания профиля:', profileError.message);
      
      // Если ошибка RLS, попробуем через service role (если доступен)
      if (profileError.message.includes('row-level security') && import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
        console.log('Пытаемся создать профиль через service role...');
        const { error: adminError } = await adminSupabase
          .from('users')
          .insert({
            id: signUpData.user.id,
            email: 'pavel.dylkin@gmail.com',
            full_name: 'Дылкин П.А.',
            role: 'administrator'
          });
        
        if (adminError) {
          console.error('Ошибка создания профиля через service role:', adminError.message);
        } else {
          console.log('Профиль пользователя создан через service role');
        }
      }
    } else {
      console.log('Профиль пользователя создан успешно');
    }
    
    console.log('Пользователь по умолчанию создан. Email: pavel.dylkin@gmail.com, Пароль: 00016346');
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