import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/qualification-objects - Получить все объекты квалификации
router.get('/', async (req, res) => {
  try {
    const { contractor_id } = req.query;
    let queryWithZones = `
      SELECT 
        qo.id, qo.project_id, qo.contractor_id, qo.name, qo.object_type, qo.climate_system,
        qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
        qz.zones,
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
      LEFT JOIN LATERAL (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', qoz.id,
              'name', qoz.name,
              'volume', qoz.volume
            )
            ORDER BY qoz.created_at
          ),
          '[]'::json
        ) AS zones
        FROM qualification_object_zones qoz
        WHERE qoz.qualification_object_id = qo.id
      ) qz ON true
    `;
    let queryWithoutZones = `
      SELECT 
        qo.id, qo.project_id, qo.contractor_id, qo.name, qo.object_type, qo.climate_system,
        qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
        '[]'::json AS zones,
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
      queryWithZones += ' WHERE (qo.contractor_id = $1 OR p.contractor_id = $1)';
      queryWithoutZones += ' WHERE (qo.contractor_id = $1 OR p.contractor_id = $1)';
      params.push(contractor_id);
    }
    
    queryWithZones += ' ORDER BY qo.created_at DESC';
    queryWithoutZones += ' ORDER BY qo.created_at DESC';
    let result;
    try {
      result = await pool.query(queryWithZones, params);
    } catch (error) {
      const errorMessage = (error as Error)?.message || '';
      const errorCode = (error as any)?.code;
      if (errorCode === '42P01' && errorMessage.includes('qualification_object_zones')) {
        result = await pool.query(queryWithoutZones, params);
      } else {
        throw error;
      }
    }
    
    const objects = result.rows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      contractorId: row.final_contractor_id || undefined,
      name: row.name,
      objectType: row.object_type,
      climateSystem: row.climate_system,
      temperatureLimits: row.temperature_limits || { min: null, max: null },
      humidityLimits: row.humidity_limits || { min: null, max: null },
      measurementZones: row.measurement_zones || 0,
      zones: row.zones || [],
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
    const projectId = typeof req.query.project_id === 'string' ? req.query.project_id : undefined;
    const queryWithZones = `
      SELECT 
        qo.id, qo.project_id, qo.contractor_id, qo.name, qo.object_type, qo.climate_system,
        qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
        qz.zones,
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
      LEFT JOIN LATERAL (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', qoz.id,
              'name', qoz.name,
              'volume', qoz.volume
            )
            ORDER BY qoz.created_at
          ),
          '[]'::json
        ) AS zones
        FROM qualification_object_zones qoz
        WHERE qoz.qualification_object_id = qo.id
      ) qz ON true
      WHERE qo.id = $1
    `;
    const queryWithoutZones = `
      SELECT 
        qo.id, qo.project_id, qo.contractor_id, qo.name, qo.object_type, qo.climate_system,
        qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
        '[]'::json AS zones,
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
    `;
    let result;
    try {
      result = await pool.query(queryWithZones, [id]);
    } catch (error) {
      const errorMessage = (error as Error)?.message || '';
      const errorCode = (error as any)?.code;
      if (errorCode === '42P01' && errorMessage.includes('qualification_object_zones')) {
        result = await pool.query(queryWithoutZones, [id]);
      } else {
        throw error;
      }
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Объект квалификации не найден' });
    }
    
    const row = result.rows[0];
    let measurementZones = projectId ? [] : (row.measurement_zones || []);
    if (projectId) {
      try {
        const tableExists = await pool.query(
          `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'qualification_object_measurement_zones'
          ) AS exists`
        );
        const measurementZonesTableExists = Boolean(tableExists.rows[0]?.exists);
        let zonesResultRowCount = 0;
        if (measurementZonesTableExists) {
          const zonesResult = await pool.query(
            `SELECT zones FROM qualification_object_measurement_zones
             WHERE qualification_object_id = $1 AND project_id = $2`,
            [id, projectId]
          );
          zonesResultRowCount = zonesResult.rows.length;
          if (zonesResultRowCount > 0) {
            measurementZones = zonesResult.rows[0].zones || [];
          }
        }
      } catch (error) {
        const errorCode = (error as any)?.code;
        if (errorCode !== '42P01') {
          throw error;
        }
      }
    }
    res.json({
      id: row.id,
      projectId: row.project_id,
      contractorId: row.final_contractor_id || undefined,
      name: row.name,
      objectType: row.object_type,
      climateSystem: row.climate_system,
      temperatureLimits: row.temperature_limits || { min: null, max: null },
      humidityLimits: row.humidity_limits || { min: null, max: null },
      measurementZones,
      zones: row.zones || [],
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
      measurementZones,
      zones,
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Формируем динамический запрос с учетом всех полей
      const insertFields = [
        'project_id', 'contractor_id', 'name', 'object_type', 'climate_system',
        'temperature_limits', 'humidity_limits', 'measurement_zones', 'work_schedule'
      ];
      const insertValues: any[] = [
        projectId || null,
        contractorId || null,
        name,
        objectType,
        climateSystem || null,
        temperatureLimits ? JSON.stringify(temperatureLimits) : null,
        humidityLimits ? JSON.stringify(humidityLimits) : null,
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

      const result = await client.query(`
        INSERT INTO qualification_objects (${insertFields.join(', ')})
        VALUES (${placeholders})
        RETURNING id, created_at, updated_at
      `, insertValues);

      const row = result.rows[0];

      const normalizedZones = Array.isArray(zones) ? zones : [];
      if (normalizedZones.length > 0) {
        const zoneValues = normalizedZones.flatMap((zone: any) => ([
          row.id,
          zone.name || '',
          zone.volume ?? null
        ]));
        const zonePlaceholders = normalizedZones
          .map((_, index) => {
            const baseIndex = index * 3;
            return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
          })
          .join(', ');

        await client.query(`
          INSERT INTO qualification_object_zones (
            qualification_object_id, name, volume
          )
          VALUES ${zonePlaceholders}
        `, zoneValues);
      }
      
      // Получаем полную информацию с contractor
      const fullResult = await client.query(`
      SELECT 
        qo.id, qo.project_id, qo.contractor_id, qo.name, qo.object_type, qo.climate_system,
        qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
        qz.zones,
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
      LEFT JOIN LATERAL (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', qoz.id,
              'name', qoz.name,
              'volume', qoz.volume
            )
            ORDER BY qoz.created_at
          ),
          '[]'::json
        ) AS zones
        FROM qualification_object_zones qoz
        WHERE qoz.qualification_object_id = qo.id
      ) qz ON true
      WHERE qo.id = $1
      `, [row.id]);

    const fullRow = fullResult.rows[0];
      await client.query('COMMIT');

      res.status(201).json({
      id: fullRow.id,
      projectId: fullRow.project_id,
      contractorId: fullRow.final_contractor_id,
      name: fullRow.name,
      objectType: fullRow.object_type,
      climateSystem: fullRow.climate_system,
      temperatureLimits: fullRow.temperature_limits || { min: null, max: null },
      humidityLimits: fullRow.humidity_limits || { min: null, max: null },
      measurementZones: fullRow.measurement_zones || [],
      zones: fullRow.zones || [],
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
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
      measurementZones,
      zones,
      workSchedule,
      ...otherFields
    } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Проверяем существование объекта
      const checkResult = await client.query('SELECT id FROM qualification_objects WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
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
      if (measurementZones !== undefined && !projectId) {
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

      if (updates.length === 0 && zones === undefined) {
        await client.query('ROLLBACK');
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

        await client.query(updateQuery, params);
      }

      if (zones !== undefined) {
        await client.query('SAVEPOINT zones_update');
        try {
          await client.query(
            'DELETE FROM qualification_object_zones WHERE qualification_object_id = $1',
            [id]
          );
          const normalizedZones = Array.isArray(zones) ? zones : [];
          if (normalizedZones.length > 0) {
            const zoneValues = normalizedZones.flatMap((zone: any) => ([
              id,
              zone.name || '',
              zone.volume ?? null
            ]));
            const zonePlaceholders = normalizedZones
              .map((_, index) => {
                const baseIndex = index * 3;
                return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
              })
              .join(', ');

            await client.query(`
              INSERT INTO qualification_object_zones (
                qualification_object_id, name, volume
              )
              VALUES ${zonePlaceholders}
            `, zoneValues);
          }
        } catch (zoneError) {
          const zoneErrorMessage = (zoneError as Error)?.message || '';
          const zoneErrorCode = (zoneError as any)?.code;
          if (zoneErrorCode === '42P01' && zoneErrorMessage.includes('qualification_object_zones')) {
            await client.query('ROLLBACK TO SAVEPOINT zones_update');
            await client.query('RELEASE SAVEPOINT zones_update');
            try {
              await client.query(`
                CREATE TABLE IF NOT EXISTS public.qualification_object_zones (
                  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                  qualification_object_id UUID NOT NULL REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
                  name TEXT NOT NULL,
                  volume NUMERIC(10,2),
                  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
              `);
              await client.query(`
                CREATE INDEX IF NOT EXISTS idx_qo_zones_object_id
                ON public.qualification_object_zones(qualification_object_id)
              `);
              await client.query('SAVEPOINT zones_update_retry');
              const normalizedZones = Array.isArray(zones) ? zones : [];
              if (normalizedZones.length > 0) {
                const zoneValues = normalizedZones.flatMap((zone: any) => ([
                  id,
                  zone.name || '',
                  zone.volume ?? null
                ]));
                const zonePlaceholders = normalizedZones
                  .map((_, index) => {
                    const baseIndex = index * 3;
                    return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
                  })
                  .join(', ');
                await client.query(
                  'DELETE FROM qualification_object_zones WHERE qualification_object_id = $1',
                  [id]
                );
                await client.query(`
                  INSERT INTO qualification_object_zones (
                    qualification_object_id, name, volume
                  )
                  VALUES ${zonePlaceholders}
                `, zoneValues);
              }
              await client.query('RELEASE SAVEPOINT zones_update_retry');
            } catch (createError) {
              await client.query('ROLLBACK TO SAVEPOINT zones_update_retry').catch(() => {});
            }
          } else {
            throw zoneError;
          }
        }
      }

      if (measurementZones !== undefined && projectId) {
        await client.query(`
          CREATE TABLE IF NOT EXISTS public.qualification_object_measurement_zones (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            qualification_object_id UUID NOT NULL REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
            project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
            zones JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (qualification_object_id, project_id)
          );
        `);
        await client.query(
          `INSERT INTO qualification_object_measurement_zones (
            qualification_object_id, project_id, zones
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (qualification_object_id, project_id)
          DO UPDATE SET zones = EXCLUDED.zones, updated_at = NOW()`,
          [id, projectId, typeof measurementZones === 'object' ? JSON.stringify(measurementZones) : measurementZones]
        );
      }

      // Получаем обновленный объект
      const selectWithZones = `
        SELECT 
          qo.id, qo.project_id, qo.name, qo.object_type, qo.climate_system,
          qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
          qz.zones,
          qo.work_schedule, qo.created_at, qo.updated_at,
          p.contractor_id,
          c.name as contractor_name
        FROM qualification_objects qo
        LEFT JOIN projects p ON qo.project_id = p.id
        LEFT JOIN contractors c ON p.contractor_id = c.id
        LEFT JOIN LATERAL (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', qoz.id,
                'name', qoz.name,
                'volume', qoz.volume
              )
              ORDER BY qoz.created_at
            ),
            '[]'::json
          ) AS zones
          FROM qualification_object_zones qoz
          WHERE qoz.qualification_object_id = qo.id
        ) qz ON true
        WHERE qo.id = $1
      `;
      const selectWithoutZones = `
        SELECT 
          qo.id, qo.project_id, qo.name, qo.object_type, qo.climate_system,
          qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
          '[]'::json AS zones,
          qo.work_schedule, qo.created_at, qo.updated_at,
          p.contractor_id,
          c.name as contractor_name
        FROM qualification_objects qo
        LEFT JOIN projects p ON qo.project_id = p.id
        LEFT JOIN contractors c ON p.contractor_id = c.id
        WHERE qo.id = $1
      `;
      let result;
      try {
        await client.query('SAVEPOINT zones_select');
        result = await client.query(selectWithZones, [id]);
      } catch (selectError) {
        const selectErrorMessage = (selectError as Error)?.message || '';
        const selectErrorCode = (selectError as any)?.code;
        if (selectErrorCode === '42P01' && selectErrorMessage.includes('qualification_object_zones')) {
          await client.query('ROLLBACK TO SAVEPOINT zones_select');
          await client.query('RELEASE SAVEPOINT zones_select');
          result = await client.query(selectWithoutZones, [id]);
        } else {
          throw selectError;
        }
      }

      const row = result.rows[0];
      await client.query('COMMIT');
      res.json({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      objectType: row.object_type,
      climateSystem: row.climate_system,
      temperatureLimits: row.temperature_limits || { min: null, max: null },
      humidityLimits: row.humidity_limits || { min: null, max: null },
      measurementZones: row.measurement_zones || [],
      zones: row.zones || [],
      workSchedule: row.work_schedule || [],
      contractorId: row.contractor_id || undefined,
      contractor: row.contractor_name ? { name: row.contractor_name } : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error updating qualification object:', error);
    res.status(500).json({ error: `Ошибка обновления объекта квалификации: ${error.message}` });
  }
});

// PATCH /api/qualification-objects/:id - Частичное обновление объекта квалификации
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { zones, projectId, measurementZones, ...restUpdates } = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Проверяем существование объекта
      const checkResult = await client.query('SELECT id FROM qualification_objects WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Объект квалификации не найден' });
      }

      // Строим запрос обновления динамически
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      const allowedFields = [
        'project_id', 'contractor_id', 'name', 'object_type', 'climate_system',
        'temperature_limits', 'humidity_limits', 'measurement_zones', 'work_schedule',
        'plan_file_url', 'plan_file_name', 'test_data_file_url', 'test_data_file_name',
        'address', 'latitude', 'longitude', 'geocoded_at', 'area',
        'vin', 'registration_number', 'body_volume',
        'inventory_number', 'chamber_volume', 'serial_number', 'manufacturer'
      ];

    for (const [key, value] of Object.entries(restUpdates)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        console.log(`PATCH: маппинг поля ${key} -> ${dbKey}, значение:`, value);
      if (dbKey === 'measurement_zones' && projectId && measurementZones !== undefined) {
        continue;
      }
        if (allowedFields.includes(dbKey)) {
          updateFields.push(`${dbKey} = $${paramIndex++}`);
          // Для JSONB полей сериализуем объекты
          if (dbKey === 'temperature_limits' || dbKey === 'humidity_limits' || 
              dbKey === 'measurement_zones' || dbKey === 'work_schedule') {
            params.push(JSON.stringify(value));
          } else {
            params.push(value);
          }
        } else {
          console.log(`PATCH: поле ${dbKey} не в списке разрешенных полей`);
        }
      }

    if (updateFields.length === 0 && zones === undefined && measurementZones === undefined) {
        await client.query('ROLLBACK');
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

        await client.query(updateQuery, params);
      }

    if (zones !== undefined) {
        await client.query(
          'DELETE FROM qualification_object_zones WHERE qualification_object_id = $1',
          [id]
        );
        const normalizedZones = Array.isArray(zones) ? zones : [];
        if (normalizedZones.length > 0) {
          const zoneValues = normalizedZones.flatMap((zone: any) => ([
            id,
            zone.name || '',
            zone.volume ?? null
          ]));
          const zonePlaceholders = normalizedZones
            .map((_, index) => {
              const baseIndex = index * 3;
              return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
            })
            .join(', ');

          await client.query(`
            INSERT INTO qualification_object_zones (
              qualification_object_id, name, volume
            )
            VALUES ${zonePlaceholders}
          `, zoneValues);
        }
      }
    
    // Если обновляются файлы планов, регистрируем их в project_files
    if (restUpdates.planFileUrl || restUpdates.testDataFileUrl) {
      const objectResult = await client.query(
        'SELECT project_id FROM qualification_objects WHERE id = $1',
        [id]
      );
      const projectId = objectResult.rows[0]?.project_id;
      
      if (projectId) {
        try {
          if (restUpdates.planFileUrl) {
            await client.query(`
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
              restUpdates.planFileName || 'plan',
              restUpdates.planFileName || 'plan',
              restUpdates.planFileUrl,
              null,
              null,
              'qualification_objects',
              id
            ]);
          }
          
          if (restUpdates.testDataFileUrl) {
            await client.query(`
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
              restUpdates.testDataFileName || 'test_data',
              restUpdates.testDataFileName || 'test_data',
              restUpdates.testDataFileUrl,
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

    if (measurementZones !== undefined && projectId) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.qualification_object_measurement_zones (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          qualification_object_id UUID NOT NULL REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
          project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
          zones JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE (qualification_object_id, project_id)
        );
      `);
      await client.query(
        `INSERT INTO qualification_object_measurement_zones (
          qualification_object_id, project_id, zones
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (qualification_object_id, project_id)
        DO UPDATE SET zones = EXCLUDED.zones, updated_at = NOW()`,
        [id, projectId, JSON.stringify(measurementZones)]
      );
    }

    // Получаем обновленный объект
    const result = await client.query(`
      SELECT 
        qo.id, qo.project_id, qo.name, qo.object_type, qo.climate_system,
        qo.temperature_limits, qo.humidity_limits, qo.measurement_zones,
        qz.zones,
        qo.work_schedule, qo.created_at, qo.updated_at,
        p.contractor_id,
        c.name as contractor_name
      FROM qualification_objects qo
      LEFT JOIN projects p ON qo.project_id = p.id
      LEFT JOIN contractors c ON p.contractor_id = c.id
      LEFT JOIN LATERAL (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', qoz.id,
              'name', qoz.name,
              'volume', qoz.volume
            )
            ORDER BY qoz.created_at
          ),
          '[]'::json
        ) AS zones
        FROM qualification_object_zones qoz
        WHERE qoz.qualification_object_id = qo.id
      ) qz ON true
      WHERE qo.id = $1
    `, [id]);

    const row = result.rows[0];
    await client.query('COMMIT');
    res.json({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      objectType: row.object_type,
      climateSystem: row.climate_system,
      temperatureLimits: row.temperature_limits || { min: null, max: null },
      humidityLimits: row.humidity_limits || { min: null, max: null },
      measurementZones: row.measurement_zones || [],
      zones: row.zones || [],
      workSchedule: row.work_schedule || [],
      contractorId: row.contractor_id || undefined,
      contractor: row.contractor_name ? { name: row.contractor_name } : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

