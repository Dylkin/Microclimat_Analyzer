-- История расчётов стоимости квалификации (страница «Сервис» → «Расчёт стоимости квалификации»)
CREATE TABLE IF NOT EXISTS public.qualification_cost_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  contractor_name TEXT,
  total_with_vat NUMERIC(15, 2),
  details JSONB,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qualification_cost_calculations_created_at_idx
  ON public.qualification_cost_calculations (created_at DESC);
