import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM logger_data ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching logger data:', error);
    res.status(500).json({ error: 'Ошибка получения данных логгеров' });
  }
});

export default router;

