/*
  # Remove INN and KPP fields from clients table

  1. Changes
    - Remove `inn` column from `clients` table
    - Remove `kpp` column from `clients` table

  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'inn'
  ) THEN
    ALTER TABLE clients DROP COLUMN inn;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'kpp'
  ) THEN
    ALTER TABLE clients DROP COLUMN kpp;
  END IF;
END $$;