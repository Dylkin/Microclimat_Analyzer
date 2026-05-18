import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

const currentCalendarYear = () => new Date().getFullYear();

const parseYear = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const year = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  return year;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeCells = (raw: unknown): Record<string, Record<string, string>> | null => {
  if (!isPlainObject(raw)) return null;

  const cells: Record<string, Record<string, string>> = {};

  for (const [rowKey, rowValue] of Object.entries(raw)) {
    if (!isPlainObject(rowValue)) continue;
    const row: Record<string, string> = {};
    for (const [column, cellValue] of Object.entries(rowValue)) {
      if (cellValue == null) continue;
      row[column] = String(cellValue);
    }
    cells[rowKey] = row;
  }

  return cells;
};

// GET /api/finance/expenses?year=2026
router.get('/expenses', async (req, res) => {
  try {
    const year = parseYear(req.query.year) ?? currentCalendarYear();

    const result = await pool.query(
      `SELECT year, cells, updated_at
       FROM finance_expense_yearly
       WHERE year = $1`,
      [year]
    );

    if (result.rows.length === 0) {
      res.json({ year, cells: null, updatedAt: null });
      return;
    }

    const row = result.rows[0];
    res.json({
      year: Number(row.year),
      cells: row.cells ?? {},
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('Error fetching finance expenses:', error);
    res.status(500).json({ error: 'Не удалось загрузить данные финансовой таблицы' });
  }
});

// PUT /api/finance/expenses
router.put('/expenses', async (req, res) => {
  try {
    const year = parseYear(req.body?.year) ?? currentCalendarYear();
    const cells = normalizeCells(req.body?.cells);

    if (!cells) {
      res.status(400).json({ error: 'Некорректный формат данных таблицы' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO finance_expense_yearly (year, cells, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (year)
       DO UPDATE SET cells = EXCLUDED.cells, updated_at = NOW()
       RETURNING year, cells, updated_at`,
      [year, JSON.stringify(cells)]
    );

    const row = result.rows[0];
    res.json({
      year: Number(row.year),
      cells: row.cells ?? {},
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('Error saving finance expenses:', error);
    res.status(500).json({ error: 'Не удалось сохранить данные финансовой таблицы' });
  }
});

export default router;
