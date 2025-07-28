export type UserRole = 'administrator' | 'specialist' | 'manager';

export interface User {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  isDefault?: boolean;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}