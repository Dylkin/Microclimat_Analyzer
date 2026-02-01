export type UserRole = 'admin' | 'administrator' | 'specialist' | 'manager' | 'director';

export interface User {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  position?: string;
  isDefault?: boolean;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}