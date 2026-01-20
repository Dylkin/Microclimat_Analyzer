/*
  # Добавление зон объекта квалификации
  
  Выносим зоны в отдельную таблицу qualification_object_zones.
*/

CREATE TABLE IF NOT EXISTS public.qualification_object_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qualification_object_id UUID NOT NULL REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  volume NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qo_zones_object_id
ON public.qualification_object_zones(qualification_object_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'qualification_objects'
      AND column_name = 'zones'
  ) THEN
    EXECUTE $migrate$
      INSERT INTO public.qualification_object_zones (qualification_object_id, name, volume)
      SELECT
        qo.id,
        COALESCE(zone_elem->>'name', '') AS name,
        NULLIF(zone_elem->>'volume', '')::numeric
      FROM public.qualification_objects qo
      CROSS JOIN LATERAL jsonb_array_elements(qo.zones) AS zone_elem
      WHERE jsonb_typeof(qo.zones) = 'array'
    $migrate$;

    EXECUTE 'ALTER TABLE public.qualification_objects DROP COLUMN zones';
  END IF;
END $$;
