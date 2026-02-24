-- Добавление поля position (Должность) в таблицу users, если его ещё нет
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS position TEXT;
