-- Исправление ограничения CHECK для report_type в таблице analysis_reports
-- Добавляем поддержку типов 'template' и 'analysis' в дополнение к 'trial' и 'summary'

DO $$
BEGIN
  -- Удаляем старое ограничение CHECK, если оно существует
  ALTER TABLE IF EXISTS public.analysis_reports 
    DROP CONSTRAINT IF EXISTS analysis_reports_report_type_check;
  
  -- Создаем новое ограничение CHECK с поддержкой всех типов отчетов
  ALTER TABLE IF EXISTS public.analysis_reports
    ADD CONSTRAINT analysis_reports_report_type_check 
    CHECK (report_type IN ('trial', 'summary', 'template', 'analysis'));
  
  RAISE NOTICE 'Ограничение CHECK для report_type обновлено. Теперь поддерживаются типы: trial, summary, template, analysis';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Ошибка при обновлении ограничения CHECK: %', SQLERRM;
END $$;

