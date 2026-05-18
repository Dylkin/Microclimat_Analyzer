-- Таблица годовой таблицы расходов (страница «Финансы»)
CREATE TABLE IF NOT EXISTS public.finance_expense_yearly (
  year INTEGER PRIMARY KEY CHECK (year >= 2000 AND year <= 2100),
  cells JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_expense_yearly_updated_at
  ON public.finance_expense_yearly (updated_at DESC);
