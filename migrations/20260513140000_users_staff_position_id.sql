-- Связь пользователя с должностью из справочника «Структура предприятия»
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS staff_position_id UUID REFERENCES public.staff_positions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_staff_position_id ON public.users(staff_position_id);
