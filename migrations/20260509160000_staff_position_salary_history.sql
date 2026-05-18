CREATE TABLE IF NOT EXISTS staff_position_salary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES staff_positions(id) ON DELETE CASCADE,
  old_salary NUMERIC(12,2),
  new_salary NUMERIC(12,2) NOT NULL,
  changed_by_user_id TEXT,
  changed_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_position_salary_history_created_at
  ON staff_position_salary_history (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_position_salary_history_position_id
  ON staff_position_salary_history (position_id);
