-- Расширение допустимых ролей в users.role до значений из приложения
-- (admin, administrator, user, viewer, specialist, manager, director)
-- Выполните один раз: psql -U postgres -d your_db -f fix_users_role_constraint.sql

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'administrator', 'user', 'viewer', 'specialist', 'manager', 'director'));
