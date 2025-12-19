import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/equipment-sections - Получить все разделы с поиском
router.get('/', async (req, res) => {
  try {
    const searchTerm = req.query.search as string;
    
    // Проверяем наличие колонки technical_specs_ranges перед добавлением в SELECT
    const technicalSpecsRangesCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'equipment_sections'
      AND column_name = 'technical_specs_ranges'
    `);
    const hasTechnicalSpecsRanges = technicalSpecsRangesCheck.rows.length > 0;
    
    let selectColumns = `
      es.id,
      es.name,
      es.description,
      es.manufacturers,
      es.website,
      es.supplier_ids,
      es.channels_count,
      es.dosing_volume,
      es.volume_step,
      es.dosing_accuracy,
      es.reproducibility,
      es.autoclavable,
      es.in_registry_si,
      es.created_at,
      es.updated_at,
      COUNT(ec.id) as cards_count
    `;
    if (hasTechnicalSpecsRanges) {
      selectColumns = selectColumns.replace('es.in_registry_si,', 'es.in_registry_si, es.technical_specs_ranges,');
    }
    
    let query = `
      SELECT ${selectColumns}
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
    
    // Используем уже проверенную переменную hasTechnicalSpecsRanges
    let groupByColumns = 'es.id, es.name, es.description, es.manufacturers, es.website, es.supplier_ids, es.channels_count, es.dosing_volume, es.volume_step, es.dosing_accuracy, es.reproducibility, es.autoclavable, es.in_registry_si, es.created_at, es.updated_at';
    if (hasTechnicalSpecsRanges) {
      groupByColumns += ', es.technical_specs_ranges';
    }
    
    query += ` GROUP BY ${groupByColumns}`;
    query += ` ORDER BY es.name ASC`;
    
    const result = await pool.query(query, params);
    
    const sections = result.rows.map((row: any) => {
      // Безопасно обрабатываем technical_specs_ranges
      let technicalSpecsRanges = {};
      if (hasTechnicalSpecsRanges && row.technical_specs_ranges) {
        try {
          // Если это уже объект, используем как есть
          if (typeof row.technical_specs_ranges === 'object') {
            technicalSpecsRanges = row.technical_specs_ranges;
          } else if (typeof row.technical_specs_ranges === 'string') {
            // Если это строка, пытаемся распарсить JSON
            technicalSpecsRanges = JSON.parse(row.technical_specs_ranges);
          }
        } catch (e) {
          console.error('Error parsing technical_specs_ranges:', e);
          technicalSpecsRanges = {};
        }
      }
      
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        manufacturers: row.manufacturers && Array.isArray(row.manufacturers) ? row.manufacturers : [],
        website: row.website,
        supplierIds: row.supplier_ids && Array.isArray(row.supplier_ids) ? row.supplier_ids : [],
        channelsCount: row.channels_count,
        dosingVolume: row.dosing_volume,
        volumeStep: row.volume_step,
        dosingAccuracy: row.dosing_accuracy,
        reproducibility: row.reproducibility,
        autoclavable: row.autoclavable,
        inRegistrySI: row.in_registry_si || false,
        technicalSpecsRanges: technicalSpecsRanges,
        cardsCount: parseInt(row.cards_count) || 0,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    });
    
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
    
    // Проверяем наличие колонки technical_specs_ranges
    const technicalSpecsRangesCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'equipment_sections'
      AND column_name = 'technical_specs_ranges'
    `);
    const hasTechnicalSpecsRanges = technicalSpecsRangesCheck.rows.length > 0;
    
    let selectColumns = `
      es.id,
      es.name,
      es.description,
      es.manufacturers,
      es.website,
      es.supplier_ids,
      es.channels_count,
      es.dosing_volume,
      es.volume_step,
      es.dosing_accuracy,
      es.reproducibility,
      es.autoclavable,
      es.in_registry_si,
      es.created_at,
      es.updated_at,
      COUNT(ec.id) as cards_count
    `;
    if (hasTechnicalSpecsRanges) {
      selectColumns = selectColumns.replace('es.in_registry_si,', 'es.in_registry_si, es.technical_specs_ranges,');
    }
    
    let groupByColumns = 'es.id, es.name, es.description, es.manufacturers, es.website, es.supplier_ids, es.channels_count, es.dosing_volume, es.volume_step, es.dosing_accuracy, es.reproducibility, es.autoclavable, es.in_registry_si, es.created_at, es.updated_at';
    if (hasTechnicalSpecsRanges) {
      groupByColumns += ', es.technical_specs_ranges';
    }
    
    const result = await pool.query(`
      SELECT ${selectColumns}
      FROM equipment_sections es
      LEFT JOIN equipment_cards ec ON es.id = ec.section_id
      WHERE es.id = $1
      GROUP BY ${groupByColumns}
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Раздел не найден' });
    }
    
    const row = result.rows[0];
    
    // Безопасно обрабатываем technical_specs_ranges
    let technicalSpecsRanges = {};
    if (hasTechnicalSpecsRanges && row.technical_specs_ranges) {
      try {
        if (typeof row.technical_specs_ranges === 'object') {
          technicalSpecsRanges = row.technical_specs_ranges;
        } else if (typeof row.technical_specs_ranges === 'string') {
          technicalSpecsRanges = JSON.parse(row.technical_specs_ranges);
        }
      } catch (e) {
        console.error('Error parsing technical_specs_ranges:', e);
        technicalSpecsRanges = {};
      }
    }
    
    res.json({
      id: row.id,
      name: row.name,
      description: row.description,
      manufacturers: row.manufacturers && Array.isArray(row.manufacturers) ? row.manufacturers : [],
      website: row.website,
      supplierIds: row.supplier_ids && Array.isArray(row.supplier_ids) ? row.supplier_ids : [],
      channelsCount: row.channels_count,
      dosingVolume: row.dosing_volume,
      volumeStep: row.volume_step,
      dosingAccuracy: row.dosing_accuracy,
      reproducibility: row.reproducibility,
      autoclavable: row.autoclavable,
      inRegistrySI: row.in_registry_si || false,
      technicalSpecsRanges: technicalSpecsRanges,
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
    const { name, description, manufacturers, website, supplierIds, channelsCount, dosingVolume, volumeStep, dosingAccuracy, reproducibility, autoclavable, inRegistrySI, technicalSpecsRanges } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Наименование раздела обязательно' });
    }
    
    // Обрабатываем manufacturers и supplierIds как массивы
    const manufacturersArray = Array.isArray(manufacturers) ? manufacturers.filter(m => m && m.trim()) : [];
    const supplierIdsArray = Array.isArray(supplierIds) ? supplierIds.filter(id => id) : [];
    
    const result = await pool.query(`
      INSERT INTO equipment_sections (name, description, manufacturers, website, supplier_ids, channels_count, dosing_volume, volume_step, dosing_accuracy, reproducibility, autoclavable, in_registry_si, technical_specs_ranges)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, name, description, manufacturers, website, supplier_ids, channels_count, dosing_volume, volume_step, dosing_accuracy, reproducibility, autoclavable, in_registry_si, technical_specs_ranges, created_at, updated_at
    `, [
      name.trim(), 
      description?.trim() || null,
      manufacturersArray.length > 0 ? manufacturersArray : null,
      website?.trim() || null,
      supplierIdsArray.length > 0 ? supplierIdsArray : null,
      channelsCount || null,
      dosingVolume?.trim() || null,
      volumeStep?.trim() || null,
      dosingAccuracy?.trim() || null,
      reproducibility?.trim() || null,
      autoclavable !== undefined ? autoclavable : null,
      inRegistrySI || false,
      technicalSpecsRanges ? JSON.stringify(technicalSpecsRanges) : '{}'
    ]);
    
    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      name: row.name,
      description: row.description,
      manufacturers: row.manufacturers && Array.isArray(row.manufacturers) ? row.manufacturers : [],
      website: row.website,
      supplierIds: row.supplier_ids && Array.isArray(row.supplier_ids) ? row.supplier_ids : [],
      channelsCount: row.channels_count,
      dosingVolume: row.dosing_volume,
      volumeStep: row.volume_step,
      dosingAccuracy: row.dosing_accuracy,
      reproducibility: row.reproducibility,
      autoclavable: row.autoclavable,
      inRegistrySI: row.in_registry_si || false,
      technicalSpecsRanges: row.technical_specs_ranges || {},
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
    const { name, description, manufacturers, website, supplierIds, channelsCount, dosingVolume, volumeStep, dosingAccuracy, reproducibility, autoclavable, inRegistrySI, technicalSpecsRanges } = req.body;
    
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
    if (channelsCount !== undefined) {
      updates.push(`channels_count = $${paramCount}`);
      values.push(channelsCount || null);
      paramCount++;
    }
    if (dosingVolume !== undefined) {
      updates.push(`dosing_volume = $${paramCount}`);
      values.push(dosingVolume?.trim() || null);
      paramCount++;
    }
    if (volumeStep !== undefined) {
      updates.push(`volume_step = $${paramCount}`);
      values.push(volumeStep?.trim() || null);
      paramCount++;
    }
    if (dosingAccuracy !== undefined) {
      updates.push(`dosing_accuracy = $${paramCount}`);
      values.push(dosingAccuracy?.trim() || null);
      paramCount++;
    }
    if (reproducibility !== undefined) {
      updates.push(`reproducibility = $${paramCount}`);
      values.push(reproducibility?.trim() || null);
      paramCount++;
    }
    if (autoclavable !== undefined) {
      updates.push(`autoclavable = $${paramCount}`);
      values.push(autoclavable !== undefined ? autoclavable : null);
      paramCount++;
    }
    if (inRegistrySI !== undefined) {
      updates.push(`in_registry_si = $${paramCount}`);
      values.push(inRegistrySI || false);
      paramCount++;
    }
    if (technicalSpecsRanges !== undefined) {
      updates.push(`technical_specs_ranges = $${paramCount}`);
      values.push(technicalSpecsRanges ? JSON.stringify(technicalSpecsRanges) : '{}');
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
      RETURNING id, name, description, manufacturers, website, supplier_ids, channels_count, dosing_volume, volume_step, dosing_accuracy, reproducibility, autoclavable, in_registry_si, technical_specs_ranges, created_at, updated_at
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
      manufacturers: row.manufacturers && Array.isArray(row.manufacturers) ? row.manufacturers : [],
      website: row.website,
      supplierIds: row.supplier_ids && Array.isArray(row.supplier_ids) ? row.supplier_ids : [],
      channelsCount: row.channels_count,
      dosingVolume: row.dosing_volume,
      volumeStep: row.volume_step,
      dosingAccuracy: row.dosing_accuracy,
      reproducibility: row.reproducibility,
      autoclavable: row.autoclavable,
      inRegistrySI: row.in_registry_si || false,
      technicalSpecsRanges: row.technical_specs_ranges || {},
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

