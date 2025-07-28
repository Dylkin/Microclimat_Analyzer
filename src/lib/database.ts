import { supabase } from './supabase';

// Функция для создания пользователя по умолчанию
export async function createDefaultUser() {
  try {
    console.log('Создание пользователя по умолчанию...');
    
    // Проверяем, существует ли пользователь
    const { data: existingUser } = await supabase.auth.getUser();
    
    if (existingUser.user) {
      console.log('Пользователь уже авторизован');
      return;
    }

    // Пытаемся войти с тестовыми данными
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'pavel.dylkin@gmail.com',
      password: '00016346'
    });

    if (signInError) {
      console.log('Пользователь не найден, создаем нового...');
      
      // Создаем нового пользователя
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'pavel.dylkin@gmail.com',
        password: '00016346',
        options: {
          data: {
            full_name: 'Дылкин П.А.'
          }
        }
      });

      if (signUpError) {
        console.error('Ошибка создания пользователя:', signUpError.message);
        return;
      }

      if (signUpData.user) {
        console.log('Пользователь создан успешно');
        
        // Создаем профиль в таблице users
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: signUpData.user.id,
            email: 'pavel.dylkin@gmail.com',
            full_name: 'Дылкин П.А.',
            role: 'administrator'
          });

        if (profileError && !profileError.message.includes('duplicate key')) {
          console.error('Ошибка создания профиля:', profileError.message);
        } else {
          console.log('Профиль пользователя создан');
        }
      }
    } else {
      console.log('Пользователь успешно авторизован');
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