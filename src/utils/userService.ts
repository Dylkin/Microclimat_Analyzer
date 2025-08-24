import { createClient } from '@supabase/supabase-js';
import { User, UserRole } from '../types/User';

// Получаем конфигурацию Supabase из переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;

// Инициализация Supabase клиента
const initSupabase = () => {
  if (!supabase && supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
};

export interface DatabaseUser {
  id: string;
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export class UserService {
  private supabase: any;

  constructor() {
    this.supabase = initSupabase();
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Получение всех пользователей
  async getAllUsers(): Promise<User[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Ошибка получения пользователей:', error);
        throw new Error(`Ошибка получения пользователей: ${error.message}`);
      }

      return data.map((dbUser: DatabaseUser) => ({
        id: dbUser.id,
        fullName: dbUser.full_name,
        email: dbUser.email,
        password: dbUser.password,
        role: dbUser.role,
        isDefault: dbUser.is_default
      }));
    } catch (error) {
      console.error('Ошибка при получении пользователей:', error);
      throw error;
    }
  }

  // Получение пользователя по email и паролю
  async getUserByCredentials(email: string, password: string): Promise<User | null> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Пользователь не найден
          return null;
        }
        console.error('Ошибка получения пользователя:', error);
        throw new Error(`Ошибка получения пользователя: ${error.message}`);
      }

      return {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        password: data.password,
        role: data.role,
        isDefault: data.is_default
      };
    } catch (error) {
      console.error('Ошибка при получении пользователя по учетным данным:', error);
      throw error;
    }
  }

  // Добавление нового пользователя
  async addUser(user: Omit<User, 'id'>): Promise<User> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Добавляем пользователя:', user);
      
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          full_name: user.fullName,
          email: user.email,
          password: user.password,
          role: user.role,
          is_default: user.isDefault || false
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка добавления пользователя:', error);
        console.error('Детали ошибки:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        if (error.code === '23505') {
          throw new Error('Пользователь с таким email уже существует');
        }
        if (error.code === '42501') {
          throw new Error('Недостаточно прав для добавления пользователя');
        }
        if (error.code === 'PGRST301') {
          throw new Error('Недостаточно прав для добавления пользователя. Убедитесь, что вы авторизованы как администратор.');
        }
        throw new Error(`Ошибка добавления пользователя: ${error.message}`);
      }

      console.log('Пользователь успешно добавлен:', data);
      
      return {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        password: data.password,
        role: data.role,
        isDefault: data.is_default
      };
    } catch (error) {
      console.error('Ошибка при добавлении пользователя:', error);
      throw error;
    }
  }

  // Обновление пользователя
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const updateData: any = {};
      
      if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.password !== undefined) updateData.password = updates.password;
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

      const { data, error } = await this.supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Ошибка обновления пользователя:', error);
        if (error.code === '23505') {
          throw new Error('Пользователь с таким email уже существует');
        }
        throw new Error(`Ошибка обновления пользователя: ${error.message}`);
      }

      return {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        password: data.password,
        role: data.role,
        isDefault: data.is_default
      };
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      throw error;
    }
  }

  // Удаление пользователя
  async deleteUser(id: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', id)
        .eq('is_default', false); // Дополнительная защита от удаления пользователя по умолчанию

      if (error) {
        console.error('Ошибка удаления пользователя:', error);
        throw new Error(`Ошибка удаления пользователя: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      throw error;
    }
  }

  // Сброс пароля пользователя
  async resetPassword(id: string, newPassword: string): Promise<void> {
    if (!this.supabase) {
      console.warn('Supabase не настроен - сброс пароля невозможен');
      throw new Error('База данных недоступна');
    }

    try {
      const { error } = await this.supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', id);

      if (error) {
        console.error('Ошибка сброса пароля:', error);
        throw new Error(`Ошибка сброса пароля: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при сбросе пароля:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const userService = new UserService();