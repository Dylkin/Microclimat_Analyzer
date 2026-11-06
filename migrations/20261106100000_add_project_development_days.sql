-- Дни разработки протокола и отчёта — переменные расчёта стоимости, задаются на странице «Проекты»
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS protocol_development_days NUMERIC(6, 1),
  ADD COLUMN IF NOT EXISTS report_development_days NUMERIC(6, 1);
