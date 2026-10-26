ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS loggers_count INTEGER,
ADD COLUMN IF NOT EXISTS protocol_print_copies INTEGER,
ADD COLUMN IF NOT EXISTS report_print_copies INTEGER,
ADD COLUMN IF NOT EXISTS travel_expenses NUMERIC(15, 2);
