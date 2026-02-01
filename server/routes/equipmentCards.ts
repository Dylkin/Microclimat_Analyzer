import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/equipment-cards - Получить все карточки с поиском и фильтрацией по разделу
router.get('/', async (req, res) => {
  try {
    const searchTerm = req.query.search as string;
    const sectionId = req.query.sectionId as string;
    
    let query = `
      SELECT 
        ec.id,
        ec.section_id,
        ec.name,
        ec.manufacturer,
        ec.series,
        ec.channels_count,
        ec.dosing_volume,
        ec.volume_step,
        ec.dosing_accuracy,
        ec.reproducibility,
        ec.autoclavable,
        ec.specifications,
        ec.external_url,
        ec.created_at,
        ec.updated_at,
        es.name as section_name
      FROM equipment_cards ec
      JOIN equipment_sections es ON ec.section_id = es.id
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    const conditions: string[] = [];
    
    if (searchTerm) {
      conditions.push(`(ec.name ILIKE $${paramCount} OR ec.manufacturer ILIKE $${paramCount} OR ec.series ILIKE $${paramCount})`);
      params.push(`%${searchTerm}%`);
      paramCount++;
    }
    
    if (sectionId) {
      conditions.push(`ec.section_id = $${paramCount}`);
      params.push(sectionId);
      paramCount++;
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY ec.name ASC`;
    
    const result = await pool.query(query, params);
    
    const cards = result.rows.map((row: any) => ({
      id: row.id,
      sectionId: row.section_id,
      sectionName: row.section_name,
      name: row.name,
      manufacturer: row.manufacturer,
      series: row.series,
      channelsCount: row.channels_count ? parseInt(row.channels_count) : undefined,
      dosingVolume: row.dosing_volume,
      volumeStep: row.volume_step,
      dosingAccuracy: row.dosing_accuracy,
      reproducibility: row.reproducibility,
      autoclavable: row.autoclavable,
      specifications: row.specifications || {},
      externalUrl: row.external_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
    
    res.json({ cards });
  } catch (error) {
    console.error('Error fetching equipment cards:', error);
    res.status(500).json({ error: 'Ошибка получения карточек оборудования' });
  }
});

// GET /api/equipment-cards/:id - Получить карточку по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        ec.id,
        ec.section_id,
        ec.name,
        ec.manufacturer,
        ec.series,
        ec.channels_count,
        ec.dosing_volume,
        ec.volume_step,
        ec.dosing_accuracy,
        ec.reproducibility,
        ec.autoclavable,
        ec.specifications,
        ec.external_url,
        ec.created_at,
        ec.updated_at,
        es.name as section_name
      FROM equipment_cards ec
      JOIN equipment_sections es ON ec.section_id = es.id
      WHERE ec.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Карточка не найдена' });
    }
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      sectionId: row.section_id,
      sectionName: row.section_name,
      name: row.name,
      manufacturer: row.manufacturer,
      series: row.series,
      channelsCount: row.channels_count ? parseInt(row.channels_count) : undefined,
      dosingVolume: row.dosing_volume,
      volumeStep: row.volume_step,
      dosingAccuracy: row.dosing_accuracy,
      reproducibility: row.reproducibility,
      autoclavable: row.autoclavable,
      specifications: row.specifications || {},
      externalUrl: row.external_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error) {
    console.error('Error fetching equipment card:', error);
    res.status(500).json({ error: 'Ошибка получения карточки оборудования' });
  }
});

// POST /api/equipment-cards - Создать карточку
router.post('/', async (req, res) => {
  try {
    const { sectionId, name, manufacturer, series, channelsCount, dosingVolume, volumeStep, dosingAccuracy, reproducibility, autoclavable, specifications, externalUrl } = req.body;
    
    if (!sectionId) {
      return res.status(400).json({ error: 'ID раздела обязателен' });
    }
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Наименование карточки обязательно' });
    }
    
    // Проверяем существование раздела
    const sectionCheck = await pool.query(`
      SELECT id FROM equipment_sections WHERE id = $1
    `, [sectionId]);
    
    if (sectionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Раздел не найден' });
    }
    
    const result = await pool.query(`
      INSERT INTO equipment_cards (
        section_id, name, manufacturer, series, 
        channels_count, dosing_volume, volume_step, dosing_accuracy, 
        reproducibility, autoclavable, specifications, external_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, section_id, name, manufacturer, series, 
                channels_count, dosing_volume, volume_step, dosing_accuracy, 
                reproducibility, autoclavable, specifications, external_url, created_at, updated_at
    `, [
      sectionId,
      name.trim(),
      manufacturer?.trim() || null,
      series?.trim() || null,
      channelsCount ? parseInt(channelsCount.toString()) : null,
      dosingVolume?.trim() || null,
      volumeStep?.trim() || null,
      dosingAccuracy?.trim() || null,
      reproducibility?.trim() || null,
      autoclavable === true || autoclavable === 'true' || autoclavable === '1' ? true : (autoclavable === false || autoclavable === 'false' || autoclavable === '0' ? false : null),
      specifications ? JSON.stringify(specifications) : '{}',
      externalUrl?.trim() || null
    ]);
    
    const row = result.rows[0];
    
    // Получаем название раздела
    const sectionResult = await pool.query(`
      SELECT name FROM equipment_sections WHERE id = $1
    `, [sectionId]);
    
    res.status(201).json({
      id: row.id,
      sectionId: row.section_id,
      sectionName: sectionResult.rows[0].name,
      name: row.name,
      manufacturer: row.manufacturer,
      series: row.series,
      channelsCount: row.channels_count ? parseInt(row.channels_count) : undefined,
      dosingVolume: row.dosing_volume,
      volumeStep: row.volume_step,
      dosingAccuracy: row.dosing_accuracy,
      reproducibility: row.reproducibility,
      autoclavable: row.autoclavable,
      specifications: row.specifications || {},
      externalUrl: row.external_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error creating equipment card:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Карточка с таким наименованием уже существует в данном разделе' });
    }
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ error: 'Указанный раздел не существует' });
    }
    res.status(500).json({ error: 'Ошибка создания карточки оборудования' });
  }
});

// PUT /api/equipment-cards/:id - Обновить карточку
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { sectionId, name, manufacturer, series, channelsCount, dosingVolume, volumeStep, dosingAccuracy, reproducibility, autoclavable, specifications, externalUrl } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Наименование карточки обязательно' });
    }
    
    // Если указан новый раздел, проверяем его существование
    if (sectionId) {
      const sectionCheck = await pool.query(`
        SELECT id FROM equipment_sections WHERE id = $1
      `, [sectionId]);
      
      if (sectionCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Раздел не найден' });
      }
    }
    
    const result = await pool.query(`
      UPDATE equipment_cards
      SET 
        section_id = COALESCE($1, section_id),
        name = $2,
        manufacturer = $3,
        series = $4,
        channels_count = $5,
        dosing_volume = $6,
        volume_step = $7,
        dosing_accuracy = $8,
        reproducibility = $9,
        autoclavable = $10,
        specifications = $11,
        external_url = $12,
        updated_at = NOW()
      WHERE id = $13
      RETURNING id, section_id, name, manufacturer, series, 
                channels_count, dosing_volume, volume_step, dosing_accuracy, 
                reproducibility, autoclavable, specifications, external_url, created_at, updated_at
    `, [
      sectionId || null,
      name.trim(),
      manufacturer?.trim() || null,
      series?.trim() || null,
      channelsCount !== undefined ? (channelsCount ? parseInt(channelsCount.toString()) : null) : null,
      dosingVolume?.trim() || null,
      volumeStep?.trim() || null,
      dosingAccuracy?.trim() || null,
      reproducibility?.trim() || null,
      autoclavable !== undefined ? (autoclavable === true || autoclavable === 'true' || autoclavable === '1' ? true : (autoclavable === false || autoclavable === 'false' || autoclavable === '0' ? false : null)) : null,
      specifications ? JSON.stringify(specifications) : '{}',
      externalUrl?.trim() || null,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Карточка не найдена' });
    }
    
    const row = result.rows[0];
    
    // Получаем название раздела
    const sectionResult = await pool.query(`
      SELECT name FROM equipment_sections WHERE id = $1
    `, [row.section_id]);
    
    res.json({
      id: row.id,
      sectionId: row.section_id,
      sectionName: sectionResult.rows[0].name,
      name: row.name,
      manufacturer: row.manufacturer,
      series: row.series,
      channelsCount: row.channels_count ? parseInt(row.channels_count) : undefined,
      dosingVolume: row.dosing_volume,
      volumeStep: row.volume_step,
      dosingAccuracy: row.dosing_accuracy,
      reproducibility: row.reproducibility,
      autoclavable: row.autoclavable,
      specifications: row.specifications || {},
      externalUrl: row.external_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error updating equipment card:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Карточка с таким наименованием уже существует в данном разделе' });
    }
    res.status(500).json({ error: 'Ошибка обновления карточки оборудования' });
  }
});

// DELETE /api/equipment-cards/:id - Удалить карточку
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM equipment_cards
      WHERE id = $1
      RETURNING id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Карточка не найдена' });
    }
    
    res.json({ message: 'Карточка успешно удалена' });
  } catch (error) {
    console.error('Error deleting equipment card:', error);
    res.status(500).json({ error: 'Ошибка удаления карточки оборудования' });
  }
});

export default router;

