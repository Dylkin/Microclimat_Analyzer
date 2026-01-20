import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/qualification-work-schedule - Получить расписание
router.get('/', async (req, res) => {
  try {
    const { qualification_object_id, project_id } = req.query;
    if (!qualification_object_id) {
      return res.status(400).json({ error: 'qualification_object_id обязателен' });
    }

    if (!project_id) {
      return res.json([]);
    }

    const projectMeta = await pool.query(
      'SELECT created_at FROM projects WHERE id = $1',
      [project_id]
    );
    const scheduleMeta = await pool.query(
      'SELECT MIN(created_at) as min_created_at, COUNT(*) as count FROM qualification_work_schedule WHERE qualification_object_id = $1 AND project_id = $2',
      [qualification_object_id, project_id]
    );

    const projectQuery = `
      SELECT * FROM qualification_work_schedule
      WHERE qualification_object_id = $1 AND project_id = $2
      ORDER BY created_at ASC
    `;

    let result = await pool.query(projectQuery, [qualification_object_id, project_id]);



    if (result.rows.length === 0) {
      const legacyQuery = `
        SELECT * FROM qualification_work_schedule
        WHERE qualification_object_id = $1 AND project_id IS NULL
      `;
      const legacyResult = await pool.query(legacyQuery, [qualification_object_id]);

      if (legacyResult.rows.length > 0) {
        await pool.query(
          `UPDATE qualification_work_schedule
           SET project_id = $1
           WHERE qualification_object_id = $2 AND project_id IS NULL`,
          [project_id, qualification_object_id]
        );
      }

      const refreshed = await pool.query(projectQuery, [qualification_object_id, project_id]);
      result = refreshed;
    }
    
    const schedules = result.rows.map((row: any) => ({
      id: row.id,
      qualificationObjectId: row.qualification_object_id,
      projectId: row.project_id,
      stageName: row.stage_name,
      stageDescription: row.stage_description,
      startDate: row.start_date,
      endDate: row.end_date,
      isCompleted: row.is_completed || false,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      completedBy: row.completed_by,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
      cancelledBy: row.cancelled_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    res.json(schedules);
  } catch (error) {
    console.error('Error fetching qualification work schedule:', error);
    res.status(500).json({ error: 'Ошибка получения расписания квалификационных работ' });
  }
});

// POST /api/qualification-work-schedule - Сохранить расписание
router.post('/', async (req, res) => {
  try {
    const { qualificationObjectId, projectId, stages } = req.body;


    if (!qualificationObjectId || !stages || !Array.isArray(stages)) {
      return res.status(400).json({ error: 'qualificationObjectId и stages обязательны' });
    }
    if (!projectId) {
      return res.status(400).json({ error: 'projectId обязателен для сохранения расписания' });
    }

    // Удаляем существующие записи
    await pool.query(
      'DELETE FROM qualification_work_schedule WHERE qualification_object_id = $1 AND project_id = $2',
      [qualificationObjectId, projectId]
    );

    // Вставляем новые записи
    const insertedStages = [];
    for (const stage of stages) {
      // Обрабатываем даты: пустые строки преобразуем в null
      const startDate = stage.startDate || stage.start_date;
      const endDate = stage.endDate || stage.end_date;
      const processedStartDate = (startDate && startDate.trim() !== '') ? startDate : null;
      const processedEndDate = (endDate && endDate.trim() !== '') ? endDate : null;

      console.log('Сохранение этапа:', {
        stageName: stage.stageName || stage.stage_name,
        startDate: processedStartDate,
        endDate: processedEndDate,
        originalStartDate: startDate,
        originalEndDate: endDate
      });

      // Обрабатываем даты завершения и отмены
      const completedAt = stage.completedAt || stage.completed_at;
      const cancelledAt = stage.cancelledAt || stage.cancelled_at;
      const processedCompletedAt = (completedAt && completedAt.trim() !== '') ? completedAt : null;
      const processedCancelledAt = (cancelledAt && cancelledAt.trim() !== '') ? cancelledAt : null;
      
      // Обрабатываем ФИО (должны быть TEXT, а не UUID)
      const completedBy = stage.completedBy || stage.completed_by;
      const cancelledBy = stage.cancelledBy || stage.cancelled_by;
      const processedCompletedBy = (completedBy && completedBy.trim() !== '') ? completedBy.trim() : null;
      const processedCancelledBy = (cancelledBy && cancelledBy.trim() !== '') ? cancelledBy.trim() : null;

      const result = await pool.query(`
        INSERT INTO qualification_work_schedule (
          qualification_object_id, project_id, stage_name, stage_description,
          start_date, end_date, is_completed, completed_at, completed_by,
          cancelled_at, cancelled_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        qualificationObjectId,
        projectId,
        stage.stageName || stage.stage_name,
        stage.stageDescription || stage.stage_description || null,
        processedStartDate,
        processedEndDate,
        stage.isCompleted || stage.is_completed || false,
        processedCompletedAt,
        processedCompletedBy,
        processedCancelledAt,
        processedCancelledBy
      ]);

      const row = result.rows[0];
      insertedStages.push({
        id: row.id,
        qualificationObjectId: row.qualification_object_id,
        projectId: row.project_id,
        stageName: row.stage_name,
        stageDescription: row.stage_description,
        startDate: row.start_date,
        endDate: row.end_date,
        isCompleted: row.is_completed,
        completedAt: row.completed_at ? new Date(row.completed_at) : null,
        completedBy: row.completed_by,
        cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
        cancelledBy: row.cancelled_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      });
    }

    res.status(201).json(insertedStages);
  } catch (error: any) {
    console.error('Error saving qualification work schedule:', error);
    res.status(500).json({ error: `Ошибка сохранения расписания: ${error.message}` });
  }
});

export default router;

