/*
  # Project qualification object data

  Создает таблицу для хранения проектных данных объекта квалификации
  и заполняет её на основе существующих связей.
*/

CREATE TABLE IF NOT EXISTS public.project_qualification_object_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  qualification_object_id UUID NOT NULL REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
  storage_zones JSONB DEFAULT '[]'::jsonb,
  climate_system TEXT,
  temperature_limits JSONB DEFAULT '{"min": null, "max": null}',
  humidity_limits JSONB DEFAULT '{"min": null, "max": null}',
  measurement_zones JSONB DEFAULT '[]'::jsonb,
  work_schedule JSONB DEFAULT '[]',
  plan_file_url TEXT,
  plan_file_name TEXT,
  test_data_file_url TEXT,
  test_data_file_name TEXT,
  address TEXT,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  geocoded_at TIMESTAMP WITH TIME ZONE,
  area NUMERIC(10,2),
  vin TEXT,
  registration_number TEXT,
  body_volume NUMERIC(10,2),
  inventory_number TEXT,
  chamber_volume NUMERIC(10,2),
  serial_number TEXT,
  manufacturer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, qualification_object_id)
);

CREATE INDEX IF NOT EXISTS idx_project_qo_data_project_id
ON public.project_qualification_object_data(project_id);

CREATE INDEX IF NOT EXISTS idx_project_qo_data_object_id
ON public.project_qualification_object_data(qualification_object_id);

-- Если есть прямые связи через qualification_objects.project_id, переносим их в таблицу связей
INSERT INTO public.project_qualification_objects (project_id, qualification_object_id)
SELECT qo.project_id, qo.id
FROM public.qualification_objects qo
WHERE qo.project_id IS NOT NULL
ON CONFLICT (project_id, qualification_object_id) DO NOTHING;

-- Создаем инстансы проектных данных на основе текущих данных объектов
INSERT INTO public.project_qualification_object_data (
  project_id,
  qualification_object_id,
  storage_zones,
  climate_system,
  temperature_limits,
  humidity_limits,
  measurement_zones,
  work_schedule,
  plan_file_url,
  plan_file_name,
  test_data_file_url,
  test_data_file_name,
  address,
  latitude,
  longitude,
  geocoded_at,
  area,
  vin,
  registration_number,
  body_volume,
  inventory_number,
  chamber_volume,
  serial_number,
  manufacturer
)
SELECT
  pqo.project_id,
  pqo.qualification_object_id,
  qo.storage_zones,
  qo.climate_system,
  qo.temperature_limits,
  qo.humidity_limits,
  qo.measurement_zones,
  qo.work_schedule,
  qo.plan_file_url,
  qo.plan_file_name,
  qo.test_data_file_url,
  qo.test_data_file_name,
  qo.address,
  qo.latitude,
  qo.longitude,
  qo.geocoded_at,
  qo.area,
  qo.vin,
  qo.registration_number,
  qo.body_volume,
  qo.inventory_number,
  qo.chamber_volume,
  qo.serial_number,
  qo.manufacturer
FROM public.project_qualification_objects pqo
JOIN public.qualification_objects qo ON qo.id = pqo.qualification_object_id
ON CONFLICT (project_id, qualification_object_id) DO NOTHING;

-- Обновление updated_at через общий триггер (если функция уже создана)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'update_project_qualification_object_data_updated_at'
    ) THEN
      CREATE TRIGGER update_project_qualification_object_data_updated_at
        BEFORE UPDATE ON public.project_qualification_object_data
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END $$;
/*
  # Project qualification object data

  Создает таблицу для хранения проектных данных объекта квалификации
  и заполняет её на основе существующих связей.
*/

CREATE TABLE IF NOT EXISTS public.project_qualification_object_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  qualification_object_id UUID NOT NULL REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
  storage_zones JSONB DEFAULT '[]'::jsonb,
  climate_system TEXT,
  temperature_limits JSONB DEFAULT '{"min": null, "max": null}',
  humidity_limits JSONB DEFAULT '{"min": null, "max": null}',
  measurement_zones JSONB DEFAULT '[]'::jsonb,
  work_schedule JSONB DEFAULT '[]',
  plan_file_url TEXT,
  plan_file_name TEXT,
  test_data_file_url TEXT,
  test_data_file_name TEXT,
  address TEXT,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  geocoded_at TIMESTAMP WITH TIME ZONE,
  area NUMERIC(10,2),
  vin TEXT,
  registration_number TEXT,
  body_volume NUMERIC(10,2),
  inventory_number TEXT,
  chamber_volume NUMERIC(10,2),
  serial_number TEXT,
  manufacturer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, qualification_object_id)
);

CREATE INDEX IF NOT EXISTS idx_project_qo_data_project_id
ON public.project_qualification_object_data(project_id);

CREATE INDEX IF NOT EXISTS idx_project_qo_data_object_id
ON public.project_qualification_object_data(qualification_object_id);

-- Если есть прямые связи через qualification_objects.project_id, переносим их в таблицу связей
INSERT INTO public.project_qualification_objects (project_id, qualification_object_id)
SELECT qo.project_id, qo.id
FROM public.qualification_objects qo
WHERE qo.project_id IS NOT NULL
ON CONFLICT (project_id, qualification_object_id) DO NOTHING;

-- Создаем инстансы проектных данных на основе текущих данных объектов
INSERT INTO public.project_qualification_object_data (
  project_id,
  qualification_object_id,
  storage_zones,
  climate_system,
  temperature_limits,
  humidity_limits,
  measurement_zones,
  work_schedule,
  plan_file_url,
  plan_file_name,
  test_data_file_url,
  test_data_file_name,
  address,
  latitude,
  longitude,
  geocoded_at,
  area,
  vin,
  registration_number,
  body_volume,
  inventory_number,
  chamber_volume,
  serial_number,
  manufacturer
)
SELECT
  pqo.project_id,
  pqo.qualification_object_id,
  qo.storage_zones,
  qo.climate_system,
  qo.temperature_limits,
  qo.humidity_limits,
  qo.measurement_zones,
  qo.work_schedule,
  qo.plan_file_url,
  qo.plan_file_name,
  qo.test_data_file_url,
  qo.test_data_file_name,
  qo.address,
  qo.latitude,
  qo.longitude,
  qo.geocoded_at,
  qo.area,
  qo.vin,
  qo.registration_number,
  qo.body_volume,
  qo.inventory_number,
  qo.chamber_volume,
  qo.serial_number,
  qo.manufacturer
FROM public.project_qualification_objects pqo
JOIN public.qualification_objects qo ON qo.id = pqo.qualification_object_id
ON CONFLICT (project_id, qualification_object_id) DO NOTHING;

-- Обновление updated_at через общий триггер (если функция уже создана)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'update_project_qualification_object_data_updated_at'
    ) THEN
      CREATE TRIGGER update_project_qualification_object_data_updated_at
        BEFORE UPDATE ON public.project_qualification_object_data
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END $$;
