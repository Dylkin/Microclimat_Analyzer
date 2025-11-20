-- Создание представления qualification_protocols_with_documents
-- для отображения протоколов квалификации с документами

-- Проверяем, существует ли уже представление
DO $$
BEGIN
    -- Удаляем представление, если оно существует
    DROP VIEW IF EXISTS qualification_protocols_with_documents CASCADE;
    
    -- Создаем новое представление
    CREATE VIEW qualification_protocols_with_documents AS
    SELECT 
        qp.id,
        qp.project_id,
        qp.qualification_object_id,
        qp.object_type,
        qp.object_name,
        qp.protocol_document_id,
        qp.status,
        qp.approved_by,
        qp.approved_at,
        qp.rejection_reason,
        qp.created_at,
        qp.updated_at,
        -- Данные документа
        pd.id as document_id,
        pd.file_name,
        pd.file_size,
        pd.file_url,
        pd.mime_type,
        pd.uploaded_by,
        pd.uploaded_at
    FROM qualification_protocols qp
    LEFT JOIN project_documents pd ON qp.protocol_document_id = pd.id
    WHERE pd.document_type = 'qualification_protocol';
    
    -- Добавляем комментарий к представлению
    COMMENT ON VIEW qualification_protocols_with_documents IS 'Представление протоколов квалификации с данными документов';
    
    RAISE NOTICE 'Представление qualification_protocols_with_documents успешно создано';
END $$;

-- Проверяем результат
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'qualification_protocols_with_documents';



















