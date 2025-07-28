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
    // Проверяем, есть ли service role key для использования admin API
    if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      console.error('VITE_SUPABASE_SERVICE_ROLE_KEY не найден. Невозможно создать пользователя по умолчанию.');
      return;
    }

    let userData;

    // Сначала пытаемся получить существующего пользователя через admin API
    const { data: existingAuthUsers, error: listError } = await adminSupabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Ошибка получения списка пользователей:', listError.message);
      return;
    }

    const existingAuthUser = existingAuthUsers.users.find(user => user.email === 'pavel.dylkin@gmail.com');

    if (existingAuthUser) {
      console.log('Пользователь уже существует в auth');
      userData = existingAuthUser;
    } else {
      console.log('Создаем пользователя через admin API...');
      
      // Создаем пользователя через admin API с подтвержденным email
      const { data: createData, error: createError } = await adminSupabase.auth.admin.createUser({
        email: 'pavel.dylkin@gmail.com',
        password: '00016346',
        email_confirm: true,
        user_metadata: {
          full_name: 'Дылкин П.А.'
        }
      });

      if (createError) {
        console.error('Ошибка создания пользователя через admin API:', createError.message);
        return;
      }

      if (!createData.user) {
        console.error('Не удалось получить данные пользователя');
        return;
      }

      userData = createData.user;
      console.log('Пользователь создан через admin API');
    }

    // Создаем профиль пользователя в таблице users
    const { error: profileError } = await adminSupabase
      .from('users')
      .insert({
        id: userData!.id,
        email: 'pavel.dylkin@gmail.com',
        full_name: 'Дылкин П.А.',
        role: 'administrator'
      });

    if (profileError) {
      if (profileError.message.includes('duplicate key')) {
        console.log('Профиль пользователя уже существует');
      } else {
        console.error('Ошибка создания профиля через service role:', profileError.message);
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