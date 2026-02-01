import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/document-approval/comments/:documentId - Получить комментарии
router.get('/comments/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM document_comments WHERE document_id = $1 ORDER BY created_at ASC',
      [documentId]
    );

    const comments = result.rows.map((row: any) => ({
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      userName: row.user_name,
      comment: row.comment,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    }));

    res.json(comments);
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ 
      error: 'Ошибка получения комментариев',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/document-approval/comments - Добавить комментарий
router.post('/comments', async (req, res) => {
  try {
    const { documentId, userId, userName, comment } = req.body;

    if (!documentId || !userId || !comment) {
      return res.status(400).json({ error: 'documentId, userId и comment обязательны' });
    }

    const result = await pool.query(`
      INSERT INTO document_comments (document_id, user_id, user_name, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [documentId, userId, userName || 'Пользователь', comment.trim()]);

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      userName: row.user_name,
      comment: row.comment,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: `Ошибка создания комментария: ${error.message}` });
  }
});

// GET /api/document-approval/approvals/:documentId - Получить согласования
router.get('/approvals/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM document_approvals WHERE document_id = $1 ORDER BY created_at DESC',
      [documentId]
    );

    const approvals = result.rows.map((row: any) => ({
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      userName: row.user_name,
      status: row.status,
      comment: row.comment,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    }));

    res.json(approvals);
  } catch (error: any) {
    console.error('Error fetching approvals:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ 
      error: 'Ошибка получения согласований',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/document-approval/approve - Согласовать документ
router.post('/approve', async (req, res) => {
  try {
    const { documentId, userId, userName, comment } = req.body;

    if (!documentId || !userId) {
      return res.status(400).json({ error: 'documentId и userId обязательны' });
    }

    const result = await pool.query(`
      INSERT INTO document_approvals (document_id, user_id, user_name, status, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [documentId, userId, userName || 'Пользователь', 'approved', comment?.trim() || null]);

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      userName: row.user_name,
      status: row.status,
      comment: row.comment,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error approving document:', error);
    res.status(500).json({ error: `Ошибка согласования документа: ${error.message}` });
  }
});

// POST /api/document-approval/reject - Отклонить документ
router.post('/reject', async (req, res) => {
  try {
    const { documentId, userId, userName, comment } = req.body;

    if (!documentId || !userId || !comment) {
      return res.status(400).json({ error: 'documentId, userId и comment обязательны' });
    }

    const result = await pool.query(`
      INSERT INTO document_approvals (document_id, user_id, user_name, status, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [documentId, userId, userName || 'Пользователь', 'rejected', comment.trim()]);

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      userName: row.user_name,
      status: row.status,
      comment: row.comment,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error rejecting document:', error);
    res.status(500).json({ error: `Ошибка отклонения документа: ${error.message}` });
  }
});

export default router;

