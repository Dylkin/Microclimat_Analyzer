import { supabase } from './supabase';

// Функция для создания администратора по умолчанию
export async function createDefaultAdmin() {
  try {
    console.log('Создание администратора по умолчанию...');
    
    const email = 'pavel.dylkin@gmail.com';
    const password = '00016346';
    const fullName = 'Дылкин П.А.';

    // Сначала пытаемся войти
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.log('Пользователь не найден, создаем нового администратора...');
      
      // Создаем нового пользователя
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (signUpError) {
        console.error('Ошибка создания пользователя:', signUpError.message);
        return false;
      }

      if (signUpData.user) {
        console.log('Пользователь создан, создаем профиль...');
        
        // Создаем профиль администратора
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: signUpData.user.id,
            email,
            full_name: fullName,
            role: 'administrator'
          });

        if (profileError) {
          console.error('Ошибка создания профиля:', profileError.message);
          return false;
        }

        console.log('Администратор создан успешно');
        return true;
      }
    } else {
      console.log('Администратор уже существует');
      
      // Проверяем, есть ли профиль
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', signInData.user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Профиль не найден, создаем
        const { error: createProfileError } = await supabase
          .from('users')
          .insert({
            id: signInData.user.id,
            email,
            full_name: fullName,
            role: 'administrator'
          });

        if (createProfileError) {
          console.error('Ошибка создания профиля:', createProfileError.message);
          return false;
        }

        console.log('Профиль администратора создан');
      }
      
      return true;
    }
  } catch (error) {
    console.error('Неожиданная ошибка при создании администратора:', error);
    return false;
  }
}

// Функция для инициализации базы данных
export async function initializeDatabase() {
  try {
    console.log('Инициализация базы данных...');
    await createDefaultAdmin();
    console.log('База данных инициализирована');
  } catch (error) {
    console.error('Ошибка инициализации базы данных:', error);
  }
}