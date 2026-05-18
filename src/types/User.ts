export type UserRole = 'admin' | 'administrator' | 'specialist' | 'manager' | 'director';

export interface User {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  /** Текстовая должность (устаревшее) или подпись, синхронизируемая с штатной должностью */
  position?: string;
  /** Должность из справочника «Структура предприятия» */
  staffPositionId?: string | null;
  staffDepartmentName?: string;
  staffPositionName?: string;
  isDefault?: boolean;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}