-- Архив должностей: архивные должности не участвуют в расчёте ФОТ
ALTER TABLE public.staff_positions
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
