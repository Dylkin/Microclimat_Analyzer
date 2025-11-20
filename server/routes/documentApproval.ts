import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM document_approvals ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching document approvals:', error);
    res.status(500).json({ error: 'Ошибка получения согласований документов' });
  }
});

export default router;

