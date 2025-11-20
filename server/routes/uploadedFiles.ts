import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM uploaded_files ORDER BY uploaded_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching uploaded files:', error);
    res.status(500).json({ error: 'Ошибка получения загруженных файлов' });
  }
});

export default router;

