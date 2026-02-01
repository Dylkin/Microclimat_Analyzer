-- Добавление типа "Термоконтейнер" для объектов квалификации

-- Обновляем ограничение на тип объекта квалификации (если таблица существует)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'qualification_objects'
  ) THEN
    ALTER TABLE public.qualification_objects
      DROP CONSTRAINT IF EXISTS qualification_objects_object_type_check;

    ALTER TABLE public.qualification_objects
      ADD CONSTRAINT qualification_objects_object_type_check
      CHECK (object_type IN ('cold_chamber', 'freezer', 'refrigerator', 'thermo_container', 'vehicle', 'room'));
  END IF;
END
$$;

-- Добавляем тип в справочник типов (если таблица существует)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'qualification_object_types'
  ) THEN
    INSERT INTO public.qualification_object_types (type_key, type_label, description)
    VALUES ('термоконтейнер', 'Термоконтейнер', 'Термоконтейнеры для перевозки или хранения продукции')
    ON CONFLICT (type_key) DO NOTHING;
  END IF;
END
$$;
