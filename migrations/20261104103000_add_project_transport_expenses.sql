-- Транспортные расходы проекта (участвуют в расчёте рекомендуемой стоимости)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS transport_expenses NUMERIC(15, 2);
