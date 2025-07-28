import { supabase } from './supabase';

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
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'pavel.dylkin@gmail.com')
      .single();

    if (existingUser) {
      console.log('Пользователь по умолчанию уже существует');
      return;
    }

    // Создаем пользователя через Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'pavel.dylkin@gmail.com',
      password: '00016346',
    });

    if (authError) {
      console.error('Ошибка создания пользователя в auth:', authError);
      return;
    }

    if (authData.user) {
      // Создаем профиль пользователя
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: 'pavel.dylkin@gmail.com',
          full_name: 'Дылкин П.А.',
          role: 'administrator'
        });

      if (profileError) {
        console.error('Ошибка создания профиля:', profileError);
      } else {
        console.log('Пользователь по умолчанию создан успешно');
      }
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