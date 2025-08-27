/*
  # Добавить ограничения уникальности для объектов квалификации

  1. Изменения в таблице qualification_objects
    - Добавить уникальное ограничение для поля `vin` (только для непустых значений)
    - Добавить уникальное ограничение для поля `serial_number` (только для непустых значений)
  
  2. Безопасность
    - Используем частичные уникальные индексы для игнорирования NULL значений
    - Это позволяет иметь несколько записей с NULL, но гарантирует уникальность непустых значений
*/

-- Добавляем уникальный индекс для VIN номера (игнорируя NULL значения)
CREATE UNIQUE INDEX IF NOT EXISTS qualification_objects_vin_unique 
ON qualification_objects (vin) 
WHERE vin IS NOT NULL AND vin != '';

-- Добавляем уникальный индекс для серийного номера (игнорируя NULL значения)
CREATE UNIQUE INDEX IF NOT EXISTS qualification_objects_serial_number_unique 
ON qualification_objects (serial_number) 
WHERE serial_number IS NOT NULL AND serial_number != '';