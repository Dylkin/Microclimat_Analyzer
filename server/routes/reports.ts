import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM analysis_reports ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Ошибка получения отчетов' });
  }
});

export default router;

