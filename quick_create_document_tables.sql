-- Быстрое создание таблиц для комментариев и согласования документов
-- Выполните эти команды в Supabase SQL Editor

-- 1. Создание таблицы для комментариев к документам
CREATE TABLE IF NOT EXISTS document_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Создание таблицы для записей согласования документов
CREATE TABLE IF NOT EXISTS document_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'pending')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_document_id ON document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_status ON document_approvals(status);

-- 4. Включение RLS (Row Level Security)
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;

-- 5. Создание базовых политик безопасности
CREATE POLICY "Users can view all comments" ON document_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments" ON document_comments FOR INSERT WITH CHECK (true = 'authenticated');

CREATE POLICY "Users can view all approvals" ON document_approvals FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert approvals" ON document_approvals FOR INSERT WITH CHECK (true = 'authenticated');

-- 6. Проверка создания таблиц
SELECT 'Tables created successfully' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('document_comments', 'document_approvals');























