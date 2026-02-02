import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

const tableExists = async (tableName: string): Promise<boolean> => {
  const result = await pool.query(
    `
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
    ) as exists
    `,
    [tableName]
  );
  return result.rows[0]?.exists === true;
};

const upsertProjectObjectData = async (
  projectId: string,
  qualificationObjectId: string,
  data: Record<string, any>
) => {
  const fieldConfig: Record<string, { column: string; json?: boolean }> = {
    storageZones: { column: 'storage_zones', json: true },
    climateSystem: { column: 'climate_system' },
    temperatureLimits: { column: 'temperature_limits', json: true },
    humidityLimits: { column: 'humidity_limits', json: true },
    measurementZones: { column: 'measurement_zones', json: true },
    workSchedule: { column: 'work_schedule', json: true },
    planFileUrl: { column: 'plan_file_url' },
    planFileName: { column: 'plan_file_name' },
    testDataFileUrl: { column: 'test_data_file_url' },
    testDataFileName: { column: 'test_data_file_name' },
    address: { column: 'address' },
    latitude: { column: 'latitude' },
    longitude: { column: 'longitude' },
    geocodedAt: { column: 'geocoded_at' },
    area: { column: 'area' },
    vin: { column: 'vin' },
    registrationNumber: { column: 'registration_number' },
    bodyVolume: { column: 'body_volume' },
    inventoryNumber: { column: 'inventory_number' },
    chamberVolume: { column: 'chamber_volume' },
    serialNumber: { column: 'serial_number' },
    manufacturer: { column: 'manufacturer' }
  };

  const columns: string[] = [];
  const values: any[] = [];

  Object.entries(fieldConfig).forEach(([key, config]) => {
    if (data[key] === undefined) return;
    let value = data[key];
    if (config.json) {
      value = typeof value === 'object' ? JSON.stringify(value) : value;
    }
    if (key === 'geocodedAt' && value instanceof Date) {
      value = value.toISOString();
    }
    columns.push(config.column);
    values.push(value);
  });

  if (columns.length === 0) return;

  const insertColumns = ['project_id', 'qualification_object_id', ...columns];
  const placeholders = insertColumns.map((_, i) => `$${i + 1}`).join(', ');
  const updateSet = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');

  await pool.query(
    `
    INSERT INTO project_qualification_object_data (${insertColumns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT (project_id, qualification_object_id)
    DO UPDATE SET ${updateSet}
    `,
    [projectId, qualificationObjectId, ...values]
  );
};

// GET /api/qualification-objects - Получить все объекты квалификации
router.get('/', async (req, res) => {
  try {
    const { contractor_id, project_id } = req.query;
    const hasProjectDataTable = await tableExists('project_qualification_object_data');
    const hasProjectQualificationObjects = await tableExists('project_qualification_objects');

    let query: string;
    const params: any[] = [];

    if (project_id && hasProjectDataTable && hasProjectQualificationObjects) {
      params.push(project_id);
      query = `
        SELECT 
          qo.id,
          qo.contractor_id,
          qo.name,
          qo.object_type,
          pqod.storage_zones,
          pqod.climate_system,
          pqod.temperature_limits,
          pqod.humidity_limits,
          pqod.measurement_zones,
          pqod.work_schedule,
          pqod.plan_file_url,
          pqod.plan_file_name,
          pqod.test_data_file_url,
          pqod.test_data_file_name,
          pqod.address,
          pqod.latitude,
          pqod.longitude,
          pqod.geocoded_at,
          pqod.area,
          pqod.vin,
          pqod.registration_number,
          pqod.body_volume,
          pqod.inventory_number,
          pqod.chamber_volume,
          pqod.serial_number,
          pqod.manufacturer,
          pqod.created_at,
          pqod.updated_at,
          c.name as contractor_name
        FROM project_qualification_objects pqo
        JOIN qualification_objects qo ON qo.id = pqo.qualification_object_id
        LEFT JOIN project_qualification_object_data pqod
          ON pqod.project_id = pqo.project_id
          AND pqod.qualification_object_id = pqo.qualification_object_id
        LEFT JOIN contractors c ON qo.contractor_id = c.id
        WHERE pqo.project_id = $1
      `;

      if (contractor_id) {
        params.push(contractor_id);
        query += ` AND qo.contractor_id = $${params.length}`;
      }

      query += ' ORDER BY qo.created_at DESC';
    } else {
      query = `
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

      if (contractor_id) {
        query += ' WHERE (qo.contractor_id = $1 OR p.contractor_id = $1)';
        params.push(contractor_id);
      }

      query += ' ORDER BY qo.created_at DESC';
    }

    const result = await pool.query(query, params);
    
    const objects = result.rows.map((row: any) => ({
      id: row.id,
      projectId: project_id || row.project_id || undefined,
      contractorId: row.final_contractor_id || row.contractor_id || undefined,
      name: row.name,
      storageZones: row.storage_zones || [],
      objectType: row.object_type,
      climateSystem: row.climate_system,
      temperatureLimits: row.temperature_limits || { min: null, max: null },
      humidityLimits: row.humidity_limits || { min: null, max: null },
      measurementZones: row.measurement_zones || [],
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
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
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
    const { project_id } = req.query;
    const hasProjectDataTable = await tableExists('project_qualification_object_data');
    const hasProjectQualificationObjects = await tableExists('project_qualification_objects');
    let result;

    if (project_id && hasProjectDataTable && hasProjectQualificationObjects) {
      result = await pool.query(
        `
        SELECT 
          qo.id,
          qo.contractor_id,
          qo.name,
          qo.object_type,
          pqod.storage_zones,
          pqod.climate_system,
          pqod.temperature_limits,
          pqod.humidity_limits,
          pqod.measurement_zones,
          pqod.work_schedule,
          pqod.plan_file_url,
          pqod.plan_file_name,
          pqod.test_data_file_url,
          pqod.test_data_file_name,
          pqod.address,
          pqod.latitude,
          pqod.longitude,
          pqod.geocoded_at,
          pqod.area,
          pqod.vin,
          pqod.registration_number,
          pqod.body_volume,
          pqod.inventory_number,
          pqod.chamber_volume,
          pqod.serial_number,
          pqod.manufacturer,
          pqod.created_at,
          pqod.updated_at,
          c.name as contractor_name
        FROM project_qualification_objects pqo
        JOIN qualification_objects qo ON qo.id = pqo.qualification_object_id
        LEFT JOIN project_qualification_object_data pqod
          ON pqod.project_id = pqo.project_id
          AND pqod.qualification_object_id = pqo.qualification_object_id
        LEFT JOIN contractors c ON qo.contractor_id = c.id
        WHERE pqo.project_id = $1 AND qo.id = $2
        `,
        [project_id, id]
      );
    } else {
      result = await pool.query(
        `
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
        `,
        [id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Объект квалификации не найден' });
    }
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      projectId: project_id || row.project_id || undefined,
      contractorId: row.final_contractor_id || row.contractor_id || undefined,
      name: row.name,
      storageZones: row.storage_zones || [],
      objectType: row.object_type,
      climateSystem: row.climate_system,
      temperatureLimits: row.temperature_limits || { min: null, max: null },
      humidityLimits: row.humidity_limits || { min: null, max: null },
      measurementZones: row.measurement_zones || [],
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
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
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

    const result = await pool.query(
      `
      INSERT INTO qualification_objects (${insertFields.join(', ')})
      VALUES (${placeholders})
      RETURNING id, created_at, updated_at
      `,
      insertValues
    );

    const row = result.rows[0];
    
    const hasProjectDataTable = await tableExists('project_qualification_object_data');
    const hasProjectQualificationObjects = await tableExists('project_qualification_objects');

    if (projectId && hasProjectQualificationObjects && hasProjectDataTable) {
      await pool.query(
        `
        INSERT INTO project_qualification_objects (project_id, qualification_object_id)
        VALUES ($1, $2)
        ON CONFLICT (project_id, qualification_object_id) DO NOTHING
        `,
        [projectId, row.id]
      );

      await upsertProjectObjectData(projectId, row.id, {
        storageZones,
        climateSystem,
        temperatureLimits,
        humidityLimits,
        measurementZones,
        workSchedule,
        ...otherFields
      });
    }

    let fullResult;
    if (projectId && hasProjectQualificationObjects && hasProjectDataTable) {
      fullResult = await pool.query(
        `
        SELECT 
          qo.id,
          qo.contractor_id,
          qo.name,
          qo.object_type,
          pqod.storage_zones,
          pqod.climate_system,
          pqod.temperature_limits,
          pqod.humidity_limits,
          pqod.measurement_zones,
          pqod.work_schedule,
          pqod.plan_file_url,
          pqod.plan_file_name,
          pqod.test_data_file_url,
          pqod.test_data_file_name,
          pqod.address,
          pqod.latitude,
          pqod.longitude,
          pqod.geocoded_at,
          pqod.area,
          pqod.vin,
          pqod.registration_number,
          pqod.body_volume,
          pqod.inventory_number,
          pqod.chamber_volume,
          pqod.serial_number,
          pqod.manufacturer,
          pqod.created_at,
          pqod.updated_at,
          c.name as contractor_name
        FROM project_qualification_objects pqo
        JOIN qualification_objects qo ON qo.id = pqo.qualification_object_id
        LEFT JOIN project_qualification_object_data pqod
          ON pqod.project_id = pqo.project_id
          AND pqod.qualification_object_id = pqo.qualification_object_id
        LEFT JOIN contractors c ON qo.contractor_id = c.id
        WHERE pqo.project_id = $1 AND qo.id = $2
        `,
        [projectId, row.id]
      );
    } else {
      fullResult = await pool.query(
        `
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
        `,
        [row.id]
      );
    }

    const fullRow = fullResult.rows[0];
    res.status(201).json({
      id: fullRow.id,
      projectId: projectId || fullRow.project_id,
      contractorId: fullRow.final_contractor_id || fullRow.contractor_id,
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
      createdAt: fullRow.created_at ? new Date(fullRow.created_at) : undefined,
      updatedAt: fullRow.updated_at ? new Date(fullRow.updated_at) : undefined
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

    const hasProjectDataTable = await tableExists('project_qualification_object_data');
    const hasProjectQualificationObjects = await tableExists('project_qualification_objects');
    const isProjectScoped = Boolean(projectId && hasProjectDataTable && hasProjectQualificationObjects);

    // Проверяем существование объекта
    const checkResult = await pool.query('SELECT id FROM qualification_objects WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Объект квалификации не найден' });
    }

    // Строим запрос обновления динамически
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (projectId !== undefined && !isProjectScoped) {
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
    if (climateSystem !== undefined && !isProjectScoped) {
      updates.push(`climate_system = $${paramIndex++}`);
      params.push(climateSystem);
    }
    if (temperatureLimits !== undefined && !isProjectScoped) {
      updates.push(`temperature_limits = $${paramIndex++}`);
      params.push(JSON.stringify(temperatureLimits));
    }
    if (humidityLimits !== undefined && !isProjectScoped) {
      updates.push(`humidity_limits = $${paramIndex++}`);
      params.push(JSON.stringify(humidityLimits));
    }
    if (storageZones !== undefined && !isProjectScoped) {
      updates.push(`storage_zones = $${paramIndex++}`);
      params.push(typeof storageZones === 'object' ? JSON.stringify(storageZones) : storageZones);
    }
    if (measurementZones !== undefined && !isProjectScoped) {
      updates.push(`measurement_zones = $${paramIndex++}`);
      params.push(typeof measurementZones === 'object' ? JSON.stringify(measurementZones) : measurementZones);
    }
    if (workSchedule !== undefined && !isProjectScoped) {
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
    if (address !== undefined && !isProjectScoped) {
      updates.push(`address = $${paramIndex++}`);
      params.push(address || null);
    }
    if (latitude !== undefined && !isProjectScoped) {
      updates.push(`latitude = $${paramIndex++}`);
      params.push(latitude || null);
    }
    if (longitude !== undefined && !isProjectScoped) {
      updates.push(`longitude = $${paramIndex++}`);
      params.push(longitude || null);
    }
    if (area !== undefined && !isProjectScoped) {
      updates.push(`area = $${paramIndex++}`);
      params.push(area || null);
    }
    if (vin !== undefined && !isProjectScoped) {
      updates.push(`vin = $${paramIndex++}`);
      params.push(vin || null);
    }
    if (registrationNumber !== undefined && !isProjectScoped) {
      updates.push(`registration_number = $${paramIndex++}`);
      params.push(registrationNumber || null);
    }
    if (bodyVolume !== undefined && !isProjectScoped) {
      updates.push(`body_volume = $${paramIndex++}`);
      params.push(bodyVolume || null);
    }
    if (inventoryNumber !== undefined && !isProjectScoped) {
      updates.push(`inventory_number = $${paramIndex++}`);
      params.push(inventoryNumber || null);
    }
    if (chamberVolume !== undefined && !isProjectScoped) {
      updates.push(`chamber_volume = $${paramIndex++}`);
      params.push(chamberVolume || null);
    }
    if (serialNumber !== undefined && !isProjectScoped) {
      updates.push(`serial_number = $${paramIndex++}`);
      params.push(serialNumber || null);
    }
    if (manufacturer !== undefined && !isProjectScoped) {
      updates.push(`manufacturer = $${paramIndex++}`);
      params.push(manufacturer || null);
    }

    const projectData = {
      storageZones,
      climateSystem,
      temperatureLimits,
      humidityLimits,
      measurementZones,
      workSchedule,
      ...otherFields
    };
    const hasProjectDataUpdates = isProjectScoped
      ? Object.values(projectData).some(value => value !== undefined)
      : false;

    if (updates.length === 0 && !hasProjectDataUpdates) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    if (updates.length > 0) {
      params.push(id);
      const updateQuery = `
        UPDATE qualification_objects
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING id
      `;

      await pool.query(updateQuery, params);
    }

    if (isProjectScoped && projectId && hasProjectDataUpdates) {
      await upsertProjectObjectData(projectId, id, projectData);
    }

    // Получаем обновленный объект
    let result;
    if (isProjectScoped && projectId) {
      result = await pool.query(
        `
        SELECT 
          qo.id,
          qo.contractor_id,
          qo.name,
          qo.object_type,
          pqod.storage_zones,
          pqod.climate_system,
          pqod.temperature_limits,
          pqod.humidity_limits,
          pqod.measurement_zones,
          pqod.work_schedule,
          pqod.plan_file_url,
          pqod.plan_file_name,
          pqod.test_data_file_url,
          pqod.test_data_file_name,
          pqod.address,
          pqod.latitude,
          pqod.longitude,
          pqod.geocoded_at,
          pqod.area,
          pqod.vin,
          pqod.registration_number,
          pqod.body_volume,
          pqod.inventory_number,
          pqod.chamber_volume,
          pqod.serial_number,
          pqod.manufacturer,
          pqod.created_at,
          pqod.updated_at,
          c.name as contractor_name
        FROM project_qualification_objects pqo
        JOIN qualification_objects qo ON qo.id = pqo.qualification_object_id
        LEFT JOIN project_qualification_object_data pqod
          ON pqod.project_id = pqo.project_id
          AND pqod.qualification_object_id = pqo.qualification_object_id
        LEFT JOIN contractors c ON qo.contractor_id = c.id
        WHERE pqo.project_id = $1 AND qo.id = $2
        `,
        [projectId, id]
      );
    } else {
      result = await pool.query(
        `
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
        `,
        [id]
      );
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      projectId: projectId || row.project_id,
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
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
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
    const projectId = updates.projectId || updates.project_id;
    const hasProjectDataTable = await tableExists('project_qualification_object_data');
    const hasProjectQualificationObjects = await tableExists('project_qualification_objects');
    const isProjectScoped = Boolean(projectId && hasProjectDataTable && hasProjectQualificationObjects);

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

    const projectFieldMap: Record<string, string> = {
      storage_zones: 'storageZones',
      climate_system: 'climateSystem',
      temperature_limits: 'temperatureLimits',
      humidity_limits: 'humidityLimits',
      measurement_zones: 'measurementZones',
      work_schedule: 'workSchedule',
      plan_file_url: 'planFileUrl',
      plan_file_name: 'planFileName',
      test_data_file_url: 'testDataFileUrl',
      test_data_file_name: 'testDataFileName',
      address: 'address',
      latitude: 'latitude',
      longitude: 'longitude',
      geocoded_at: 'geocodedAt',
      area: 'area',
      vin: 'vin',
      registration_number: 'registrationNumber',
      body_volume: 'bodyVolume',
      inventory_number: 'inventoryNumber',
      chamber_volume: 'chamberVolume',
      serial_number: 'serialNumber',
      manufacturer: 'manufacturer'
    };

    const projectData: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      console.log(`PATCH: маппинг поля ${key} -> ${dbKey}, значение:`, value);
      if (allowedFields.includes(dbKey)) {
        if (isProjectScoped && dbKey === 'project_id') {
          continue;
        }
        if (isProjectScoped && projectFieldMap[dbKey]) {
          projectData[projectFieldMap[dbKey]] = value;
          continue;
        }
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

    if (updateFields.length === 0 && Object.keys(projectData).length === 0) {
      return res.status(400).json({ error: 'Нет валидных данных для обновления' });
    }

    if (updateFields.length > 0) {
      params.push(id);
      const updateQuery = `
        UPDATE qualification_objects
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING id
      `;

      await pool.query(updateQuery, params);
    }

    if (isProjectScoped && projectId && Object.keys(projectData).length > 0) {
      await upsertProjectObjectData(projectId, id, projectData);
    }
    
    // Если обновляются файлы планов, регистрируем их в project_files
    if (updates.planFileUrl || updates.testDataFileUrl) {
      let fileProjectId = projectId;
      if (!fileProjectId) {
        const objectResult = await pool.query(
          'SELECT project_id FROM qualification_objects WHERE id = $1',
          [id]
        );
        fileProjectId = objectResult.rows[0]?.project_id;
      }
      
      if (fileProjectId) {
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
              fileProjectId,
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
              fileProjectId,
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
    let result;
    if (isProjectScoped && projectId) {
      result = await pool.query(
        `
        SELECT 
          qo.id,
          qo.contractor_id,
          qo.name,
          qo.object_type,
          pqod.storage_zones,
          pqod.climate_system,
          pqod.temperature_limits,
          pqod.humidity_limits,
          pqod.measurement_zones,
          pqod.work_schedule,
          pqod.plan_file_url,
          pqod.plan_file_name,
          pqod.test_data_file_url,
          pqod.test_data_file_name,
          pqod.address,
          pqod.latitude,
          pqod.longitude,
          pqod.geocoded_at,
          pqod.area,
          pqod.vin,
          pqod.registration_number,
          pqod.body_volume,
          pqod.inventory_number,
          pqod.chamber_volume,
          pqod.serial_number,
          pqod.manufacturer,
          pqod.created_at,
          pqod.updated_at,
          c.name as contractor_name
        FROM project_qualification_objects pqo
        JOIN qualification_objects qo ON qo.id = pqo.qualification_object_id
        LEFT JOIN project_qualification_object_data pqod
          ON pqod.project_id = pqo.project_id
          AND pqod.qualification_object_id = pqo.qualification_object_id
        LEFT JOIN contractors c ON qo.contractor_id = c.id
        WHERE pqo.project_id = $1 AND qo.id = $2
        `,
        [projectId, id]
      );
    } else {
      result = await pool.query(
        `
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
        `,
        [id]
      );
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      projectId: projectId || row.project_id,
      name: row.name,
      objectType: row.object_type,
      climateSystem: row.climate_system,
      temperatureLimits: row.temperature_limits || { min: null, max: null },
      humidityLimits: row.humidity_limits || { min: null, max: null },
      measurementZones: row.measurement_zones || [],
      workSchedule: row.work_schedule || [],
      contractorId: row.contractor_id || undefined,
      contractor: row.contractor_name ? { name: row.contractor_name } : undefined,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
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

