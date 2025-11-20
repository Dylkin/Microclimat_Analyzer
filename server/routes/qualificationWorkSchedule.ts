import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM qualification_work_schedule ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching qualification work schedule:', error);
    res.status(500).json({ error: 'Ошибка получения расписания квалификационных работ' });
  }
});

export default router;

