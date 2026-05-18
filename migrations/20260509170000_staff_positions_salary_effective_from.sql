ALTER TABLE staff_positions
  ADD COLUMN IF NOT EXISTS salary_effective_from DATE;

UPDATE staff_positions
SET salary_effective_from = (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
WHERE salary_effective_from IS NULL;

ALTER TABLE staff_positions
  ALTER COLUMN salary_effective_from SET NOT NULL;
