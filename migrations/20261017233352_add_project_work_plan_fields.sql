ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS protocol_preparation_start_date DATE,
ADD COLUMN IF NOT EXISTS protocol_preparation_end_date DATE,
ADD COLUMN IF NOT EXISTS testing_start_date DATE,
ADD COLUMN IF NOT EXISTS testing_end_date DATE,
ADD COLUMN IF NOT EXISTS report_preparation_start_date DATE,
ADD COLUMN IF NOT EXISTS report_preparation_end_date DATE;
