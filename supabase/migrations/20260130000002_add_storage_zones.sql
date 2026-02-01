-- Добавление списка "Зон хранения" для объектов квалификации

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'qualification_objects'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'qualification_objects'
        AND column_name = 'storage_zones'
    ) THEN
      ALTER TABLE public.qualification_objects
        ADD COLUMN storage_zones JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Миграция данных из storage_zone_name (если колонка существует и заполнена)
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'qualification_objects'
        AND column_name = 'storage_zone_name'
    ) THEN
      UPDATE public.qualification_objects
      SET storage_zones = jsonb_build_array(
        jsonb_build_object(
          'id', concat('storage-zone-', id::text),
          'name', storage_zone_name,
          'volume', NULL
        )
      )
      WHERE storage_zone_name IS NOT NULL
        AND storage_zone_name <> ''
        AND (storage_zones IS NULL OR storage_zones = '[]'::jsonb);
    END IF;
  END IF;
END
$$;
