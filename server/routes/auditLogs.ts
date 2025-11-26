import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/audit-logs - Получить логи аудита с фильтрацией
router.get('/', async (req, res) => {
  try {
    const { user_id, action, entity_type, entity_id, start_date, end_date, limit, offset } = req.query;
    
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (user_id) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(user_id);
    }
    if (action) {
      query += ` AND action = $${paramIndex++}`;
      params.push(action);
    }
    if (entity_type) {
      query += ` AND entity_type = $${paramIndex++}`;
      params.push(entity_type);
    }
    if (entity_id) {
      query += ` AND entity_id = $${paramIndex++}`;
      params.push(entity_id);
    }
    if (start_date) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(end_date);
    }

    query += ' ORDER BY created_at DESC';

    if (limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(parseInt(limit as string));
    } else {
      query += ' LIMIT 100';
    }

    if (offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(parseInt(offset as string));
    }

    const result = await pool.query(query, params);
    
    const logs = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userRole: row.user_role,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityName: row.entity_name,
      details: row.changes || row.details,
      timestamp: new Date(row.created_at),
      ipAddress: row.ip_address,
      userAgent: row.user_agent
    }));

    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Ошибка получения логов аудита' });
  }
});

// POST /api/audit-logs - Создать запись аудита
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      userName,
      userRole,
      action,
      entityType,
      entityId,
      entityName,
      details,
      ipAddress,
      userAgent
    } = req.body;

    if (!userId || !action || !entityType) {
      return res.status(400).json({ error: 'userId, action и entityType обязательны' });
    }

    const result = await pool.query(`
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, changes,
        ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      userId,
      action,
      entityType,
      entityId || null,
      details ? JSON.stringify(details) : null,
      ipAddress || null,
      userAgent || null
    ]);

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      userId: row.user_id,
      userName: userName,
      userRole: userRole,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityName: entityName,
      details: row.changes,
      timestamp: new Date(row.created_at),
      ipAddress: row.ip_address,
      userAgent: row.user_agent
    });
  } catch (error: any) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: `Ошибка создания записи аудита: ${error.message}` });
  }
});

export default router;

