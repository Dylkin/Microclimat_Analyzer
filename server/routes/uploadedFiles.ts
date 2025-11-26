import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/uploaded-files - Получить файлы
router.get('/', async (req, res) => {
  try {
    const { user_id, project_id } = req.query;
    
    let query = 'SELECT * FROM uploaded_files WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (user_id) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(user_id);
    }

    // Фильтр по дате (последние 30 дней)
    if (!project_id) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query += ` AND upload_date >= $${paramIndex++}`;
      params.push(thirtyDaysAgo.toISOString());
    }

    query += ' ORDER BY file_order ASC, upload_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching uploaded files:', error);
    res.status(500).json({ error: 'Ошибка получения загруженных файлов' });
  }
});

// GET /api/uploaded-files/:id - Получить файл по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM uploaded_files WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching uploaded file:', error);
    res.status(500).json({ error: 'Ошибка получения файла' });
  }
});

// POST /api/uploaded-files - Сохранить файлы
router.post('/', async (req, res) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'files обязателен и должен быть массивом' });
    }

    const savedFiles = [];
    for (const file of files) {
      const result = await pool.query(`
        INSERT INTO uploaded_files (
          id, user_id, name, original_name, upload_date,
          parsing_status, error_message, record_count,
          period_start, period_end, zone_number, measurement_level,
          file_order, object_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          parsing_status = EXCLUDED.parsing_status,
          error_message = EXCLUDED.error_message,
          record_count = EXCLUDED.record_count,
          period_start = EXCLUDED.period_start,
          period_end = EXCLUDED.period_end,
          zone_number = EXCLUDED.zone_number,
          measurement_level = EXCLUDED.measurement_level,
          file_order = EXCLUDED.file_order,
          updated_at = NOW()
        RETURNING *
      `, [
        file.id,
        file.user_id,
        file.name,
        file.original_name || file.name,
        file.upload_date || new Date().toISOString(),
        file.parsing_status || 'pending',
        file.error_message || null,
        file.record_count || 0,
        file.period_start || null,
        file.period_end || null,
        file.zone_number || null,
        file.measurement_level || null,
        file.file_order || 0,
        file.object_type || null
      ]);

      savedFiles.push(result.rows[0]);
    }

    res.status(201).json(savedFiles);
  } catch (error: any) {
    console.error('Error saving uploaded files:', error);
    res.status(500).json({ error: `Ошибка сохранения файлов: ${error.message}` });
  }
});

// PATCH /api/uploaded-files/:id - Обновить метаданные файла
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const allowedFields = ['zone_number', 'measurement_level', 'file_order'];

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
      UPDATE uploaded_files
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating uploaded file:', error);
    res.status(500).json({ error: `Ошибка обновления файла: ${error.message}` });
  }
});

// DELETE /api/uploaded-files/:id - Удалить файл
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM uploaded_files WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting uploaded file:', error);
    res.status(500).json({ error: `Ошибка удаления файла: ${error.message}` });
  }
});

export default router;

