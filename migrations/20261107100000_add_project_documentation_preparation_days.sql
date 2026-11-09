-- Единая переменная «Кол-во дней на подготовку документации» — заменяет
-- protocol_development_days и report_development_days в расчёте стоимости
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS documentation_preparation_days NUMERIC(6, 1);
