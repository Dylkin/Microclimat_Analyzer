import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/projects - Получить все проекты
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, p.name, p.description, p.contractor_id, 
        p.contract_number, p.contract_date, p.status, 
        p.created_by, p.created_at, p.updated_at,
        c.name as contractor_name
      FROM projects p
      LEFT JOIN contractors c ON p.contractor_id = c.id
      ORDER BY p.created_at DESC
    `);
    
    const projects = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      contractorId: row.contractor_id,
      contractorName: row.contractor_name,
      contractNumber: row.contract_number,
      contractDate: row.contract_date ? new Date(row.contract_date) : undefined,
      status: row.status,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
    
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Ошибка получения проектов' });
  }
});

// GET /api/projects/:id - Получить проект по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const projectResult = await pool.query(`
      SELECT 
        p.id, p.name, p.description, p.contractor_id, 
        p.contract_number, p.contract_date, p.status, 
        p.created_by, p.created_at, p.updated_at,
        c.name as contractor_name
      FROM projects p
      LEFT JOIN contractors c ON p.contractor_id = c.id
      WHERE p.id = $1
    `, [id]);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    
    const projectRow = projectResult.rows[0];
    
    // Получаем связанные объекты квалификации
    const objectsResult = await pool.query(`
      SELECT qo.id, qo.name, qo.object_type, qo.conditioning_system
      FROM project_qualification_objects pqo
      JOIN qualification_objects qo ON pqo.qualification_object_id = qo.id
      WHERE pqo.project_id = $1
    `, [id]);
    
    // Получаем назначения этапов
    const stagesResult = await pool.query(`
      SELECT id, stage, assigned_user_id, assigned_at, completed_at, notes
      FROM project_stage_assignments
      WHERE project_id = $1
      ORDER BY assigned_at
    `, [id]);
    
    const project = {
      id: projectRow.id,
      name: projectRow.name,
      description: projectRow.description,
      contractorId: projectRow.contractor_id,
      contractorName: projectRow.contractor_name,
      contractNumber: projectRow.contract_number,
      contractDate: projectRow.contract_date ? new Date(projectRow.contract_date) : undefined,
      status: projectRow.status,
      createdBy: projectRow.created_by,
      createdAt: new Date(projectRow.created_at),
      updatedAt: new Date(projectRow.updated_at),
      qualificationObjects: objectsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        objectType: row.object_type,
        conditioningSystem: row.conditioning_system
      })),
      stageAssignments: stagesResult.rows.map(row => ({
        id: row.id,
        stage: row.stage,
        assignedUserId: row.assigned_user_id,
        assignedAt: new Date(row.assigned_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        notes: row.notes
      }))
    };
    
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Ошибка получения проекта' });
  }
});

// POST /api/projects - Создать проект
router.post('/', async (req, res) => {
  try {
    const { name, description, contractorId, contractNumber, contractDate, status, createdBy } = req.body;
    
    if (!name || !contractorId) {
      return res.status(400).json({ error: 'Название и подрядчик обязательны' });
    }
    
    const result = await pool.query(`
      INSERT INTO projects (name, description, contractor_id, contract_number, contract_date, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, description, contractor_id, contract_number, contract_date, status, created_by, created_at, updated_at
    `, [name, description || null, contractorId, contractNumber || null, contractDate || null, status || 'draft', createdBy || null]);
    
    const project = result.rows[0];
    res.status(201).json({
      id: project.id,
      name: project.name,
      description: project.description,
      contractorId: project.contractor_id,
      contractNumber: project.contract_number,
      contractDate: project.contract_date ? new Date(project.contract_date) : undefined,
      status: project.status,
      createdBy: project.created_by,
      createdAt: new Date(project.created_at),
      updatedAt: new Date(project.updated_at)
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Ошибка создания проекта' });
  }
});

// PUT /api/projects/:id - Обновить проект
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, contractorId, contractNumber, contractDate, status } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (contractorId !== undefined) {
      updates.push(`contractor_id = $${paramCount++}`);
      values.push(contractorId);
    }
    if (contractNumber !== undefined) {
      updates.push(`contract_number = $${paramCount++}`);
      values.push(contractNumber);
    }
    if (contractDate !== undefined) {
      updates.push(`contract_date = $${paramCount++}`);
      values.push(contractDate);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING id, name, description, contractor_id, contract_number, contract_date, status, created_by, created_at, updated_at`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    
    const project = result.rows[0];
    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      contractorId: project.contractor_id,
      contractNumber: project.contract_number,
      contractDate: project.contract_date ? new Date(project.contract_date) : undefined,
      status: project.status,
      createdBy: project.created_by,
      createdAt: new Date(project.created_at),
      updatedAt: new Date(project.updated_at)
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Ошибка обновления проекта' });
  }
});

// DELETE /api/projects/:id - Удалить проект
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Ошибка удаления проекта' });
  }
});

export default router;

