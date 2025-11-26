/*
  # Добавление 'commercial_offer' в enum document_type
  
  Добавляем значение 'commercial_offer' в enum document_type, если его еще нет.
*/

-- Добавляем 'commercial_offer' в enum, если его еще нет
DO $$ 
BEGIN
  -- Проверяем, существует ли уже значение
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'commercial_offer' 
    AND enumtypid = 'document_type'::regtype
  ) THEN
    ALTER TYPE document_type ADD VALUE 'commercial_offer';
  END IF;
END $$;


