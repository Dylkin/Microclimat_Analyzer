import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/documentation-checks - Получить проверки
router.get('/', async (req, res) => {
  try {
    const { qualification_object_id, project_id, limit, offset } = req.query;
    
    let query = 'SELECT * FROM documentation_checks WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (qualification_object_id) {
      query += ` AND qualification_object_id = $${paramIndex++}`;
      params.push(qualification_object_id);
    }

    if (project_id) {
      query += ` AND project_id = $${paramIndex++}`;
      params.push(project_id);
    }

    query += ' ORDER BY checked_at DESC';

    if (limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(parseInt(limit as string));
    }

    if (offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(parseInt(offset as string));
    }

    const result = await pool.query(query, params);
    
    const checks = result.rows.map((row: any) => ({
      id: row.id,
      qualificationObjectId: row.qualification_object_id,
      projectId: row.project_id,
      items: row.items || [],
      checkedAt: new Date(row.checked_at),
      checkedBy: row.checked_by,
      checkedByName: row.checked_by_name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    res.json(checks);
  } catch (error) {
    console.error('Error fetching documentation checks:', error);
    res.status(500).json({ error: 'Ошибка получения проверок документации' });
  }
});

// GET /api/documentation-checks/latest - Получить последнюю проверку
router.get('/latest', async (req, res) => {
  try {
    const { qualification_object_id, project_id } = req.query;

    if (!qualification_object_id || !project_id) {
      return res.status(400).json({ error: 'qualification_object_id и project_id обязательны' });
    }

    const result = await pool.query(`
      SELECT * FROM documentation_checks
      WHERE qualification_object_id = $1 AND project_id = $2
      ORDER BY checked_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `, [qualification_object_id, project_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Проверка не найдена' });
    }

    const row = result.rows[0];
    
    // Парсим items, если это JSONB
    let items = [];
    if (row.items) {
      try {
        items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
      } catch (e) {
        console.warn('Ошибка парсинга items:', e);
        items = [];
      }
    }

    res.json({
      id: row.id,
      qualificationObjectId: row.qualification_object_id,
      projectId: row.project_id,
      items: items,
      checkedAt: row.checked_at ? new Date(row.checked_at) : new Date(row.created_at),
      checkedBy: row.checked_by,
      checkedByName: row.checked_by_name || null,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(row.created_at)
    });
  } catch (error: any) {
    console.error('Error fetching latest documentation check:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ 
      error: 'Ошибка получения проверки документации',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/documentation-checks - Создать проверку
router.post('/', async (req, res) => {
  try {
    const {
      qualificationObjectId,
      projectId,
      items,
      checkedBy,
      checkedByName
    } = req.body;

    if (!qualificationObjectId || !projectId || !items || !checkedBy) {
      return res.status(400).json({ error: 'qualificationObjectId, projectId, items и checkedBy обязательны' });
    }

    const result = await pool.query(`
      INSERT INTO documentation_checks (
        qualification_object_id, project_id, items, checked_by, checked_by_name
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      qualificationObjectId,
      projectId,
      JSON.stringify(items),
      checkedBy,
      checkedByName || 'Пользователь'
    ]);

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      qualificationObjectId: row.qualification_object_id,
      projectId: row.project_id,
      items: row.items || [],
      checkedAt: new Date(row.checked_at),
      checkedBy: row.checked_by,
      checkedByName: row.checked_by_name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error creating documentation check:', error);
    res.status(500).json({ error: `Ошибка создания проверки: ${error.message}` });
  }
});

// PUT /api/documentation-checks/:id - Обновить проверку
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.items) {
      updateFields.push(`items = $${paramIndex++}`);
      params.push(JSON.stringify(updates.items));
    }
    if (updates.checkedBy) {
      updateFields.push(`checked_by = $${paramIndex++}`);
      params.push(updates.checkedBy);
    }
    if (updates.checkedByName) {
      updateFields.push(`checked_by_name = $${paramIndex++}`);
      params.push(updates.checkedByName);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Нет валидных данных для обновления' });
    }

    params.push(id);
    const updateQuery = `
      UPDATE documentation_checks
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Проверка не найдена' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      qualificationObjectId: row.qualification_object_id,
      projectId: row.project_id,
      items: row.items || [],
      checkedAt: new Date(row.checked_at),
      checkedBy: row.checked_by,
      checkedByName: row.checked_by_name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error updating documentation check:', error);
    res.status(500).json({ error: `Ошибка обновления проверки: ${error.message}` });
  }
});

export default router;

