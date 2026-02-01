import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// POST /api/logger-data/save - Сохранить данные логгера
router.post('/save', async (req, res) => {
  try {
    const {
      projectId,
      qualificationObjectId,
      zoneNumber,
      measurementLevel,
      loggerName,
      parsedData
    } = req.body;

    if (!projectId || !qualificationObjectId || !parsedData) {
      return res.status(400).json({ error: 'projectId, qualificationObjectId и parsedData обязательны' });
    }

    // Сохраняем сводную информацию
    const summaryResult = await pool.query(`
      INSERT INTO logger_data_summary (
        project_id, qualification_object_id, zone_number, measurement_level,
        logger_name, file_name, device_type, device_model, serial_number,
        start_date, end_date, record_count, parsing_status, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      projectId,
      qualificationObjectId,
      zoneNumber || null,
      measurementLevel || null,
      loggerName || null,
      parsedData.fileName,
      parsedData.deviceMetadata?.deviceType || null,
      parsedData.deviceMetadata?.deviceModel || null,
      parsedData.deviceMetadata?.serialNumber || null,
      parsedData.startDate || null,
      parsedData.endDate || null,
      parsedData.recordCount || 0,
      // Если парсинг завершен успешно и есть измерения, статус должен быть 'completed'
      (parsedData.parsingStatus === 'completed' || (parsedData.measurements && parsedData.measurements.length > 0)) 
        ? 'completed' 
        : (parsedData.parsingStatus || 'processing'),
      parsedData.errorMessage || null
    ]);

    // Если парсинг завершился успешно, сохраняем детальные данные
    if (parsedData.parsingStatus === 'completed' && parsedData.measurements && parsedData.measurements.length > 0) {
      const batchSize = 1000;
      const totalBatches = Math.ceil(parsedData.measurements.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const startIndex = i * batchSize;
        const endIndex = Math.min(startIndex + batchSize, parsedData.measurements.length);
        const batch = parsedData.measurements.slice(startIndex, endIndex);

        const params: any[] = [];
        const placeholders: string[] = [];

        batch.forEach((m: any, idx: number) => {
          const paramIndex = idx * 12;
          placeholders.push(
            `($${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12})`
          );
          
      // Явно приводим типы для корректной работы с PostgreSQL
      params.push(
        projectId as string,
        qualificationObjectId as string,
        zoneNumber !== undefined && zoneNumber !== null ? Number(zoneNumber) : null,
        measurementLevel !== undefined && measurementLevel !== null ? Number(measurementLevel) : null,
        loggerName || null,
        parsedData.fileName || null,
        parsedData.deviceMetadata?.deviceType !== undefined ? Number(parsedData.deviceMetadata.deviceType) : null,
        parsedData.deviceMetadata?.deviceModel || null,
        parsedData.deviceMetadata?.serialNumber || null,
        m.timestamp ? new Date(m.timestamp) : null,
        m.temperature !== undefined && m.temperature !== null ? Number(m.temperature) : null,
        m.humidity !== undefined && m.humidity !== null ? Number(m.humidity) : null
      );
        });

        const values = placeholders.join(', ');

        await pool.query(`
          INSERT INTO logger_data_records (
            project_id, qualification_object_id, zone_number, measurement_level,
            logger_name, file_name, device_type, device_model, serial_number,
            timestamp, temperature, humidity
          )
          VALUES ${values}
        `, params);
      }
    }

    res.status(201).json({
      success: true,
      recordCount: parsedData.recordCount || 0
    });
  } catch (error: any) {
    console.error('Error saving logger data:', error);
    res.status(500).json({ 
      success: false,
      error: `Ошибка сохранения данных логгера: ${error.message}` 
    });
  }
});

// GET /api/logger-data - Получить данные логгера
router.get('/', async (req, res) => {
  try {
    const { project_id, qualification_object_id, zone_number, measurement_level } = req.query;
    
    let query = 'SELECT * FROM logger_data_records WHERE 1=1';
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

    if (zone_number !== undefined) {
      // Обрабатываем zone_number = 0 и zone_number = null одинаково (зона "Внешний датчик")
      const normalizedZoneNumber = zone_number === null || zone_number === 'null' ? 0 : Number(zone_number);
      query += ` AND (zone_number = $${paramIndex} OR (zone_number IS NULL AND $${paramIndex} = 0))`;
      params.push(normalizedZoneNumber);
      paramIndex++;
    }

    if (measurement_level !== undefined) {
      query += ` AND measurement_level = $${paramIndex++}`;
      params.push(measurement_level);
    }

    query += ' ORDER BY timestamp ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching logger data:', error);
    res.status(500).json({ error: 'Ошибка получения данных логгеров' });
  }
});

// GET /api/logger-data/summary - Получить сводную информацию
router.get('/summary', async (req, res) => {
  try {
    const { project_id, qualification_object_id } = req.query;
    
    let query = 'SELECT * FROM logger_data_summary WHERE 1=1';
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
    
    // Преобразуем данные для фронтенда, нормализуя measurement_level
    const summaries = result.rows.map((row: any) => ({
      id: row.id,
      project_id: row.project_id,
      qualification_object_id: row.qualification_object_id,
      zone_number: row.zone_number,
      measurement_level: row.measurement_level !== null && row.measurement_level !== undefined 
        ? (typeof row.measurement_level === 'string' ? parseFloat(row.measurement_level) : Number(row.measurement_level))
        : null,
      logger_name: row.logger_name,
      file_name: row.file_name,
      device_type: row.device_type,
      device_model: row.device_model,
      serial_number: row.serial_number,
      start_date: row.start_date ? new Date(row.start_date).toISOString() : null,
      end_date: row.end_date ? new Date(row.end_date).toISOString() : null,
      record_count: row.record_count || 0,
      parsing_status: row.parsing_status || 'processing',
      error_message: row.error_message,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null
    }));
    
    res.json(summaries);
  } catch (error) {
    console.error('Error fetching logger data summary:', error);
    res.status(500).json({ error: 'Ошибка получения сводной информации' });
  }
});

// DELETE /api/logger-data - Удалить данные логгера
router.delete('/', async (req, res) => {
  try {
    const { project_id, qualification_object_id, file_name } = req.query;

    if (!project_id || !qualification_object_id || !file_name) {
      return res.status(400).json({ error: 'project_id, qualification_object_id и file_name обязательны' });
    }

    // Удаляем детальные записи
    await pool.query(`
      DELETE FROM logger_data_records
      WHERE project_id = $1 AND qualification_object_id = $2 AND file_name = $3
    `, [project_id, qualification_object_id, file_name]);

    // Удаляем сводную информацию
    await pool.query(`
      DELETE FROM logger_data_summary
      WHERE project_id = $1 AND qualification_object_id = $2 AND file_name = $3
    `, [project_id, qualification_object_id, file_name]);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting logger data:', error);
    res.status(500).json({ 
      success: false,
      error: `Ошибка удаления данных: ${error.message}` 
    });
  }
});

export default router;

