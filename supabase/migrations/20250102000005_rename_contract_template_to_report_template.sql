-- Миграция: Переименование полей contract_template в report_template
-- Дата: 2025-01-02

-- Переименование колонок в таблице qualification_object_types
ALTER TABLE public.qualification_object_types 
  RENAME COLUMN contract_template_url TO report_template_url;

ALTER TABLE public.qualification_object_types 
  RENAME COLUMN contract_template_filename TO report_template_filename;

ALTER TABLE public.qualification_object_types 
  RENAME COLUMN contract_template_uploaded_at TO report_template_uploaded_at;

ALTER TABLE public.qualification_object_types 
  RENAME COLUMN contract_template_uploaded_by TO report_template_uploaded_by;

ALTER TABLE public.qualification_object_types 
  RENAME COLUMN contract_template_uploaded_by_name TO report_template_uploaded_by_name;

-- Обновление комментариев
COMMENT ON COLUMN public.qualification_object_types.report_template_url IS 'URL шаблона отчета в Storage';
COMMENT ON COLUMN public.qualification_object_types.report_template_filename IS 'Имя файла шаблона отчета';
COMMENT ON COLUMN public.qualification_object_types.report_template_uploaded_at IS 'Дата и время загрузки шаблона отчета';
COMMENT ON COLUMN public.qualification_object_types.report_template_uploaded_by IS 'ID пользователя, загрузившего шаблон отчета';
COMMENT ON COLUMN public.qualification_object_types.report_template_uploaded_by_name IS 'ФИО пользователя, загрузившего шаблон отчета';



