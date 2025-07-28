import { supabase } from './supabase';

// Функция для создания пользователя по умолчанию
export async function createDefaultUser() {
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
  try {
    await createDefaultUser();
  } catch (error) {
    console.error('Ошибка инициализации базы данных:', error);
  }
}