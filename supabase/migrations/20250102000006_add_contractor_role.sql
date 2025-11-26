-- Миграция: Добавление поля role в таблицу contractors
-- Дата: 2025-01-02

-- Добавление поля role (массив ролей: 'supplier' - Поставщик, 'buyer' - Покупатель)
ALTER TABLE public.contractors 
ADD COLUMN IF NOT EXISTS role TEXT[] DEFAULT '{}';

-- Создание индекса для оптимизации запросов по роли
CREATE INDEX IF NOT EXISTS idx_contractors_role ON public.contractors USING GIN(role);

-- Комментарий к колонке
COMMENT ON COLUMN public.contractors.role IS 'Роли контрагента: supplier (Поставщик), buyer (Покупатель). Может содержать несколько значений.';



