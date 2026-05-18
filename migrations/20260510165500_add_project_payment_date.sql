-- Добавляет дату оплаты для проектов
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS payment_date DATE;
