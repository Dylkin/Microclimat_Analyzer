import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Ошибка получения логов аудита' });
  }
});

export default router;

