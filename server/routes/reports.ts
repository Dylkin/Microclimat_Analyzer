import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/reports - Получить все отчеты
router.get('/', async (req, res) => {
  try {
    const { project_id, qualification_object_id } = req.query;
    
    let query = 'SELECT * FROM analysis_reports WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (project_id) {
      query += ` AND project_id = $${paramIndex++}`;
      params.push(project_id);
    }

    if (qualification_object_id) {
      query += ` AND qualification_object_id = $${paramIndex++}`;
      params.push(qualification_object_id);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    
    const reports = result.rows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      qualificationObjectId: row.qualification_object_id,
      reportName: row.report_name,
      reportType: row.report_type,
      reportUrl: row.report_url,
      reportData: row.report_data,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Ошибка получения отчетов' });
  }
});

// GET /api/reports/:id - Получить отчет по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM analysis_reports WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Отчет не найден' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      projectId: row.project_id,
      qualificationObjectId: row.qualification_object_id,
      reportName: row.report_name,
      reportType: row.report_type,
      reportUrl: row.report_url,
      reportData: row.report_data,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Ошибка получения отчета' });
  }
});

// POST /api/reports - Создать отчет
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      qualificationObjectId,
      reportName,
      reportType,
      reportUrl,
      reportFilename,
      reportData,
      createdBy
    } = req.body;

    if (!projectId || !qualificationObjectId || !reportName) {
      return res.status(400).json({ error: 'projectId, qualificationObjectId и reportName обязательны' });
    }

    const result = await pool.query(`
      INSERT INTO analysis_reports (
        project_id, qualification_object_id, report_name,
        report_type, report_url, report_data, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      projectId,
      qualificationObjectId,
      reportName,
      reportType || 'trial',
      reportUrl || null,
      reportData ? JSON.stringify(reportData) : null,
      createdBy || null
    ]);

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      projectId: row.project_id,
      qualificationObjectId: row.qualification_object_id,
      reportName: row.report_name,
      reportType: row.report_type,
      reportUrl: row.report_url,
      reportFilename: reportFilename,
      reportData: row.report_data,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: `Ошибка создания отчета: ${error.message}` });
  }
});

// PUT /api/reports/:id - Обновить отчет
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const checkResult = await pool.query('SELECT id FROM analysis_reports WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Отчет не найден' });
    }

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const allowedFields = ['report_name', 'report_type', 'report_url', 'report_data'];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        updateFields.push(`${dbKey} = $${paramIndex++}`);
        if (dbKey === 'report_data') {
          params.push(JSON.stringify(value));
        } else {
          params.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Нет валидных данных для обновления' });
    }

    params.push(id);
    const updateQuery = `
      UPDATE analysis_reports
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
      reportName: row.report_name,
      reportType: row.report_type,
      reportUrl: row.report_url,
      reportData: row.report_data,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: `Ошибка обновления отчета: ${error.message}` });
  }
});

// DELETE /api/reports/:id - Удалить отчет
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM analysis_reports WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Отчет не найден' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: `Ошибка удаления отчета: ${error.message}` });
  }
});

export default router;

