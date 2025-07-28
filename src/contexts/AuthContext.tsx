import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Получаем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Слушаем изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        setSupabaseUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Получение профиля пользователя:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Ошибка получения профиля:', error.message);
        
        if (error.code === 'PGRST116') {
          // Профиль не найден, создаем базовый
          console.log('Профиль не найден, создаем новый...');
          await createUserProfile(userId);
          return;
        }
        
        setUser(null);
      } else {
        console.log('Профиль получен:', data);
        setUser(data);
      }
    } catch (error) {
      console.error('Неожиданная ошибка при получении профиля:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (userId: string) => {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) return;

      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: authUser.user.email || '',
          full_name: authUser.user.user_metadata?.full_name || 'Новый пользователь',
          role: 'specialist'
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка создания профиля:', error.message);
        setUser(null);
      } else {
        console.log('Профиль создан:', data);
        setUser(data);
      }
    } catch (error) {
      console.error('Ошибка создания профиля:', error);
      setUser(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('Попытка входа:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('Ошибка входа:', error.message);
      throw error;
    }
  };

  const signOut = async () => {
    console.log('Выход из системы');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Ошибка выхода:', error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, supabaseUser, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}