import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/qualification-objects - Получить все объекты квалификации
router.get('/', async (req, res) => {
  try {
    const { contractor_id } = req.query;
    
    let query = `
      SELECT 
        qo.id, qo.project_id, qo.name, qo.object_type, qo.climate_system,
        qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
        qo.work_schedule, qo.created_at, qo.updated_at,
        p.contractor_id,
        c.name as contractor_name
      FROM qualification_objects qo
      LEFT JOIN projects p ON qo.project_id = p.id
      LEFT JOIN contractors c ON p.contractor_id = c.id
    `;
    
    const params: any[] = [];
    if (contractor_id) {
      query += ' WHERE p.contractor_id = $1';
      params.push(contractor_id);
    }
    
    query += ' ORDER BY qo.created_at DESC';
    
    const result = await pool.query(query, params);
    
    const objects = result.rows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      objectType: row.object_type,
      climateSystem: row.climate_system,
      temperatureLimits: row.temperature_limits || { min: null, max: null },
      humidityLimits: row.humidity_limits || { min: null, max: null },
      measurementZones: row.measurement_zones || 0,
      workSchedule: row.work_schedule || [],
      contractorId: row.contractor_id || undefined,
      contractor: row.contractor_name ? { name: row.contractor_name } : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
    
    res.json(objects);
  } catch (error) {
    console.error('Error fetching qualification objects:', error);
    res.status(500).json({ error: 'Ошибка получения объектов квалификации' });
  }
});

// GET /api/qualification-objects/:id - Получить объект квалификации по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        qo.id, qo.project_id, qo.name, qo.object_type, qo.climate_system,
        qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
        qo.work_schedule, qo.created_at, qo.updated_at,
        p.contractor_id,
        c.name as contractor_name
      FROM qualification_objects qo
      LEFT JOIN projects p ON qo.project_id = p.id
      LEFT JOIN contractors c ON p.contractor_id = c.id
      WHERE qo.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Объект квалификации не найден' });
    }
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      objectType: row.object_type,
      climateSystem: row.climate_system,
      temperatureLimits: row.temperature_limits || { min: null, max: null },
      humidityLimits: row.humidity_limits || { min: null, max: null },
      measurementZones: row.measurement_zones || 0,
      workSchedule: row.work_schedule || [],
      contractorId: row.contractor_id || undefined,
      contractor: row.contractor_name ? { name: row.contractor_name } : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error) {
    console.error('Error fetching qualification object:', error);
    res.status(500).json({ error: 'Ошибка получения объекта квалификации' });
  }
});

export default router;

