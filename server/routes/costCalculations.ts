import express from 'express';
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

const mapRow = (row: any) => ({
  id: row.id,
  projectId: row.project_id,
  contractorId: row.contractor_id,
  contractorName: row.contractor_name || row.contractor_name_actual || '—',
  totalWithVat: row.total_with_vat != null ? Number(row.total_with_vat) : null,
  details: row.details ?? null,
  createdBy: row.created_by,
  createdByName: row.created_by_name || row.user_full_name || '—',
  createdAt: row.created_at
});

router.get('/', async (req, res) => {
  try {
    const raw = req.query.limit;
    const parsed = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
    const limit = Number.isFinite(parsed) ? Math.min(500, Math.max(1, parsed)) : 200;

    const result = await pool.query(
      `SELECT c.id, c.project_id, c.contractor_id,
              COALESCE(c.contractor_name, ct.name) AS contractor_name,
              c.total_with_vat, c.details, c.created_by, c.created_by_name,
              u.full_name AS user_full_name, c.created_at
       FROM qualification_cost_calculations c
       LEFT JOIN contractors ct ON ct.id = c.contractor_id
       LEFT JOIN users u ON u.id = c.created_by
       ORDER BY c.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ items: result.rows.map(mapRow) });
  } catch (error) {
    console.error('Error fetching cost calculations:', error);
    res.status(500).json({ error: 'Ошибка загрузки расчётов стоимости' });
  }
});

router.post('/', async (req, res) => {
  try {
    const projectId = typeof req.body?.projectId === 'string' && req.body.projectId.trim() ? req.body.projectId.trim() : null;
    const contractorId = typeof req.body?.contractorId === 'string' && req.body.contractorId.trim() ? req.body.contractorId.trim() : null;
    const totalWithVat = Number(req.body?.totalWithVat);
    const details = req.body?.details ?? null;

    if (contractorId == null) return res.status(400).json({ error: 'Контрагент обязателен' });
    if (!Number.isFinite(totalWithVat) || totalWithVat < 0) {
      return res.status(400).json({ error: 'Стоимость с НДС должна быть неотрицательным числом' });
    }

    const rawUserId = req.headers['x-user-id'];
    const createdBy = typeof rawUserId === 'string' && rawUserId.trim() ? rawUserId.trim() : null;
    let createdByName = decodeUserFullNameHeader(req.headers['x-user-fullname']);

    const contractorResult = await pool.query('SELECT name FROM contractors WHERE id = $1', [contractorId]);
    const contractorName = contractorResult.rows[0]?.name ?? null;

    if (createdBy && !createdByName) {
      const userResult = await pool.query('SELECT full_name FROM users WHERE id = $1', [createdBy]);
      createdByName = userResult.rows[0]?.full_name ?? null;
    }

    const result = await pool.query(
      `INSERT INTO qualification_cost_calculations (project_id, contractor_id, contractor_name, total_with_vat, details, created_by, created_by_name)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       RETURNING id, project_id, contractor_id, contractor_name, total_with_vat, details, created_by, created_by_name, created_at`,
      [projectId, contractorId, contractorName, totalWithVat, details ? JSON.stringify(details) : null, createdBy, createdByName]
    );

    res.status(201).json(mapRow(result.rows[0]));
  } catch (error) {
    console.error('Error saving cost calculation:', error);
    res.status(500).json({ error: 'Ошибка сохранения расчёта стоимости' });
  }
});

export default router;
