import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/qualification-objects - Получить все объекты квалификации
router.get('/', async (req, res) => {
  try {
    const { contractor_id } = req.query;
    
    let query = `
      SELECT 
        qo.id, qo.project_id, qo.contractor_id, qo.name, qo.storage_zones, qo.object_type, qo.climate_system,
        qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
        qo.work_schedule, qo.plan_file_url, qo.plan_file_name,
        qo.test_data_file_url, qo.test_data_file_name,
        qo.address, qo.latitude, qo.longitude, qo.area,
        qo.vin, qo.registration_number, qo.body_volume,
        qo.inventory_number, qo.chamber_volume, qo.serial_number, qo.manufacturer,
        qo.created_at, qo.updated_at,
        COALESCE(qo.contractor_id, p.contractor_id) as final_contractor_id,
        c.name as contractor_name
      FROM qualification_objects qo
      LEFT JOIN projects p ON qo.project_id = p.id
      LEFT JOIN contractors c ON COALESCE(qo.contractor_id, p.contractor_id) = c.id
    `;
    
    const params: any[] = [];
    if (contractor_id) {
      query += ' WHERE (qo.contractor_id = $1 OR p.contractor_id = $1)';
      params.push(contractor_id);
    }
    
    query += ' ORDER BY qo.created_at DESC';
    
    const result = await pool.query(query, params);
    
    const objects = result.rows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      contractorId: row.final_contractor_id || undefined,
      name: row.name,
      storageZones: row.storage_zones || [],
      objectType: row.object_type,
      climateSystem: row.climate_system,
      temperatureLimits: row.temperature_limits || { min: null, max: null },
      humidityLimits: row.humidity_limits || { min: null, max: null },
      measurementZones: row.measurement_zones || 0,
      workSchedule: row.work_schedule || [],
      planFileUrl: row.plan_file_url || undefined,
      planFileName: row.plan_file_name || undefined,
      testDataFileUrl: row.test_data_file_url || undefined,
      testDataFileName: row.test_data_file_name || undefined,
      address: row.address || undefined,
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined,
      area: row.area ? parseFloat(row.area) : undefined,
      vin: row.vin || undefined,
      registrationNumber: row.registration_number || undefined,
      bodyVolume: row.body_volume ? parseFloat(row.body_volume) : undefined,
      inventoryNumber: row.inventory_number || undefined,
      chamberVolume: row.chamber_volume ? parseFloat(row.chamber_volume) : undefined,
      serialNumber: row.serial_number || undefined,
      manufacturer: row.manufacturer || undefined,
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
        qo.id, qo.project_id, qo.contractor_id, qo.name, qo.storage_zones, qo.object_type, qo.climate_system,
        qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
        qo.work_schedule, qo.plan_file_url, qo.plan_file_name,
        qo.test_data_file_url, qo.test_data_file_name,
        qo.address, qo.latitude, qo.longitude, qo.area,
        qo.vin, qo.registration_number, qo.body_volume,
        qo.inventory_number, qo.chamber_volume, qo.serial_number, qo.manufacturer,
        qo.created_at, qo.updated_at,
        COALESCE(qo.contractor_id, p.contractor_id) as final_contractor_id,
        c.name as contractor_name
      FROM qualification_objects qo
      LEFT JOIN projects p ON qo.project_id = p.id
      LEFT JOIN contractors c ON COALESCE(qo.contractor_id, p.contractor_id) = c.id
      WHERE qo.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Объект квалификации не найден' });
    }
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      projectId: row.project_id,
      contractorId: row.final_contractor_id || undefined,
      name: row.name,
      storageZones: row.storage_zones || [],
      objectType: row.object_type,
      climateSystem: row.climate_system,
      temperatureLimits: row.temperature_limits || { min: null, max: null },
      humidityLimits: row.humidity_limits || { min: null, max: null },
      measurementZones: row.measurement_zones || 0,
      workSchedule: row.work_schedule || [],
      planFileUrl: row.plan_file_url || undefined,
      planFileName: row.plan_file_name || undefined,
      testDataFileUrl: row.test_data_file_url || undefined,
      testDataFileName: row.test_data_file_name || undefined,
      address: row.address || undefined,
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined,
      area: row.area ? parseFloat(row.area) : undefined,
      vin: row.vin || undefined,
      registrationNumber: row.registration_number || undefined,
      bodyVolume: row.body_volume ? parseFloat(row.body_volume) : undefined,
      inventoryNumber: row.inventory_number || undefined,
      chamberVolume: row.chamber_volume ? parseFloat(row.chamber_volume) : undefined,
      serialNumber: row.serial_number || undefined,
      manufacturer: row.manufacturer || undefined,
      contractor: row.contractor_name ? { name: row.contractor_name } : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error) {
    console.error('Error fetching qualification object:', error);
    res.status(500).json({ error: 'Ошибка получения объекта квалификации' });
  }
});

// POST /api/qualification-objects - Создать объект квалификации
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      name,
      objectType,
      climateSystem,
      temperatureLimits,
      humidityLimits,
      storageZones,
      measurementZones,
      workSchedule,
      ...otherFields
    } = req.body;

    if (!name || !objectType) {
      return res.status(400).json({ error: 'Имя и тип объекта обязательны' });
    }

    const {
      contractorId,
      address,
      latitude,
      longitude,
      area,
      vin,
      registrationNumber,
      bodyVolume,
      inventoryNumber,
      chamberVolume,
      serialNumber,
      manufacturer,
      ...restFields
    } = otherFields;

    // Формируем динамический запрос с учетом всех полей
    const insertFields = [
      'project_id', 'contractor_id', 'name', 'object_type', 'climate_system',
      'temperature_limits', 'humidity_limits', 'storage_zones', 'measurement_zones', 'work_schedule'
    ];
    const insertValues: any[] = [
      projectId || null,
      contractorId || null,
      name,
      objectType,
      climateSystem || null,
      temperatureLimits ? JSON.stringify(temperatureLimits) : null,
      humidityLimits ? JSON.stringify(humidityLimits) : null,
      storageZones ? (typeof storageZones === 'object' ? JSON.stringify(storageZones) : storageZones) : null,
      measurementZones ? (typeof measurementZones === 'object' ? JSON.stringify(measurementZones) : measurementZones) : null,
      workSchedule ? JSON.stringify(workSchedule) : null
    ];
    let paramIndex = insertValues.length + 1;

    // Добавляем дополнительные поля, если они переданы
    if (address !== undefined) {
      insertFields.push('address');
      insertValues.push(address || null);
      paramIndex++;
    }
    if (latitude !== undefined) {
      insertFields.push('latitude');
      insertValues.push(latitude || null);
      paramIndex++;
    }
    if (longitude !== undefined) {
      insertFields.push('longitude');
      insertValues.push(longitude || null);
      paramIndex++;
    }
    if (area !== undefined) {
      insertFields.push('area');
      insertValues.push(area || null);
      paramIndex++;
    }
    if (vin !== undefined) {
      insertFields.push('vin');
      insertValues.push(vin || null);
      paramIndex++;
    }
    if (registrationNumber !== undefined) {
      insertFields.push('registration_number');
      insertValues.push(registrationNumber || null);
      paramIndex++;
    }
    if (bodyVolume !== undefined) {
      insertFields.push('body_volume');
      insertValues.push(bodyVolume || null);
      paramIndex++;
    }
    if (inventoryNumber !== undefined) {
      insertFields.push('inventory_number');
      insertValues.push(inventoryNumber || null);
      paramIndex++;
    }
    if (chamberVolume !== undefined) {
      insertFields.push('chamber_volume');
      insertValues.push(chamberVolume || null);
      paramIndex++;
    }
    if (serialNumber !== undefined) {
      insertFields.push('serial_number');
      insertValues.push(serialNumber || null);
      paramIndex++;
    }
    if (manufacturer !== undefined) {
      insertFields.push('manufacturer');
      insertValues.push(manufacturer || null);
      paramIndex++;
    }

    const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');

    const result = await pool.query(`
      INSERT INTO qualification_objects (${insertFields.join(', ')})
      VALUES (${placeholders})
      RETURNING id, created_at, updated_at
    `, insertValues);

    const row = result.rows[0];
    
    // Получаем полную информацию с contractor
    const fullResult = await pool.query(`
      SELECT 
        qo.id, qo.project_id, qo.contractor_id, qo.name, qo.storage_zones, qo.object_type, qo.climate_system,
        qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
        qo.work_schedule, qo.plan_file_url, qo.plan_file_name,
        qo.test_data_file_url, qo.test_data_file_name,
        qo.address, qo.latitude, qo.longitude, qo.area,
        qo.vin, qo.registration_number, qo.body_volume,
        qo.inventory_number, qo.chamber_volume, qo.serial_number, qo.manufacturer,
        qo.created_at, qo.updated_at,
        COALESCE(qo.contractor_id, p.contractor_id) as final_contractor_id,
        c.name as contractor_name
      FROM qualification_objects qo
      LEFT JOIN projects p ON qo.project_id = p.id
      LEFT JOIN contractors c ON COALESCE(qo.contractor_id, p.contractor_id) = c.id
      WHERE qo.id = $1
    `, [row.id]);

    const fullRow = fullResult.rows[0];
    res.status(201).json({
      id: fullRow.id,
      projectId: fullRow.project_id,
      contractorId: fullRow.final_contractor_id,
      name: fullRow.name,
      storageZones: fullRow.storage_zones || [],
      objectType: fullRow.object_type,
      climateSystem: fullRow.climate_system,
      temperatureLimits: fullRow.temperature_limits || { min: null, max: null },
      humidityLimits: fullRow.humidity_limits || { min: null, max: null },
      measurementZones: fullRow.measurement_zones || [],
      workSchedule: fullRow.work_schedule || [],
      planFileUrl: fullRow.plan_file_url || undefined,
      planFileName: fullRow.plan_file_name || undefined,
      testDataFileUrl: fullRow.test_data_file_url || undefined,
      testDataFileName: fullRow.test_data_file_name || undefined,
      address: fullRow.address || undefined,
      latitude: fullRow.latitude ? parseFloat(fullRow.latitude) : undefined,
      longitude: fullRow.longitude ? parseFloat(fullRow.longitude) : undefined,
      area: fullRow.area ? parseFloat(fullRow.area) : undefined,
      vin: fullRow.vin || undefined,
      registrationNumber: fullRow.registration_number || undefined,
      bodyVolume: fullRow.body_volume ? parseFloat(fullRow.body_volume) : undefined,
      inventoryNumber: fullRow.inventory_number || undefined,
      chamberVolume: fullRow.chamber_volume ? parseFloat(fullRow.chamber_volume) : undefined,
      serialNumber: fullRow.serial_number || undefined,
      manufacturer: fullRow.manufacturer || undefined,
      contractor: fullRow.contractor_name ? { name: fullRow.contractor_name } : undefined,
      createdAt: new Date(fullRow.created_at),
      updatedAt: new Date(fullRow.updated_at)
    });
  } catch (error: any) {
    console.error('Error creating qualification object:', error);
    res.status(500).json({ error: `Ошибка создания объекта квалификации: ${error.message}` });
  }
});

// PUT /api/qualification-objects/:id - Обновить объект квалификации
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      projectId,
      name,
      objectType,
      climateSystem,
      temperatureLimits,
      humidityLimits,
      storageZones,
      measurementZones,
      workSchedule,
      ...otherFields
    } = req.body;

    // Проверяем существование объекта
    const checkResult = await pool.query('SELECT id FROM qualification_objects WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Объект квалификации не найден' });
    }

    // Строим запрос обновления динамически
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (projectId !== undefined) {
      updates.push(`project_id = $${paramIndex++}`);
      params.push(projectId);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (objectType !== undefined) {
      updates.push(`object_type = $${paramIndex++}`);
      params.push(objectType);
    }
    if (climateSystem !== undefined) {
      updates.push(`climate_system = $${paramIndex++}`);
      params.push(climateSystem);
    }
    if (temperatureLimits !== undefined) {
      updates.push(`temperature_limits = $${paramIndex++}`);
      params.push(JSON.stringify(temperatureLimits));
    }
    if (humidityLimits !== undefined) {
      updates.push(`humidity_limits = $${paramIndex++}`);
      params.push(JSON.stringify(humidityLimits));
    }
    if (storageZones !== undefined) {
      updates.push(`storage_zones = $${paramIndex++}`);
      params.push(typeof storageZones === 'object' ? JSON.stringify(storageZones) : storageZones);
    }
    if (measurementZones !== undefined) {
      updates.push(`measurement_zones = $${paramIndex++}`);
      params.push(typeof measurementZones === 'object' ? JSON.stringify(measurementZones) : measurementZones);
    }
    if (workSchedule !== undefined) {
      updates.push(`work_schedule = $${paramIndex++}`);
      params.push(JSON.stringify(workSchedule));
    }

    // Обрабатываем дополнительные поля из otherFields
    const {
      address,
      latitude,
      longitude,
      area,
      vin,
      registrationNumber,
      bodyVolume,
      inventoryNumber,
      chamberVolume,
      serialNumber,
      manufacturer,
      contractorId: updateContractorId
    } = otherFields;

    if (updateContractorId !== undefined) {
      updates.push(`contractor_id = $${paramIndex++}`);
      params.push(updateContractorId);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      params.push(address || null);
    }
    if (latitude !== undefined) {
      updates.push(`latitude = $${paramIndex++}`);
      params.push(latitude || null);
    }
    if (longitude !== undefined) {
      updates.push(`longitude = $${paramIndex++}`);
      params.push(longitude || null);
    }
    if (area !== undefined) {
      updates.push(`area = $${paramIndex++}`);
      params.push(area || null);
    }
    if (vin !== undefined) {
      updates.push(`vin = $${paramIndex++}`);
      params.push(vin || null);
    }
    if (registrationNumber !== undefined) {
      updates.push(`registration_number = $${paramIndex++}`);
      params.push(registrationNumber || null);
    }
    if (bodyVolume !== undefined) {
      updates.push(`body_volume = $${paramIndex++}`);
      params.push(bodyVolume || null);
    }
    if (inventoryNumber !== undefined) {
      updates.push(`inventory_number = $${paramIndex++}`);
      params.push(inventoryNumber || null);
    }
    if (chamberVolume !== undefined) {
      updates.push(`chamber_volume = $${paramIndex++}`);
      params.push(chamberVolume || null);
    }
    if (serialNumber !== undefined) {
      updates.push(`serial_number = $${paramIndex++}`);
      params.push(serialNumber || null);
    }
    if (manufacturer !== undefined) {
      updates.push(`manufacturer = $${paramIndex++}`);
      params.push(manufacturer || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    params.push(id);
    const updateQuery = `
      UPDATE qualification_objects
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id
    `;

    await pool.query(updateQuery, params);

    // Получаем обновленный объект
    const result = await pool.query(`
      SELECT 
        qo.id, qo.project_id, qo.name, qo.storage_zones, qo.object_type, qo.climate_system,
        qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
        qo.work_schedule, qo.created_at, qo.updated_at,
        p.contractor_id,
        c.name as contractor_name
      FROM qualification_objects qo
      LEFT JOIN projects p ON qo.project_id = p.id
      LEFT JOIN contractors c ON p.contractor_id = c.id
      WHERE qo.id = $1
    `, [id]);

    const row = result.rows[0];
    res.json({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      storageZones: row.storage_zones || [],
      objectType: row.object_type,
      climateSystem: row.climate_system,
      temperatureLimits: row.temperature_limits || { min: null, max: null },
      humidityLimits: row.humidity_limits || { min: null, max: null },
      measurementZones: row.measurement_zones || [],
      workSchedule: row.work_schedule || [],
      contractorId: row.contractor_id || undefined,
      contractor: row.contractor_name ? { name: row.contractor_name } : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error updating qualification object:', error);
    res.status(500).json({ error: `Ошибка обновления объекта квалификации: ${error.message}` });
  }
});

// PATCH /api/qualification-objects/:id - Частичное обновление объекта квалификации
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Проверяем существование объекта
    const checkResult = await pool.query('SELECT id FROM qualification_objects WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Объект квалификации не найден' });
    }

    // Строим запрос обновления динамически
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'project_id', 'contractor_id', 'name', 'object_type', 'climate_system',
      'temperature_limits', 'humidity_limits', 'storage_zones', 'measurement_zones', 'work_schedule',
      'plan_file_url', 'plan_file_name', 'test_data_file_url', 'test_data_file_name',
      'address', 'latitude', 'longitude', 'geocoded_at', 'area',
      'vin', 'registration_number', 'body_volume',
      'inventory_number', 'chamber_volume', 'serial_number', 'manufacturer'
    ];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      console.log(`PATCH: маппинг поля ${key} -> ${dbKey}, значение:`, value);
      if (allowedFields.includes(dbKey)) {
        updateFields.push(`${dbKey} = $${paramIndex++}`);
        // Для JSONB полей сериализуем объекты
        if (dbKey === 'temperature_limits' || dbKey === 'humidity_limits' || 
            dbKey === 'storage_zones' || dbKey === 'measurement_zones' || dbKey === 'work_schedule') {
          params.push(JSON.stringify(value));
        } else {
          params.push(value);
        }
      } else {
        console.log(`PATCH: поле ${dbKey} не в списке разрешенных полей`);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Нет валидных данных для обновления' });
    }

    params.push(id);
    const updateQuery = `
      UPDATE qualification_objects
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id
    `;

    const updateResult = await pool.query(updateQuery, params);
    
    // Если обновляются файлы планов, регистрируем их в project_files
    if (updates.planFileUrl || updates.testDataFileUrl) {
      const objectResult = await pool.query(
        'SELECT project_id FROM qualification_objects WHERE id = $1',
        [id]
      );
      const projectId = objectResult.rows[0]?.project_id;
      
      if (projectId) {
        try {
          if (updates.planFileUrl) {
            await pool.query(`
              INSERT INTO project_files (
                project_id, file_type, file_category, file_name, original_file_name,
                file_url, file_size, mime_type, related_table, related_id
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT DO NOTHING
            `, [
              projectId,
              'plan',
              'object_plan',
              updates.planFileName || 'plan',
              updates.planFileName || 'plan',
              updates.planFileUrl,
              null,
              null,
              'qualification_objects',
              id
            ]);
          }
          
          if (updates.testDataFileUrl) {
            await pool.query(`
              INSERT INTO project_files (
                project_id, file_type, file_category, file_name, original_file_name,
                file_url, file_size, mime_type, related_table, related_id
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT DO NOTHING
            `, [
              projectId,
              'test_data',
              'object_test_data',
              updates.testDataFileName || 'test_data',
              updates.testDataFileName || 'test_data',
              updates.testDataFileUrl,
              null,
              null,
              'qualification_objects',
              id
            ]);
          }
        } catch (fileTrackingError: any) {
          // Игнорируем ошибку, если таблица project_files не существует
          if (fileTrackingError.code !== '42P01') {
            console.warn('Ошибка регистрации файла в project_files:', fileTrackingError);
          }
        }
      }
    }

    // Получаем обновленный объект
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

    const row = result.rows[0];
    res.json({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      objectType: row.object_type,
      climateSystem: row.climate_system,
      temperatureLimits: row.temperature_limits || { min: null, max: null },
      humidityLimits: row.humidity_limits || { min: null, max: null },
      measurementZones: row.measurement_zones || [],
      workSchedule: row.work_schedule || [],
      contractorId: row.contractor_id || undefined,
      contractor: row.contractor_name ? { name: row.contractor_name } : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error patching qualification object:', error);
    res.status(500).json({ error: `Ошибка обновления объекта квалификации: ${error.message}` });
  }
});

// DELETE /api/qualification-objects/:id - Удалить объект квалификации
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM qualification_objects WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Объект квалификации не найден' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting qualification object:', error);
    res.status(500).json({ error: `Ошибка удаления объекта квалификации: ${error.message}` });
  }
});

export default router;

