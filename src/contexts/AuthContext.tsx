import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthUser } from '../types/User';
import { userService } from '../utils/userService';

// Helper function to validate UUID format
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

interface AuthContextType {
  user: AuthUser | null;
  users: User[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  changePassword: (userId: string, oldPassword: string, newPassword: string) => Promise<boolean>;
  resetPassword: (userId: string, newPassword: string) => Promise<boolean>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updatePasswordWithToken: (newPassword: string) => Promise<void>;
  hasAccess: (page: 'analyzer' | 'help' | 'database' | 'users' | 'admin') => boolean;
  reloadUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const defaultUser: User = {
  id: '00000000-0000-0000-0000-000000000001',
  fullName: 'Дылкин П.А.',
  email: 'pavel.dylkin@gmail.com',
  password: '00016346',
  role: 'administrator',
  isDefault: true
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<User[]>([defaultUser]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка пользователей из базы данных
  const loadUsers = async () => {
    if (!userService.isAvailable()) {
      console.warn('Supabase не настроен, используем локальные данные');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dbUsers = await userService.getAllUsers();
      setUsers(dbUsers);
      console.log('Пользователи загружены из базы данных:', dbUsers.length);
    } catch (error) {
      console.error('Ошибка загрузки пользователей из БД:', error);
      setError(`Ошибка загрузки пользователей: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      
      // Fallback к localStorage
      const savedUsers = localStorage.getItem('users');
      if (savedUsers) {
        try {
          const parsedUsers = JSON.parse(savedUsers);
          const hasDefaultUser = parsedUsers.some((u: User) => u.isDefault);
          if (!hasDefaultUser) {
            setUsers([defaultUser, ...parsedUsers]);
          } else {
            setUsers(parsedUsers);
          }
        } catch (parseError) {
          console.error('Ошибка парсинга пользователей из localStorage:', parseError);
          setUsers([defaultUser]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Сохранение пользователей в localStorage как резервная копия
  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);

  // Загрузка пользователей при инициализации
  useEffect(() => {
    loadUsers();
  }, []);

  // Проверка доступа к страницам
  const hasAccess = (page: 'analyzer' | 'help' | 'database' | 'users' | 'admin'): boolean => {
    if (!user) return false;

    console.log('hasAccess: проверка доступа для пользователя:', { 
      user: user.email, 
      role: user.role, 
      page 
    });

    switch (user.role) {
      case 'admin':
      case 'administrator':
        return true; // Полный доступ
      case 'specialist':
        return page === 'analyzer' || page === 'help' || page === 'database';
      case 'manager':
      case 'director':
        return page === 'analyzer' || page === 'help' || page === 'database';
      default:
        console.log('hasAccess: неизвестная роль:', user.role);
        return false;
    }
  };

  // Авторизация
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      let foundUser: User | null = null;

      // Сначала пытаемся авторизоваться через Supabase Auth
      if (userService.isAvailable()) {
        try {
          foundUser = await userService.getUserByCredentials(email, password);
        } catch (error) {
          console.error('Ошибка авторизации через Supabase Auth:', error);
        }
      }

      // Если не найден через Supabase Auth, ищем в локальных данных (fallback)
      if (!foundUser) {
        foundUser = users.find(u => u.email === email && u.password === password) || null;
      }

      if (foundUser) {
        const authUser = {
          id: foundUser.id,
          fullName: foundUser.fullName,
          email: foundUser.email,
          role: foundUser.role
        };
        
        setUser(authUser);
        localStorage.setItem('currentUser', JSON.stringify(authUser));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      return false;
    }
  };

  // Выход
  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  // Добавление пользователя
  const addUser = async (newUser: Omit<User, 'id'>): Promise<void> => {
    try {
      let addedUser: User;

      // Пытаемся добавить в базу данных
      if (userService.isAvailable()) {
        try {
          console.log('Добавляем пользователя через userService:', newUser);
          addedUser = await userService.addUser(newUser);
          console.log('Пользователь добавлен в БД:', addedUser);
        } catch (error) {
          console.error('Ошибка добавления в БД:', error);
          
          // Если ошибка связана с правами доступа, пробуем fallback
          if (error instanceof Error && error.message.includes('прав')) {
            console.warn('Используем fallback к локальному хранению');
            addedUser = {
              ...newUser,
              id: Date.now().toString()
            };
          } else {
            throw error;
          }
        }
      } else {
        // Fallback к локальному хранению
        console.log('Supabase недоступен, используем локальное хранение');
        addedUser = {
          ...newUser,
          id: Date.now().toString()
        };
      }

      setUsers(prev => [...prev, addedUser]);
      console.log('Пользователь добавлен в локальное состояние:', addedUser);
    } catch (error) {
      console.error('Ошибка добавления пользователя:', error);
      throw error;
    }
  };

  // Обновление пользователя
  const updateUser = async (id: string, updatedUser: Partial<User>) => {
    try {
      // Пытаемся обновить в базе данных
      if (userService.isAvailable()) {
        try {
          await userService.updateUser(id, updatedUser);
          console.log('Пользователь обновлен в БД:', id);
        } catch (error) {
          console.error('Ошибка обновления в БД:', error);
          throw error;
        }
      }

      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updatedUser } : u));
    } catch (error) {
      console.error('Ошибка обновления пользователя:', error);
      throw error;
    }
  };

  // Удаление пользователя
  const deleteUser = async (id: string) => {
    try {
      const userToDelete = users.find(u => u.id === id);
      if (userToDelete?.isDefault) {
        throw new Error('Нельзя удалить пользователя по умолчанию');
      }

      // Пытаемся удалить из базы данных
      if (userService.isAvailable()) {
        try {
          await userService.deleteUser(id);
          console.log('Пользователь удален из БД:', id);
        } catch (error) {
          console.error('Ошибка удаления из БД:', error);
          throw error;
        }
      }

      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (error) {
      console.error('Ошибка удаления пользователя:', error);
      throw error;
    }
  };

  // Смена пароля (для обычных пользователей)
  const changePassword = async (userId: string, oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const targetUser = users.find(u => u.id === userId);
      if (!targetUser) return false;
      
      // Проверяем старый пароль
      if (targetUser.password !== oldPassword) return false;
      
      // Обновляем пароль в базе данных
      if (userService.isAvailable()) {
        try {
          await userService.resetPassword(userId, newPassword);
        } catch (error) {
          console.error('Ошибка смены пароля в БД:', error);
          throw error;
        }
      }
      
      // Обновляем локальное состояние
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, password: newPassword } : u
      ));
      
      return true;
    } catch (error) {
      console.error('Ошибка смены пароля:', error);
      return false;
    }
  };

  // Сброс пароля (только для администраторов)
  const resetPassword = async (userId: string, newPassword: string): Promise<boolean> => {
    try {
      if (user?.role !== 'admin' && user?.role !== 'administrator') return false;
      
      const targetUser = users.find(u => u.id === userId);
      if (!targetUser) return false;
      
      // Обновляем пароль в базе данных
      if (userService.isAvailable()) {
        try {
          await userService.resetPassword(userId, newPassword);
        } catch (error) {
          console.error('Ошибка сброса пароля в БД:', error);
          throw error;
        }
      }
      
      // Обновляем локальное состояние
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, password: newPassword } : u
      ));
      
      return true;
    } catch (error) {
      console.error('Ошибка сброса пароля:', error);
      return false;
    }
  };

  // Отправка письма для сброса пароля
  const sendPasswordResetEmail = async (email: string): Promise<void> => {
    try {
      if (userService.isAvailable()) {
        await userService.sendPasswordResetEmail(email);
      } else {
        throw new Error('Сервис сброса пароля недоступен');
      }
    } catch (error) {
      console.error('Ошибка отправки письма для сброса пароля:', error);
      throw error;
    }
  };

  // Обновление пароля через токен сброса
  const updatePasswordWithToken = async (newPassword: string): Promise<void> => {
    try {
      if (userService.isAvailable()) {
        await userService.updatePasswordWithToken(newPassword);
      } else {
        throw new Error('Сервис обновления пароля недоступен');
      }
    } catch (error) {
      console.error('Ошибка обновления пароля через токен:', error);
      throw error;
    }
  };

  // Восстановление сессии при загрузке
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Проверяем, что ID пользователя является валидным UUID
        if (parsedUser.id && isValidUUID(parsedUser.id)) {
          setUser(parsedUser);
        } else {
          console.warn('Невалидный UUID пользователя в localStorage, очищаем сессию');
          localStorage.removeItem('currentUser');
        }
      } catch (error) {
        console.error('Ошибка парсинга пользователя из localStorage:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const value = {
    user,
    users,
    loading,
    error,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    changePassword,
    resetPassword,
    sendPasswordResetEmail,
    updatePasswordWithToken,
    hasAccess,
    reloadUsers: loadUsers
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};