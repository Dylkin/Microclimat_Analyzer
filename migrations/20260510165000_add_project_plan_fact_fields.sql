-- Добавляет поля стоимости и план/факт дат для проектов
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS total_cost_with_vat NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS start_date_planned DATE,
ADD COLUMN IF NOT EXISTS start_date_actual DATE,
ADD COLUMN IF NOT EXISTS end_date_planned DATE,
ADD COLUMN IF NOT EXISTS end_date_actual DATE;
