import { apiClient } from './apiClient';
import { User, UserRole } from '../types/User';

class UserService {
  // Проверка доступности API
  isAvailable(): boolean {
    return !!apiClient;
  }

  // Получение всех пользователей
  async getAllUsers(): Promise<User[]> {
    try {
      return await apiClient.get<User[]>('/users');
    } catch (error) {
      console.error('Ошибка при получении пользователей:', error);
      throw error;
    }
  }

  // Получение пользователя по email и паролю
  async getUserByCredentials(email: string, password: string): Promise<User | null> {
    try {
      return await apiClient.post<User>('/users/login', { email, password });
    } catch (error: any) {
      console.error('Ошибка при получении пользователя по учетным данным:', error);
      if (error.message.includes('401') || error.message.includes('Неверный')) {
        return null;
      }
      throw error;
    }
  }

  // Добавление нового пользователя
  async addUser(user: Omit<User, 'id'>): Promise<User> {
    try {
      return await apiClient.post<User>('/users', user);
    } catch (error) {
      console.error('Ошибка при добавлении пользователя:', error);
      throw error;
    }
  }

  // Обновление пользователя
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      return await apiClient.put<User>(`/users/${id}`, updates);
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      throw error;
    }
  }

  // Удаление пользователя
  async deleteUser(id: string): Promise<void> {
    try {
      await apiClient.delete(`/users/${id}`);
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      throw error;
    }
  }

  // Сброс пароля пользователя
  async resetPassword(id: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post(`/users/${id}/reset-password`, { newPassword });
    } catch (error) {
      console.error('Ошибка при сбросе пароля:', error);
      throw error;
    }
  }

  // Отправка письма для сброса пароля (заглушка, требует реализации на backend)
  async sendPasswordResetEmail(email: string): Promise<void> {
    console.warn('sendPasswordResetEmail не реализован для PostgreSQL API');
    throw new Error('Функция отправки письма для сброса пароля не реализована');
  }

  // Обновление пароля через токен сброса (заглушка, требует реализации на backend)
  async updatePasswordWithToken(newPassword: string): Promise<void> {
    console.warn('updatePasswordWithToken не реализован для PostgreSQL API');
    throw new Error('Функция обновления пароля через токен не реализована');
  }
}

// Экспорт синглтона сервиса
export const userService = new UserService();


