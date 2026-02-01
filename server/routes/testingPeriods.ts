import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/testing-periods - Получить все периоды испытаний
router.get('/', async (req, res) => {
  try {
    const { qualification_object_id, project_id } = req.query;
    
    let query = 'SELECT * FROM testing_periods WHERE 1=1';
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

    query += ' ORDER BY start_date';

    const result = await pool.query(query, params);
    
    const periods = result.rows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      qualificationObjectId: row.qualification_object_id,
      periodNumber: row.period_number,
      startDate: row.start_date ? new Date(row.start_date) : null,
      endDate: row.end_date ? new Date(row.end_date) : null,
      status: row.status,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    res.json(periods);
  } catch (error) {
    console.error('Error fetching testing periods:', error);
    res.status(500).json({ error: 'Ошибка получения периодов испытаний' });
  }
});

// GET /api/testing-periods/by-object/:objectId - Получить периоды для объекта квалификации
router.get('/by-object/:objectId', async (req, res) => {
  try {
    const { objectId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM testing_periods WHERE qualification_object_id = $1 ORDER BY start_date',
      [objectId]
    );

    const periods = result.rows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      qualificationObjectId: row.qualification_object_id,
      periodNumber: row.period_number,
      startDate: row.start_date ? new Date(row.start_date) : null,
      endDate: row.end_date ? new Date(row.end_date) : null,
      status: row.status,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    res.json(periods);
  } catch (error) {
    console.error('Error fetching testing periods by object:', error);
    res.status(500).json({ error: 'Ошибка получения периодов испытаний' });
  }
});

// GET /api/testing-periods/:id - Получить период по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM testing_periods WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Период испытаний не найден' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      projectId: row.project_id,
      qualificationObjectId: row.qualification_object_id,
      periodNumber: row.period_number,
      startDate: row.start_date ? new Date(row.start_date) : null,
      endDate: row.end_date ? new Date(row.end_date) : null,
      status: row.status,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error) {
    console.error('Error fetching testing period:', error);
    res.status(500).json({ error: 'Ошибка получения периода испытаний' });
  }
});

// POST /api/testing-periods - Создать период испытаний
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      qualificationObjectId,
      periodNumber,
      startDate,
      endDate,
      status,
      notes
    } = req.body;

    if (!qualificationObjectId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Объект квалификации, даты начала и окончания обязательны' });
    }

    const result = await pool.query(`
      INSERT INTO testing_periods (
        project_id, qualification_object_id, period_number,
        start_date, end_date, status, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      projectId || null,
      qualificationObjectId,
      periodNumber || 1,
      startDate,
      endDate,
      status || 'planned',
      notes || null
    ]);

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      projectId: row.project_id,
      qualificationObjectId: row.qualification_object_id,
      periodNumber: row.period_number,
      startDate: row.start_date ? new Date(row.start_date) : null,
      endDate: row.end_date ? new Date(row.end_date) : null,
      status: row.status,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error creating testing period:', error);
    res.status(500).json({ error: `Ошибка создания периода испытаний: ${error.message}` });
  }
});

// PUT /api/testing-periods/:id - Обновить период испытаний
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Проверяем существование
    const checkResult = await pool.query('SELECT id FROM testing_periods WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Период испытаний не найден' });
    }

    // Строим запрос обновления
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const allowedFields = ['project_id', 'qualification_object_id', 'period_number', 'start_date', 'end_date', 'status', 'notes'];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        updateFields.push(`${dbKey} = $${paramIndex++}`);
        params.push(value);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Нет валидных данных для обновления' });
    }

    params.push(id);
    const updateQuery = `
      UPDATE testing_periods
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, params);
    const row = result.rows[0];

    res.json({
      id: row.id,
      projectId: row.project_id,
      qualificationObjectId: row.qualification_object_id,
      periodNumber: row.period_number,
      startDate: row.start_date ? new Date(row.start_date) : null,
      endDate: row.end_date ? new Date(row.end_date) : null,
      status: row.status,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error updating testing period:', error);
    res.status(500).json({ error: `Ошибка обновления периода испытаний: ${error.message}` });
  }
});

// DELETE /api/testing-periods/:id - Удалить период испытаний
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM testing_periods WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Период испытаний не найден' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting testing period:', error);
    res.status(500).json({ error: `Ошибка удаления периода испытаний: ${error.message}` });
  }
});

export default router;

