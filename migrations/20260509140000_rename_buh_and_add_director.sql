UPDATE staff_departments
SET name = 'Администрация',
    updated_at = NOW()
WHERE name = 'Бухгалтерия';

INSERT INTO staff_departments (name, is_default)
VALUES ('Администрация', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO staff_positions (department_id, name, salary, is_default)
SELECT d.id, 'Директор', 120000.00::NUMERIC, TRUE
FROM staff_departments d
WHERE d.name = 'Администрация'
ON CONFLICT (department_id, name) DO NOTHING;
