-- Создание таблицы для типов объектов квалификации
CREATE TABLE IF NOT EXISTS public.qualification_object_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_key TEXT NOT NULL UNIQUE, -- Ключ типа (помещение, автомобиль и т.д.)
  type_label TEXT NOT NULL, -- Название типа (Помещение, Автомобиль и т.д.)
  description TEXT, -- Описание типа
  protocol_template_url TEXT, -- URL шаблона протокола в Storage
  protocol_template_filename TEXT, -- Имя файла шаблона протокола
  contract_template_url TEXT, -- URL шаблона договора в Storage
  contract_template_filename TEXT, -- Имя файла шаблона договора
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id)
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_qualification_object_types_type_key 
  ON public.qualification_object_types(type_key);

-- Комментарии к таблице и колонкам
COMMENT ON TABLE public.qualification_object_types IS 'Таблица для хранения типов объектов квалификации и их шаблонов';
COMMENT ON COLUMN public.qualification_object_types.type_key IS 'Ключ типа объекта квалификации (помещение, автомобиль и т.д.)';
COMMENT ON COLUMN public.qualification_object_types.type_label IS 'Название типа объекта квалификации';
COMMENT ON COLUMN public.qualification_object_types.description IS 'Описание типа объекта квалификации';
COMMENT ON COLUMN public.qualification_object_types.protocol_template_url IS 'URL шаблона протокола в Storage';
COMMENT ON COLUMN public.qualification_object_types.protocol_template_filename IS 'Имя файла шаблона протокола';
COMMENT ON COLUMN public.qualification_object_types.contract_template_url IS 'URL шаблона договора в Storage';
COMMENT ON COLUMN public.qualification_object_types.contract_template_filename IS 'Имя файла шаблона договора';

-- Вставка начальных данных для всех типов объектов квалификации
INSERT INTO public.qualification_object_types (type_key, type_label, description)
VALUES
  ('помещение', 'Помещение', 'Помещения различного назначения (склады, производственные цеха, офисы и т.д.)'),
  ('автомобиль', 'Автомобиль', 'Автомобили для перевозки грузов с контролируемым температурным режимом'),
  ('холодильная_камера', 'Холодильная камера', 'Стационарные холодильные камеры для хранения продукции'),
  ('холодильник', 'Холодильник', 'Бытовые и промышленные холодильники'),
  ('морозильник', 'Морозильник', 'Бытовые и промышленные морозильные камеры')
ON CONFLICT (type_key) DO NOTHING;




