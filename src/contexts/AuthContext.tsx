import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User, AuthUser } from '../types/User';
import { userService } from '../utils/userService';

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

// Helper function to validate UUID format
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

interface AuthContextType {
  user: AuthUser | null;
  users: User[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  changePassword: (userId: string, oldPassword: string, newPassword: string) => boolean;
  resetPassword: (userId: string, newPassword: string) => boolean;
  hasAccess: (page: 'analyzer' | 'help' | 'database' | 'users') => boolean;
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
  id: '00000000-0000-4000-8000-000000000001',
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Сохранение пользователей в localStorage как резервная копия
  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);

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

  useEffect(() => {
    const initializeAuth = async () => {
      const supabaseClient = initSupabase();
      
      if (supabaseClient) {
        try {
          // Проверяем текущую сессию
          const { data: { session } } = await supabaseClient.auth.getSession();
          
          if (!session) {
            // Если нет сессии, входим как пользователь по умолчанию
            const { data, error } = await supabaseClient.auth.signInWithPassword({
              email: 'default@example.com',
              password: 'defaultpassword123'
            });
            
            if (error) {
              console.warn('Не удалось войти как пользователь по умолчанию:', error);
              // Устанавливаем пользователя по умолчанию без аутентификации
              setUser(defaultUser);
            } else {
              // Устанавливаем аутентифицированного пользователя
              setUser({
                ...defaultUser,
                id: data.user?.id || defaultUser.id
              });
            }
          } else {
            // Если есть сессия, используем данные из неё
            setUser({
              ...defaultUser,
              id: session.user.id
            });
          }
        } catch (error) {
          console.warn('Ошибка инициализации аутентификации:', error);
          setUser(defaultUser);
        }
      } else {
        // Если Supabase недоступен, используем пользователя по умолчанию
        setUser(defaultUser);
      }
      
      setIsInitialized(true);
    };

    initializeAuth();
  }, []);

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

  // Загрузка пользователей при инициализации
  useEffect(() => {
    loadUsers();
  }, []);

  // Проверка доступа к страницам
  const hasAccess = (page: 'analyzer' | 'help' | 'database' | 'users'): boolean => {
    if (!user) return false;

    switch (user.role) {
      case 'administrator':
        return true; // Полный доступ
      case 'specialist':
        return page === 'analyzer' || page === 'help' || page === 'database';
      case 'manager':
      case 'director':
        return page === 'analyzer' || page === 'help' || page === 'database';
      default:
        return false;
    }
  };

  // Не рендерим детей пока не инициализирована аутентификация
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  // Авторизация
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      let foundUser: User | null = null;

      // Сначала пытаемся найти в базе данных
      if (userService.isAvailable()) {
        try {
          foundUser = await userService.getUserByCredentials(email, password);
        } catch (error) {
          console.error('Ошибка авторизации через БД:', error);
        }
      }

      // Если не найден в БД, ищем в локальных данных
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
      if (user?.role !== 'administrator') return false;
      
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

  const value = {
    user,
    users,
    loading,
    error,
    loading,
    error,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    changePassword,
    resetPassword,
    hasAccess,
    reloadUsers: loadUsers
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};