-- Количество сотрудников по должности задаётся вручную на странице «Структура предприятия»
-- (не связано со справочником пользователей)
ALTER TABLE public.staff_positions
  ADD COLUMN IF NOT EXISTS employee_count INTEGER NOT NULL DEFAULT 1;

-- Первичная инициализация текущим количеством сотрудников из справочника пользователей
UPDATE public.staff_positions sp
SET employee_count = (SELECT COUNT(*) FROM public.users u WHERE u.staff_position_id = sp.id);
