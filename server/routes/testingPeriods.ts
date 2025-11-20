import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM testing_periods ORDER BY start_date');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching testing periods:', error);
    res.status(500).json({ error: 'Ошибка получения периодов испытаний' });
  }
});

export default router;

