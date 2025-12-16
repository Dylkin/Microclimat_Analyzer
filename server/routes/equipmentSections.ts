import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/equipment-sections - Получить все разделы с поиском
router.get('/', async (req, res) => {
  try {
    const searchTerm = req.query.search as string;
    
    let query = `
      SELECT 
        es.id,
        es.name,
        es.description,
        es.manufacturers,
        es.website,
        es.supplier_ids,
        es.created_at,
        es.updated_at,
        COUNT(ec.id) as cards_count
      FROM equipment_sections es
      LEFT JOIN equipment_cards ec ON es.id = ec.section_id
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
    if (searchTerm) {
      query += ` WHERE es.name ILIKE $${paramCount}`;
      params.push(`%${searchTerm}%`);
      paramCount++;
    }
    
    query += ` GROUP BY es.id, es.name, es.description, es.created_at, es.updated_at`;
    query += ` ORDER BY es.name ASC`;
    
    const result = await pool.query(query, params);
    
    const sections = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      manufacturers: row.manufacturers && Array.isArray(row.manufacturers) ? row.manufacturers : [],
      website: row.website,
      supplierIds: row.supplier_ids && Array.isArray(row.supplier_ids) ? row.supplier_ids : [],
      cardsCount: parseInt(row.cards_count) || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
    
    res.json({ sections });
  } catch (error) {
    console.error('Error fetching equipment sections:', error);
    res.status(500).json({ error: 'Ошибка получения разделов оборудования' });
  }
});

// GET /api/equipment-sections/:id - Получить раздел по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        es.id,
        es.name,
        es.description,
        es.manufacturers,
        es.website,
        es.supplier_ids,
        es.created_at,
        es.updated_at,
        COUNT(ec.id) as cards_count
      FROM equipment_sections es
      LEFT JOIN equipment_cards ec ON es.id = ec.section_id
      WHERE es.id = $1
      GROUP BY es.id, es.name, es.description, es.manufacturers, es.website, es.supplier_ids, es.created_at, es.updated_at
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Раздел не найден' });
    }
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      description: row.description,
      manufacturers: row.manufacturers && Array.isArray(row.manufacturers) ? row.manufacturers : [],
      website: row.website,
      supplierIds: row.supplier_ids && Array.isArray(row.supplier_ids) ? row.supplier_ids : [],
      cardsCount: parseInt(row.cards_count) || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error) {
    console.error('Error fetching equipment section:', error);
    res.status(500).json({ error: 'Ошибка получения раздела оборудования' });
  }
});

// POST /api/equipment-sections - Создать раздел
router.post('/', async (req, res) => {
  try {
    const { name, description, manufacturers, website, supplierIds } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Наименование раздела обязательно' });
    }
    
    // Обрабатываем manufacturers и supplierIds как массивы
    const manufacturersArray = Array.isArray(manufacturers) ? manufacturers.filter(m => m && m.trim()) : [];
    const supplierIdsArray = Array.isArray(supplierIds) ? supplierIds.filter(id => id) : [];
    
    const result = await pool.query(`
      INSERT INTO equipment_sections (name, description, manufacturers, website, supplier_ids)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, description, manufacturers, website, supplier_ids, created_at, updated_at
    `, [
      name.trim(), 
      description?.trim() || null,
      manufacturersArray.length > 0 ? manufacturersArray : null,
      website?.trim() || null,
      supplierIdsArray.length > 0 ? supplierIdsArray : null
    ]);
    
    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      name: row.name,
      description: row.description,
      manufacturers: row.manufacturers && Array.isArray(row.manufacturers) ? row.manufacturers : [],
      website: row.website,
      supplierIds: row.supplier_ids && Array.isArray(row.supplier_ids) ? row.supplier_ids : [],
      cardsCount: 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error creating equipment section:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Раздел с таким наименованием уже существует' });
    }
    res.status(500).json({ error: 'Ошибка создания раздела оборудования' });
  }
});

// PUT /api/equipment-sections/:id - Обновить раздел
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, manufacturers, website, supplierIds } = req.body;
    
    if (name !== undefined && (!name || name.trim() === '')) {
      return res.status(400).json({ error: 'Наименование раздела обязательно' });
    }
    
    // Обрабатываем manufacturers и supplierIds как массивы
    const manufacturersArray = Array.isArray(manufacturers) ? manufacturers.filter(m => m && m.trim()) : (manufacturers === null ? null : undefined);
    const supplierIdsArray = Array.isArray(supplierIds) ? supplierIds.filter(id => id) : (supplierIds === null ? null : undefined);
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name.trim());
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description?.trim() || null);
      paramCount++;
    }
    if (manufacturersArray !== undefined) {
      updates.push(`manufacturers = $${paramCount}`);
      values.push(manufacturersArray && manufacturersArray.length > 0 ? manufacturersArray : null);
      paramCount++;
    }
    if (website !== undefined) {
      updates.push(`website = $${paramCount}`);
      values.push(website?.trim() || null);
      paramCount++;
    }
    if (supplierIdsArray !== undefined) {
      updates.push(`supplier_ids = $${paramCount}`);
      values.push(supplierIdsArray && supplierIdsArray.length > 0 ? supplierIdsArray : null);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await pool.query(`
      UPDATE equipment_sections
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, description, manufacturers, website, supplier_ids, created_at, updated_at
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Раздел не найден' });
    }
    
    const row = result.rows[0];
    
    // Получаем количество карточек
    const countResult = await pool.query(`
      SELECT COUNT(*) as count FROM equipment_cards WHERE section_id = $1
    `, [id]);
    
    res.json({
      id: row.id,
      name: row.name,
      description: row.description,
      cardsCount: parseInt(countResult.rows[0].count) || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error updating equipment section:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Раздел с таким наименованием уже существует' });
    }
    res.status(500).json({ error: 'Ошибка обновления раздела оборудования' });
  }
});

// DELETE /api/equipment-sections/:id - Удалить раздел
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM equipment_sections
      WHERE id = $1
      RETURNING id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Раздел не найден' });
    }
    
    res.json({ message: 'Раздел успешно удален' });
  } catch (error) {
    console.error('Error deleting equipment section:', error);
    res.status(500).json({ error: 'Ошибка удаления раздела оборудования' });
  }
});

export default router;

