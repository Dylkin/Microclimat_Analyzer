import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, UserRole } from '../types/database';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: 'users' | 'files' | 'research') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Проверка прав доступа
  const hasPermission = (permission: 'users' | 'files' | 'research'): boolean => {
    if (!user) return false;

    const permissions = {
      administrator: { users: true, files: true, research: true },
      manager: { users: true, files: true, research: false },
      specialist: { users: false, files: true, research: true }
    };

    return permissions[user.role][permission];
  };

  // Получение данных пользователя из таблицы users
  const fetchUserProfile = async (authUserId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUserId)
      .single();

    if (error || !data) {
      console.error('Ошибка получения профиля пользователя:', error);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role
    };
  };

  // Вход в систему
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const userProfile = await fetchUserProfile(data.user.id);
        if (userProfile) {
          setUser(userProfile);
          return { success: true };
        } else {
          return { success: false, error: 'Профиль пользователя не найден' };
        }
      }

      return { success: false, error: 'Неизвестная ошибка' };
    } catch (error) {
      return { success: false, error: 'Ошибка подключения' };
    }
  };

  // Выход из системы
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Проверка текущей сессии при загрузке
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user.id);
          setUser(userProfile);
        }
      } catch (error) {
        console.error('Ошибка проверки сессии:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Подписка на изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        setUser(userProfile);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    signIn,
    signOut,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};