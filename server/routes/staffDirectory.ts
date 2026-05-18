import express, { type Request } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../config/database.js';

const router = express.Router();

const decodeUserFullNameHeader = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith('B64:')) {
    try {
      return Buffer.from(s.slice(4), 'base64').toString('utf8');
    } catch {
      return s;
    }
  }
  return s;
};

const getSalaryChangeActor = (req: Request) => {
  const rawId = req.headers['x-user-id'];
  const rawName = req.headers['x-user-fullname'];
  const userId = typeof rawId === 'string' && rawId.trim() ? rawId.trim() : null;
  const fullName = decodeUserFullNameHeader(rawName);
  return { userId, fullName };
};

const salariesDiffer = (a: number, b: number) => Math.round(a * 100) !== Math.round(b * 100);

const insertSalaryHistoryRow = async (
  client: PoolClient,
  positionId: string,
  oldSalary: number | null,
  newSalary: number,
  actor: ReturnType<typeof getSalaryChangeActor>
) => {
  await client.query(
    `INSERT INTO staff_position_salary_history (position_id, old_salary, new_salary, changed_by_user_id, changed_by_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [positionId, oldSalary, newSalary, actor.userId, actor.fullName]
  );
};

const mapSalaryHistoryRow = (row: any) => ({
  id: row.id,
  positionId: row.position_id,
  departmentId: row.department_id,
  departmentName: row.department_name,
  positionName: row.position_name,
  oldSalary: row.old_salary == null ? null : Number(row.old_salary),
  newSalary: Number(row.new_salary),
  changedByUserId: row.changed_by_user_id,
  changedByName: row.changed_by_name,
  createdAt: row.created_at
});

const formatPgDate = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value.length >= 10 ? value.slice(0, 10) : value;
  if (value instanceof Date) {
    // pg DATE can arrive as local-midnight Date object; UTC getters shift it to previous day in +TZ locales
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const firstDayOfNextMonthDateString = (): string => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
};

const parseSalaryEffectiveFrom = (value: unknown): string | null => {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [yy, mm, dd] = s.split('-').map(Number);
  const d = new Date(yy, mm - 1, dd);
  if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return s;
};

const mapPosition = (row: any) => ({
  id: row.id,
  departmentId: row.department_id,
  name: row.name,
  salary: Number(row.salary),
  salaryEffectiveFrom: formatPgDate(row.salary_effective_from),
  isDefault: row.is_default,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapDepartment = (row: any, positions: any[]) => ({
  id: row.id,
  name: row.name,
  isDefault: row.is_default,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  positions
});

const getPayrollTotals = async () => {
  const totalResult = await pool.query(
    'SELECT COALESCE(SUM(salary), 0) AS total FROM staff_positions'
  );

  const byDepartmentResult = await pool.query(`
    SELECT d.id AS department_id, d.name AS department_name, COALESCE(SUM(p.salary), 0) AS total
    FROM staff_departments d
    LEFT JOIN staff_positions p ON p.department_id = d.id
    GROUP BY d.id, d.name
    ORDER BY d.name ASC
  `);

  return {
    total: Number(totalResult.rows[0]?.total ?? 0),
    byDepartment: byDepartmentResult.rows.map((row) => ({
      departmentId: row.department_id,
      departmentName: row.department_name,
      total: Number(row.total)
    }))
  };
};

router.get('/', async (_req, res) => {
  try {
    const departmentsResult = await pool.query(
      'SELECT id, name, is_default, created_at, updated_at FROM staff_departments ORDER BY name ASC'
    );
    const positionsResult = await pool.query(
      'SELECT id, department_id, name, salary, salary_effective_from, is_default, created_at, updated_at FROM staff_positions ORDER BY name ASC'
    );

    const positionsByDepartment = new Map<string, any[]>();
    for (const positionRow of positionsResult.rows) {
      const mapped = mapPosition(positionRow);
      const bucket = positionsByDepartment.get(mapped.departmentId) || [];
      bucket.push(mapped);
      positionsByDepartment.set(mapped.departmentId, bucket);
    }

    const departments = departmentsResult.rows.map((row) =>
      mapDepartment(row, positionsByDepartment.get(row.id) || [])
    );
    const payroll = await getPayrollTotals();

    res.json({ departments, payroll });
  } catch (error) {
    console.error('Error fetching staff directory:', error);
    res.status(500).json({ error: 'Ошибка получения справочника подразделений и должностей' });
  }
});

router.post('/departments', async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'Название отдела обязательно' });

    const result = await pool.query(
      `INSERT INTO staff_departments (name, is_default)
       VALUES ($1, FALSE)
       RETURNING id, name, is_default, created_at, updated_at`,
      [name]
    );

    res.status(201).json(mapDepartment(result.rows[0], []));
  } catch (error: any) {
    console.error('Error creating department:', error);
    if (error?.code === '23505') return res.status(409).json({ error: 'Отдел с таким названием уже существует' });
    res.status(500).json({ error: 'Ошибка создания отдела' });
  }
});

router.put('/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'Название отдела обязательно' });

    const result = await pool.query(
      `UPDATE staff_departments
       SET name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, is_default, created_at, updated_at`,
      [name, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Отдел не найден' });

    const positionsResult = await pool.query(
      'SELECT id, department_id, name, salary, salary_effective_from, is_default, created_at, updated_at FROM staff_positions WHERE department_id = $1 ORDER BY name ASC',
      [id]
    );
    const positions = positionsResult.rows.map(mapPosition);
    res.json(mapDepartment(result.rows[0], positions));
  } catch (error: any) {
    console.error('Error updating department:', error);
    if (error?.code === '23505') return res.status(409).json({ error: 'Отдел с таким названием уже существует' });
    res.status(500).json({ error: 'Ошибка обновления отдела' });
  }
});

router.delete('/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT is_default FROM staff_departments WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Отдел не найден' });
    if (check.rows[0].is_default) return res.status(403).json({ error: 'Базовый отдел нельзя удалить' });

    await pool.query('DELETE FROM staff_departments WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Ошибка удаления отдела' });
  }
});

router.post('/departments/:id/positions', async (req, res) => {
  const { id: departmentId } = req.params;
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const salary = Number(req.body?.salary);

  if (!name) return res.status(400).json({ error: 'Название должности обязательно' });
  if (!Number.isFinite(salary) || salary < 0) return res.status(400).json({ error: 'Оклад должен быть неотрицательным числом' });

  let effectiveFrom = parseSalaryEffectiveFrom(req.body?.salaryEffectiveFrom);
  if (effectiveFrom == null) effectiveFrom = firstDayOfNextMonthDateString();

  const departmentExists = await pool.query('SELECT id FROM staff_departments WHERE id = $1', [departmentId]);
  if (departmentExists.rows.length === 0) return res.status(404).json({ error: 'Отдел не найден' });

  const actor = getSalaryChangeActor(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO staff_positions (department_id, name, salary, salary_effective_from, is_default)
       VALUES ($1, $2, $3, $4::date, FALSE)
       RETURNING id, department_id, name, salary, salary_effective_from, is_default, created_at, updated_at`,
      [departmentId, name, salary, effectiveFrom]
    );
    const row = result.rows[0];
    await insertSalaryHistoryRow(client, row.id, null, Number(row.salary), actor);
    await client.query('COMMIT');
    res.status(201).json(mapPosition(row));
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating position:', error);
    if (error?.code === '23505') return res.status(409).json({ error: 'Должность с таким названием уже существует в выбранном отделе' });
    res.status(500).json({ error: 'Ошибка создания должности' });
  } finally {
    client.release();
  }
});

router.put('/positions/:id', async (req, res) => {
  const { id } = req.params;
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const salary = Number(req.body?.salary);
  if (!name) return res.status(400).json({ error: 'Название должности обязательно' });
  if (!Number.isFinite(salary) || salary < 0) return res.status(400).json({ error: 'Оклад должен быть неотрицательным числом' });

  const effectiveParsed = parseSalaryEffectiveFrom(req.body?.salaryEffectiveFrom);
  if (effectiveParsed == null) {
    return res.status(400).json({ error: 'Укажите корректную дату «Действует с»' });
  }

  const actor = getSalaryChangeActor(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const prev = await client.query('SELECT salary FROM staff_positions WHERE id = $1 FOR UPDATE', [id]);
    if (prev.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Должность не найдена' });
    }
    const oldSalary = Number(prev.rows[0].salary);

    const result = await client.query(
      `UPDATE staff_positions
       SET name = $1, salary = $2, salary_effective_from = $3::date, updated_at = NOW()
       WHERE id = $4
       RETURNING id, department_id, name, salary, salary_effective_from, is_default, created_at, updated_at`,
      [name, salary, effectiveParsed, id]
    );

    if (salariesDiffer(oldSalary, salary)) {
      await insertSalaryHistoryRow(client, id, oldSalary, salary, actor);
    }

    await client.query('COMMIT');
    const updatedRow = result.rows[0];
    const mappedOut = mapPosition(updatedRow);
    res.json(mappedOut);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating position:', error);
    if (error?.code === '23505') return res.status(409).json({ error: 'Должность с таким названием уже существует в отделе' });
    res.status(500).json({ error: 'Ошибка обновления должности' });
  } finally {
    client.release();
  }
});

router.delete('/positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT is_default FROM staff_positions WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Должность не найдена' });
    if (check.rows[0].is_default) return res.status(403).json({ error: 'Базовую должность нельзя удалить' });

    await pool.query('DELETE FROM staff_positions WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({ error: 'Ошибка удаления должности' });
  }
});

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

router.get('/salary-history', async (req, res) => {
  try {
    const raw = req.query.limit;
    const parsed = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
    const limit = Number.isFinite(parsed) ? Math.min(500, Math.max(1, parsed)) : 100;

    const rawPositionId = typeof req.query.positionId === 'string' ? req.query.positionId.trim() : '';
    if (rawPositionId && !isUuid(rawPositionId)) {
      return res.status(400).json({ error: 'Некорректный идентификатор должности' });
    }

    const baseSql = `
      SELECT h.id,
             h.position_id,
             h.old_salary,
             h.new_salary,
             h.changed_by_user_id,
             h.changed_by_name,
             h.created_at,
             p.name AS position_name,
             d.id AS department_id,
             d.name AS department_name
      FROM staff_position_salary_history h
      JOIN staff_positions p ON p.id = h.position_id
      JOIN staff_departments d ON d.id = p.department_id`;

    const result = rawPositionId
      ? await pool.query(
          `${baseSql}
       WHERE h.position_id = $1
       ORDER BY h.created_at DESC
       LIMIT $2`,
          [rawPositionId, limit]
        )
      : await pool.query(
          `${baseSql}
       ORDER BY h.created_at DESC
       LIMIT $1`,
          [limit]
        );

    res.json({ items: result.rows.map(mapSalaryHistoryRow) });
  } catch (error) {
    console.error('Error fetching salary history:', error);
    res.status(500).json({ error: 'Ошибка загрузки истории окладов' });
  }
});

router.get('/payroll', async (_req, res) => {
  try {
    const totals = await getPayrollTotals();
    res.json(totals);
  } catch (error) {
    console.error('Error fetching payroll totals:', error);
    res.status(500).json({ error: 'Ошибка расчета ФОТ' });
  }
});

router.get('/departments/:id/payroll', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT d.id AS department_id, d.name AS department_name, COALESCE(SUM(p.salary), 0) AS total
       FROM staff_departments d
       LEFT JOIN staff_positions p ON p.department_id = d.id
       WHERE d.id = $1
       GROUP BY d.id, d.name`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Отдел не найден' });
    res.json({
      departmentId: result.rows[0].department_id,
      departmentName: result.rows[0].department_name,
      total: Number(result.rows[0].total)
    });
  } catch (error) {
    console.error('Error fetching department payroll:', error);
    res.status(500).json({ error: 'Ошибка расчета ФОТ отдела' });
  }
});

export default router;
