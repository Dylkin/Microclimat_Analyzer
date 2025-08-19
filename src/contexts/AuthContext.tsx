import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthUser } from '../types/User';
import { supabase } from '../utils/supabaseClient';

interface AuthContextType {
  user: AuthUser | null;
  users: User[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  hasAccess: (page: 'analyzer' | 'users' | 'help') => boolean;
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
  id: '1',
  fullName: 'Дылкин П.А.',
  email: 'pavel.dylkin@gmail.com',
  password: '00016346',
  role: 'administrator',
  isDefault: true
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<User[]>([defaultUser]);
  const [isLoading, setIsLoading] = useState(true);

  // Проверяем сессию Supabase при загрузке
  useEffect(() => {
    checkSupabaseSession();
    
    // Подписываемся на изменения аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Пользователь вошел в систему
          const userData = await getUserFromSupabase(session.user.id);
          if (userData) {
            setUser(userData);
          }
        } else {
          // Пользователь вышел из системы
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkSupabaseSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userData = await getUserFromSupabase(session.user.id);
        if (userData) {
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Ошибка проверки сессии:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserFromSupabase = async (userId: string): Promise<AuthUser | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        role: data.role
      };
    } catch (error) {
      console.error('Ошибка получения пользователя:', error);
      return null;
    }
  };
  // Проверка доступа к страницам
  const hasAccess = (page: 'analyzer' | 'users' | 'help'): boolean => {
    if (!user) return false;

    switch (user.role) {
      case 'administrator':
        return true; // Полный доступ ко всем страницам
      case 'specialist':
        return page === 'analyzer' || page === 'help'; // К анализатору и справке
      case 'manager':
      case 'director':
        return page === 'users' || page === 'help'; // К справочнику пользователей и справке
      default:
        return false;
    }
  };

  // Авторизация
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        const userData = await getUserFromSupabase(data.user.id);
        if (userData) {
          setUser(userData);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Ошибка входа:', error);
      return false;
    }
  };

  // Выход
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  // Добавление пользователя
  const addUser = (newUser: Omit<User, 'id'>) => {
    const user: User = {
      ...newUser,
      id: Date.now().toString()
    };
    setUsers(prev => [...prev, user]);
  };

  // Обновление пользователя
  const updateUser = (id: string, updatedUser: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updatedUser } : u));
  };

  // Удаление пользователя
  const deleteUser = (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete?.isDefault) return; // Нельзя удалить пользователя по умолчанию
    
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  // Восстановление сессии при загрузке

  const value = {
    user,
    users,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    hasAccess,
    isLoading
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};