-- ================================================
-- Microclimat Analyzer Database Setup
-- ================================================
-- Выполните этот скрипт в Supabase SQL Editor
-- ================================================

-- Включение расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- 1. СОЗДАНИЕ ТАБЛИЦ
-- ================================================

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица подрядчиков
CREATE TABLE IF NOT EXISTS public.contractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  inn TEXT,
  kpp TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  contact_person TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица проектов
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  contract_number TEXT,
  contract_date DATE,
  contractor_id UUID REFERENCES public.contractors(id),
  climate_installation TEXT,
  test_type TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица объектов квалификации
CREATE TABLE IF NOT EXISTS public.qualification_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  object_type TEXT NOT NULL CHECK (object_type IN ('cold_chamber', 'freezer', 'refrigerator', 'vehicle', 'room')),
  climate_system TEXT,
  temperature_limits JSONB DEFAULT '{"min": null, "max": null}',
  humidity_limits JSONB DEFAULT '{"min": null, "max": null}',
  measurement_zones INTEGER DEFAULT 0,
  work_schedule JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица оборудования
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('temperature_logger', 'humidity_logger', 'combined_logger', 'other')),
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT UNIQUE,
  calibration_date DATE,
  next_calibration_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица периодов испытаний
CREATE TABLE IF NOT EXISTS public.testing_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  qualification_object_id UUID REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица загруженных файлов
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  qualification_object_id UUID REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
  testing_period_id UUID REFERENCES public.testing_periods(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'error')),
  error_message TEXT,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица данных логгеров (сводная)
CREATE TABLE IF NOT EXISTS public.logger_data_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  qualification_object_id UUID REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
  testing_period_id UUID REFERENCES public.testing_periods(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id),
  uploaded_file_id UUID REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  measurement_zone INTEGER,
  measurement_level NUMERIC,
  data_points_count INTEGER DEFAULT 0,
  start_timestamp TIMESTAMP WITH TIME ZONE,
  end_timestamp TIMESTAMP WITH TIME ZONE,
  temperature_min NUMERIC,
  temperature_max NUMERIC,
  temperature_avg NUMERIC,
  humidity_min NUMERIC,
  humidity_max NUMERIC,
  humidity_avg NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица данных логгеров (детальная)
CREATE TABLE IF NOT EXISTS public.logger_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  summary_id UUID REFERENCES public.logger_data_summary(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  temperature NUMERIC,
  humidity NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица отчетов
CREATE TABLE IF NOT EXISTS public.analysis_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  qualification_object_id UUID REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  report_type TEXT DEFAULT 'trial' CHECK (report_type IN ('trial', 'summary')),
  report_data JSONB,
  report_url TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица документов проекта
CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'plan', 'protocol', 'report', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица согласования документов
CREATE TABLE IF NOT EXISTS public.document_approval (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.project_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица проверки документации
CREATE TABLE IF NOT EXISTS public.documentation_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL,
  status TEXT DEFAULT 'not_checked' CHECK (status IN ('not_checked', 'compliant', 'non_compliant')),
  notes TEXT,
  checked_by UUID REFERENCES public.users(id),
  checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица аудита
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 2. СОЗДАНИЕ ИНДЕКСОВ
-- ================================================

-- Индексы для users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Индексы для projects
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_contractor ON public.projects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);

-- Индексы для qualification_objects
CREATE INDEX IF NOT EXISTS idx_qualification_objects_project ON public.qualification_objects(project_id);
CREATE INDEX IF NOT EXISTS idx_qualification_objects_type ON public.qualification_objects(object_type);

-- Индексы для equipment
CREATE INDEX IF NOT EXISTS idx_equipment_serial ON public.equipment(serial_number);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON public.equipment(status);

-- Индексы для testing_periods
CREATE INDEX IF NOT EXISTS idx_testing_periods_project ON public.testing_periods(project_id);
CREATE INDEX IF NOT EXISTS idx_testing_periods_object ON public.testing_periods(qualification_object_id);
CREATE INDEX IF NOT EXISTS idx_testing_periods_status ON public.testing_periods(status);

-- Индексы для uploaded_files
CREATE INDEX IF NOT EXISTS idx_uploaded_files_project ON public.uploaded_files(project_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_object ON public.uploaded_files(qualification_object_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_period ON public.uploaded_files(testing_period_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON public.uploaded_files(status);

-- Индексы для logger_data_summary
CREATE INDEX IF NOT EXISTS idx_logger_summary_project ON public.logger_data_summary(project_id);
CREATE INDEX IF NOT EXISTS idx_logger_summary_object ON public.logger_data_summary(qualification_object_id);
CREATE INDEX IF NOT EXISTS idx_logger_summary_period ON public.logger_data_summary(testing_period_id);
CREATE INDEX IF NOT EXISTS idx_logger_summary_file ON public.logger_data_summary(uploaded_file_id);

-- Индексы для logger_data
CREATE INDEX IF NOT EXISTS idx_logger_data_summary ON public.logger_data(summary_id);
CREATE INDEX IF NOT EXISTS idx_logger_data_timestamp ON public.logger_data(timestamp);

-- Индексы для analysis_reports
CREATE INDEX IF NOT EXISTS idx_analysis_reports_project ON public.analysis_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_object ON public.analysis_reports(qualification_object_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_type ON public.analysis_reports(report_type);

-- Индексы для project_documents
CREATE INDEX IF NOT EXISTS idx_project_documents_project ON public.project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_type ON public.project_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_project_documents_status ON public.project_documents(approval_status);

-- Индексы для audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- ================================================
-- 3. НАСТРОЙКА ROW LEVEL SECURITY (RLS)
-- ================================================

-- Включение RLS для всех таблиц
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logger_data_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logger_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_approval ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentation_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Политики для users
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Политики для contractors
CREATE POLICY "Authenticated users can view contractors" ON public.contractors
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert contractors" ON public.contractors
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update contractors" ON public.contractors
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Политики для projects
CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert projects" ON public.projects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update projects" ON public.projects
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete projects" ON public.projects
  FOR DELETE USING (auth.role() = 'authenticated');

-- Политики для qualification_objects
CREATE POLICY "Authenticated users can view qualification objects" ON public.qualification_objects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert qualification objects" ON public.qualification_objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update qualification objects" ON public.qualification_objects
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete qualification objects" ON public.qualification_objects
  FOR DELETE USING (auth.role() = 'authenticated');

-- Политики для equipment
CREATE POLICY "Authenticated users can view equipment" ON public.equipment
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage equipment" ON public.equipment
  FOR ALL USING (auth.role() = 'authenticated');

-- Политики для testing_periods
CREATE POLICY "Authenticated users can view testing periods" ON public.testing_periods
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage testing periods" ON public.testing_periods
  FOR ALL USING (auth.role() = 'authenticated');

-- Политики для uploaded_files
CREATE POLICY "Authenticated users can view uploaded files" ON public.uploaded_files
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage uploaded files" ON public.uploaded_files
  FOR ALL USING (auth.role() = 'authenticated');

-- Политики для logger_data_summary
CREATE POLICY "Authenticated users can view logger data summary" ON public.logger_data_summary
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage logger data summary" ON public.logger_data_summary
  FOR ALL USING (auth.role() = 'authenticated');

-- Политики для logger_data
CREATE POLICY "Authenticated users can view logger data" ON public.logger_data
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage logger data" ON public.logger_data
  FOR ALL USING (auth.role() = 'authenticated');

-- Политики для analysis_reports
CREATE POLICY "Authenticated users can view reports" ON public.analysis_reports
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage reports" ON public.analysis_reports
  FOR ALL USING (auth.role() = 'authenticated');

-- Политики для project_documents
CREATE POLICY "Authenticated users can view documents" ON public.project_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage documents" ON public.project_documents
  FOR ALL USING (auth.role() = 'authenticated');

-- Политики для document_approval
CREATE POLICY "Authenticated users can view approvals" ON public.document_approval
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage approvals" ON public.document_approval
  FOR ALL USING (auth.role() = 'authenticated');

-- Политики для documentation_checks
CREATE POLICY "Authenticated users can view checks" ON public.documentation_checks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage checks" ON public.documentation_checks
  FOR ALL USING (auth.role() = 'authenticated');

-- Политики для audit_logs
CREATE POLICY "Authenticated users can view audit logs" ON public.audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ================================================
-- 4. НАСТРОЙКА STORAGE
-- ================================================

-- Создание bucket для файлов проекта
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

-- Политики для storage
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-files');

CREATE POLICY "Authenticated users can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-files');

CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files');

-- ================================================
-- 5. СОЗДАНИЕ ТРИГГЕРОВ
-- ================================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON public.contractors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qualification_objects_updated_at BEFORE UPDATE ON public.qualification_objects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_testing_periods_updated_at BEFORE UPDATE ON public.testing_periods
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_uploaded_files_updated_at BEFORE UPDATE ON public.uploaded_files
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_logger_data_summary_updated_at BEFORE UPDATE ON public.logger_data_summary
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analysis_reports_updated_at BEFORE UPDATE ON public.analysis_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_documents_updated_at BEFORE UPDATE ON public.project_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_approval_updated_at BEFORE UPDATE ON public.document_approval
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documentation_checks_updated_at BEFORE UPDATE ON public.documentation_checks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- 6. ВСТАВКА ТЕСТОВЫХ ДАННЫХ (опционально)
-- ================================================

-- Тестовый пользователь (замените на реальные данные)
-- INSERT INTO public.users (email, full_name, role, position)
-- VALUES ('admin@example.com', 'Администратор', 'admin', 'Системный администратор')
-- ON CONFLICT (email) DO NOTHING;

-- ================================================
-- ЗАВЕРШЕНО
-- ================================================

-- Проверка созданных таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Проверка созданных индексов
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY indexname;

-- Проверка RLS политик
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

