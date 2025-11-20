import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/equipment - Получить все оборудование с пагинацией
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const searchTerm = req.query.search as string;
    const sortOrder = (req.query.sortOrder as string) || 'asc';
    
    const offset = (page - 1) * limit;
    
    // Базовый запрос для получения оборудования с верификациями
    let query = `
      SELECT 
        me.id, me.type, me.name, me.serial_number, me.created_at, me.updated_at,
        json_agg(
          json_build_object(
            'id', ev.id,
            'equipmentId', ev.equipment_id,
            'verificationStartDate', ev.verification_start_date,
            'verificationEndDate', ev.verification_end_date,
            'verificationFileUrl', ev.verification_file_url,
            'verificationFileName', ev.verification_file_name,
            'createdAt', ev.created_at
          )
        ) FILTER (WHERE ev.id IS NOT NULL) as verifications
      FROM measurement_equipment me
      LEFT JOIN equipment_verifications ev ON me.id = ev.equipment_id
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
    // Добавляем поиск если указан
    if (searchTerm) {
      query += ` WHERE (me.name ILIKE $${paramCount} OR me.serial_number ILIKE $${paramCount})`;
      params.push(`%${searchTerm}%`);
      paramCount++;
    }
    
    query += ` GROUP BY me.id, me.type, me.name, me.serial_number, me.created_at, me.updated_at`;
    query += ` ORDER BY me.name ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    
    // Получаем общее количество для пагинации
    let countQuery = 'SELECT COUNT(*) as total FROM measurement_equipment me';
    const countParams: any[] = [];
    let countParamCount = 1;
    
    if (searchTerm) {
      countQuery += ` WHERE (me.name ILIKE $${countParamCount} OR me.serial_number ILIKE $${countParamCount})`;
      countParams.push(`%${searchTerm}%`);
    }
    
    const [equipmentResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    
    const equipment = equipmentResult.rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      serialNumber: row.serial_number,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      verifications: (row.verifications || []).map((v: any) => ({
        id: v.id,
        equipmentId: v.equipmentId,
        verificationStartDate: new Date(v.verificationStartDate),
        verificationEndDate: new Date(v.verificationEndDate),
        verificationFileUrl: v.verificationFileUrl || undefined,
        verificationFileName: v.verificationFileName || undefined,
        createdAt: new Date(v.createdAt)
      }))
    }));
    
    res.json({
      equipment,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Ошибка получения оборудования' });
  }
});

// GET /api/equipment/stats - Получить статистику оборудования (должен быть перед /:id)
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT type, COUNT(*) as count
      FROM measurement_equipment
      GROUP BY type
    `);
    
    const stats = {
      total: 0,
      byType: {
        '-': 0,
        'Testo 174T': 0,
        'Testo 174H': 0
      }
    };
    
    result.rows.forEach((row: any) => {
      stats.total += parseInt(row.count);
      if (row.type in stats.byType) {
        stats.byType[row.type as keyof typeof stats.byType] = parseInt(row.count);
      }
    });
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching equipment stats:', error);
    res.status(500).json({ error: 'Ошибка получения статистики оборудования' });
  }
});

// GET /api/equipment/:id - Получить оборудование по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        me.id, me.type, me.name, me.serial_number, me.created_at, me.updated_at,
        json_agg(
          json_build_object(
            'id', ev.id,
            'equipmentId', ev.equipment_id,
            'verificationStartDate', ev.verification_start_date,
            'verificationEndDate', ev.verification_end_date,
            'verificationFileUrl', ev.verification_file_url,
            'verificationFileName', ev.verification_file_name,
            'createdAt', ev.created_at
          )
        ) FILTER (WHERE ev.id IS NOT NULL) as verifications
      FROM measurement_equipment me
      LEFT JOIN equipment_verifications ev ON me.id = ev.equipment_id
      WHERE me.id = $1
      GROUP BY me.id, me.type, me.name, me.serial_number, me.created_at, me.updated_at
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Оборудование не найдено' });
    }
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      type: row.type,
      name: row.name,
      serialNumber: row.serial_number,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      verifications: (row.verifications || []).map((v: any) => ({
        id: v.id,
        equipmentId: v.equipmentId,
        verificationStartDate: new Date(v.verificationStartDate),
        verificationEndDate: new Date(v.verificationEndDate),
        verificationFileUrl: v.verificationFileUrl || undefined,
        verificationFileName: v.verificationFileName || undefined,
        createdAt: new Date(v.createdAt)
      }))
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Ошибка получения оборудования' });
  }
});

// POST /api/equipment - Создать оборудование
router.post('/', async (req, res) => {
  try {
    const { type, name, serialNumber } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Название и тип оборудования обязательны' });
    }
    
    const result = await pool.query(
      'INSERT INTO measurement_equipment (type, name, serial_number) VALUES ($1, $2, $3) RETURNING id, type, name, serial_number, created_at, updated_at',
      [type, name, serialNumber || null]
    );
    
    res.status(201).json({
      id: result.rows[0].id,
      type: result.rows[0].type,
      name: result.rows[0].name,
      serialNumber: result.rows[0].serial_number,
      createdAt: new Date(result.rows[0].created_at),
      updatedAt: new Date(result.rows[0].updated_at),
      verifications: []
    });
  } catch (error: any) {
    console.error('Error creating equipment:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Оборудование с таким серийным номером уже существует' });
    }
    res.status(500).json({ error: 'Ошибка создания оборудования' });
  }
});

// PUT /api/equipment/:id - Обновить оборудование
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, serialNumber } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (type !== undefined) {
      updates.push(`type = $${paramCount++}`);
      values.push(type);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (serialNumber !== undefined) {
      updates.push(`serial_number = $${paramCount++}`);
      values.push(serialNumber || null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE measurement_equipment SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, type, name, serial_number, created_at, updated_at`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Оборудование не найдено' });
    }
    
    // Получаем верификации
    const verificationsResult = await pool.query(
      'SELECT id, equipment_id, verification_start_date, verification_end_date, verification_file_url, verification_file_name, created_at FROM equipment_verifications WHERE equipment_id = $1 ORDER BY created_at',
      [id]
    );
    
    const equipment = result.rows[0];
    res.json({
      id: equipment.id,
      type: equipment.type,
      name: equipment.name,
      serialNumber: equipment.serial_number,
      createdAt: new Date(equipment.created_at),
      updatedAt: new Date(equipment.updated_at),
      verifications: verificationsResult.rows.map((v: any) => ({
        id: v.id,
        equipmentId: v.equipment_id,
        verificationStartDate: new Date(v.verification_start_date),
        verificationEndDate: new Date(v.verification_end_date),
        verificationFileUrl: v.verification_file_url || undefined,
        verificationFileName: v.verification_file_name || undefined,
        createdAt: new Date(v.created_at)
      }))
    });
  } catch (error: any) {
    console.error('Error updating equipment:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Оборудование с таким серийным номером уже существует' });
    }
    res.status(500).json({ error: 'Ошибка обновления оборудования' });
  }
});

// DELETE /api/equipment/:id - Удалить оборудование
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM measurement_equipment WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({ error: 'Ошибка удаления оборудования' });
  }
});

// POST /api/equipment/:id/verifications - Добавить верификацию
router.post('/:id/verifications', async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStartDate, verificationEndDate, verificationFileUrl, verificationFileName } = req.body;
    
    if (!verificationStartDate || !verificationEndDate) {
      return res.status(400).json({ error: 'Даты начала и окончания верификации обязательны' });
    }
    
    const result = await pool.query(
      `INSERT INTO equipment_verifications (equipment_id, verification_start_date, verification_end_date, verification_file_url, verification_file_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, equipment_id, verification_start_date, verification_end_date, verification_file_url, verification_file_name, created_at`,
      [id, verificationStartDate, verificationEndDate, verificationFileUrl || null, verificationFileName || null]
    );
    
    res.status(201).json({
      id: result.rows[0].id,
      equipmentId: result.rows[0].equipment_id,
      verificationStartDate: new Date(result.rows[0].verification_start_date),
      verificationEndDate: new Date(result.rows[0].verification_end_date),
      verificationFileUrl: result.rows[0].verification_file_url || undefined,
      verificationFileName: result.rows[0].verification_file_name || undefined,
      createdAt: new Date(result.rows[0].created_at)
    });
  } catch (error) {
    console.error('Error creating verification:', error);
    res.status(500).json({ error: 'Ошибка создания верификации' });
  }
});

// DELETE /api/equipment/:id/verifications/:verificationId - Удалить верификацию
router.delete('/:id/verifications/:verificationId', async (req, res) => {
  try {
    const { verificationId } = req.params;
    
    await pool.query('DELETE FROM equipment_verifications WHERE id = $1', [verificationId]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting verification:', error);
    res.status(500).json({ error: 'Ошибка удаления верификации' });
  }
});

export default router;

