-- Добавление полей для хранения информации о загрузке шаблонов
ALTER TABLE public.qualification_object_types
  ADD COLUMN IF NOT EXISTS protocol_template_uploaded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS protocol_template_uploaded_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS protocol_template_uploaded_by_name TEXT,
  ADD COLUMN IF NOT EXISTS contract_template_uploaded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS contract_template_uploaded_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS contract_template_uploaded_by_name TEXT;

-- Комментарии к новым полям
COMMENT ON COLUMN public.qualification_object_types.protocol_template_uploaded_at IS 'Дата и время загрузки шаблона протокола';
COMMENT ON COLUMN public.qualification_object_types.protocol_template_uploaded_by IS 'ID пользователя, загрузившего шаблон протокола';
COMMENT ON COLUMN public.qualification_object_types.protocol_template_uploaded_by_name IS 'ФИО пользователя, загрузившего шаблон протокола';
COMMENT ON COLUMN public.qualification_object_types.contract_template_uploaded_at IS 'Дата и время загрузки шаблона договора';
COMMENT ON COLUMN public.qualification_object_types.contract_template_uploaded_by IS 'ID пользователя, загрузившего шаблон договора';
COMMENT ON COLUMN public.qualification_object_types.contract_template_uploaded_by_name IS 'ФИО пользователя, загрузившего шаблон договора';





