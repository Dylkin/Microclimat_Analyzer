-- Тип оборудования: EClerk-M-RHT (логгер температуры и влажности)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'equipment_type'
      AND e.enumlabel = 'EClerk-M-RHT'
  ) THEN
    ALTER TYPE equipment_type ADD VALUE 'EClerk-M-RHT';
  END IF;
END
$$;
