CREATE TABLE IF NOT EXISTS staff_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES staff_departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  salary NUMERIC(12,2) NOT NULL CHECK (salary >= 0),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT staff_positions_department_name_unique UNIQUE (department_id, name)
);

INSERT INTO staff_departments (name, is_default)
VALUES
  ('Администрация', TRUE),
  ('Отдел продаж', TRUE),
  ('Отдел валидации', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO staff_positions (department_id, name, salary, is_default)
SELECT d.id, seed.name, seed.salary, TRUE
FROM staff_departments d
JOIN (
  VALUES
    ('Администрация', 'Бухгалтер', 50000.00::NUMERIC),
    ('Администрация', 'Директор', 120000.00::NUMERIC),
    ('Отдел продаж', 'Руководитель', 80000.00::NUMERIC),
    ('Отдел продаж', 'Менеджер', 45000.00::NUMERIC),
    ('Отдел валидации', 'Руководитель', 85000.00::NUMERIC),
    ('Отдел валидации', 'Инженер', 60000.00::NUMERIC),
    ('Отдел валидации', 'Специалист', 55000.00::NUMERIC)
) AS seed(department_name, name, salary)
  ON seed.department_name = d.name
ON CONFLICT (department_id, name) DO NOTHING;
