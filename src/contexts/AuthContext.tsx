import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthUser } from '../types/User';

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

  // Авторизация
  const login = (email: string, password: string): boolean => {
    const foundUser = users.find(u => u.email === email && u.password === password);
    if (foundUser) {
      setUser({
        id: foundUser.id,
        fullName: foundUser.fullName,
        email: foundUser.email,
        role: foundUser.role
      });
      localStorage.setItem('currentUser', JSON.stringify({
        id: foundUser.id,
        fullName: foundUser.fullName,
        email: foundUser.email,
        role: foundUser.role
      }));
      return true;
    }
    return false;
  };

  // Выход
  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
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

  // Смена пароля (для обычных пользователей)
  const changePassword = (userId: string, oldPassword: string, newPassword: string): boolean => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return false;
    
    // Проверяем старый пароль
    if (targetUser.password !== oldPassword) return false;
    
    // Обновляем пароль
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, password: newPassword } : u
    ));
    
    return true;
  };

  // Сброс пароля (только для администраторов)
  const resetPassword = (userId: string, newPassword: string): boolean => {
    if (user?.role !== 'administrator') return false;
    
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return false;
    
    // Обновляем пароль без проверки старого
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, password: newPassword } : u
    ));
    
    return true;
  };
  // Восстановление сессии при загрузке
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const value = {
    user,
    users,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    changePassword,
    resetPassword,
    hasAccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};