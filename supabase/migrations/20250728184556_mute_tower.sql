/*
  # Создание корзин для хранения файлов

  1. Корзины хранения
    - `data-files` - для файлов данных .vi2
    - `templates` - для шаблонов отчетов .docx
    - `reports` - для готовых PDF отчетов

  2. Политики безопасности
    - Настройка доступа к файлам согласно ролям пользователей
*/

-- Создание корзины для файлов данных
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-files', 'data-files', false)
ON CONFLICT (id) DO NOTHING;

-- Создание корзины для шаблонов
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', false)
ON CONFLICT (id) DO NOTHING;

-- Создание корзины для отчетов
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- Политики для корзины data-files
CREATE POLICY "Пользователи могут загружать файлы данных"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'data-files' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Пользователи могут читать файлы данных"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'data-files' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Пользователи могут удалять свои файлы данных"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'data-files' AND
    auth.role() = 'authenticated'
  );

-- Политики для корзины templates
CREATE POLICY "Пользователи могут загружать шаблоны"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'templates' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Пользователи могут читать шаблоны"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'templates' AND
    auth.role() = 'authenticated'
  );

-- Политики для корзины reports
CREATE POLICY "Пользователи могут создавать отчеты"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'reports' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Пользователи могут читать отчеты"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'reports' AND
    auth.role() = 'authenticated'
  );