-- Тест работы с JSONB полем measurement_zones

-- Проверяем текущие данные
SELECT 
    id,
    name,
    type,
    measurement_zones,
    jsonb_typeof(measurement_zones) as zones_type,
    jsonb_array_length(measurement_zones) as zones_count
FROM qualification_objects 
WHERE measurement_zones IS NOT NULL 
AND measurement_zones != '[]'::jsonb
LIMIT 5;

-- Тестовое обновление с JSONB данными
-- Раскомментируйте для тестирования:

/*
UPDATE qualification_objects 
SET measurement_zones = '[
  {
    "id": "test-zone-1",
    "zoneNumber": 1,
    "measurementLevels": [
      {
        "id": "test-level-1",
        "level": 1.5,
        "equipmentId": "test-eq-1",
        "equipmentName": "Тестовый логгер"
      }
    ]
  }
]'::jsonb,
updated_at = NOW()
WHERE id = 'YOUR_OBJECT_ID_HERE'
RETURNING id, name, measurement_zones;
*/

-- Проверяем, что данные сохранились корректно
SELECT 
    id,
    name,
    measurement_zones,
    jsonb_pretty(measurement_zones) as formatted_zones
FROM qualification_objects 
WHERE id = 'YOUR_OBJECT_ID_HERE';























