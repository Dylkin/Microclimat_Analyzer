/**
 * Переносит все категории и товары из dev БД в prod БД.
 *
 * Запуск:
 *  DEV_DATABASE_URL=postgres://... PROD_DATABASE_URL=postgres://... npx tsx server/scripts/sync-all-products-dev-to-prod.ts
 *
 * Поведение:
 *  - Переносит все категории (equipment_sections) из dev в prod
 *  - Переносит все товары (equipment_cards) из dev в prod
 *  - Создает маппинг ID категорий (dev -> prod)
 *  - Обновляет существующие записи при конфликте по имени
 *  - Сохраняет все поля, включая JSONB (technical_specs_ranges, manufacturer_suppliers, specifications)
 */

import 'dotenv/config';
import { Pool } from 'pg';

function createPool(urlEnv: string | undefined, label: string) {
  if (!urlEnv) {
    throw new Error(`Не указана строка подключения для ${label}. Установите ${label === 'dev' ? 'DEV_DATABASE_URL' : 'PROD_DATABASE_URL'}.`);
  }
  return new Pool({ connectionString: urlEnv });
}

interface EquipmentSectionRow {
  id: string;
  name: string;
  description: string | null;
  manufacturers: any;
  website: string | null;
  supplier_ids: any;
  manufacturer_suppliers: any;
  channels_count: number | null;
  dosing_volume: string | null;
  volume_step: string | null;
  dosing_accuracy: string | null;
  reproducibility: string | null;
  autoclavable: boolean | null;
  in_registry_si: boolean | null;
  technical_specs_ranges: any;
  created_at: Date;
  updated_at: Date;
}

interface EquipmentCardRow {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  manufacturer: string | null;
  series: string | null;
  model: string | null;
  channels_count: number | null;
  dosing_volume: string | null;
  volume_step: string | null;
  dosing_accuracy: string | null;
  reproducibility: string | null;
  autoclavable: boolean | null;
  specifications: any;
  image_url: string | null;
  external_url: string | null;
  created_at: Date;
  updated_at: Date;
}

async function checkColumnExists(pool: Pool, tableName: string, columnName: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT column_name 
     FROM information_schema.columns 
     WHERE table_schema = 'public' 
     AND table_name = $1 
     AND column_name = $2`,
    [tableName, columnName]
  );
  return res.rows.length > 0;
}

async function fetchDevSections(devPool: Pool): Promise<EquipmentSectionRow[]> {
  // Проверяем наличие всех колонок
  const hasManufacturerSuppliers = await checkColumnExists(devPool, 'equipment_sections', 'manufacturer_suppliers');
  const hasTechnicalSpecsRanges = await checkColumnExists(devPool, 'equipment_sections', 'technical_specs_ranges');
  const hasInRegistrySI = await checkColumnExists(devPool, 'equipment_sections', 'in_registry_si');
  const hasChannelsCount = await checkColumnExists(devPool, 'equipment_sections', 'channels_count');
  const hasDosingVolume = await checkColumnExists(devPool, 'equipment_sections', 'dosing_volume');
  const hasVolumeStep = await checkColumnExists(devPool, 'equipment_sections', 'volume_step');
  const hasDosingAccuracy = await checkColumnExists(devPool, 'equipment_sections', 'dosing_accuracy');
  const hasReproducibility = await checkColumnExists(devPool, 'equipment_sections', 'reproducibility');
  const hasAutoclavable = await checkColumnExists(devPool, 'equipment_sections', 'autoclavable');
  
  let selectColumns = 'id, name, description, manufacturers, website, supplier_ids, created_at, updated_at';
  
  if (hasChannelsCount) {
    selectColumns += ', channels_count';
  }
  if (hasDosingVolume) {
    selectColumns += ', dosing_volume';
  }
  if (hasVolumeStep) {
    selectColumns += ', volume_step';
  }
  if (hasDosingAccuracy) {
    selectColumns += ', dosing_accuracy';
  }
  if (hasReproducibility) {
    selectColumns += ', reproducibility';
  }
  if (hasAutoclavable) {
    selectColumns += ', autoclavable';
  }
  if (hasManufacturerSuppliers) {
    selectColumns += ', manufacturer_suppliers';
  }
  if (hasTechnicalSpecsRanges) {
    selectColumns += ', technical_specs_ranges';
  }
  if (hasInRegistrySI) {
    selectColumns += ', in_registry_si';
  }
  
  const res = await devPool.query<EquipmentSectionRow>(
    `SELECT ${selectColumns}
     FROM equipment_sections
     ORDER BY created_at`
  );
  return res.rows;
}

async function fetchDevCards(devPool: Pool): Promise<EquipmentCardRow[]> {
  // Проверяем наличие колонки model (старое название) или series (новое название)
  const hasModel = await checkColumnExists(devPool, 'equipment_cards', 'model');
  const hasSeries = await checkColumnExists(devPool, 'equipment_cards', 'series');
  
  let selectColumns = `id, section_id, name, description, manufacturer,
            channels_count, dosing_volume, volume_step, dosing_accuracy,
            reproducibility, autoclavable, specifications, image_url, external_url,
            created_at, updated_at`;
  
  if (hasSeries) {
    selectColumns += ', series';
  } else if (hasModel) {
    selectColumns += ', model';
  }
  
  const res = await devPool.query<EquipmentCardRow>(
    `SELECT ${selectColumns}
     FROM equipment_cards
     ORDER BY created_at`
  );
  return res.rows;
}

async function syncSections(
  devPool: Pool,
  prodPool: Pool,
  devSections: EquipmentSectionRow[]
): Promise<Map<string, string>> {
  const sectionIdMapping = new Map<string, string>();
  let created = 0;
  let updated = 0;
  
  // Проверяем наличие колонок в prod
  const hasManufacturerSuppliers = await checkColumnExists(prodPool, 'equipment_sections', 'manufacturer_suppliers');
  const hasTechnicalSpecsRanges = await checkColumnExists(prodPool, 'equipment_sections', 'technical_specs_ranges');
  const hasInRegistrySI = await checkColumnExists(prodPool, 'equipment_sections', 'in_registry_si');
  const hasChannelsCount = await checkColumnExists(prodPool, 'equipment_sections', 'channels_count');
  const hasDosingVolume = await checkColumnExists(prodPool, 'equipment_sections', 'dosing_volume');
  const hasVolumeStep = await checkColumnExists(prodPool, 'equipment_sections', 'volume_step');
  const hasDosingAccuracy = await checkColumnExists(prodPool, 'equipment_sections', 'dosing_accuracy');
  const hasReproducibility = await checkColumnExists(prodPool, 'equipment_sections', 'reproducibility');
  const hasAutoclavable = await checkColumnExists(prodPool, 'equipment_sections', 'autoclavable');
  
  for (const section of devSections) {
    try {
      // Формируем список колонок и значений для INSERT
      const columns: string[] = ['name', 'description', 'manufacturers', 'website', 'supplier_ids'];
      const values: any[] = [
        section.name,
        section.description,
        section.manufacturers || [],
        section.website,
        section.supplier_ids || []
      ];
      let paramIndex = values.length + 1;
      
      if (hasManufacturerSuppliers) {
        columns.push('manufacturer_suppliers');
        // Убеждаемся, что значение правильно сериализовано для JSONB
        const manufacturerSuppliersValue = section.manufacturer_suppliers;
        if (manufacturerSuppliersValue === null || manufacturerSuppliersValue === undefined) {
          values.push([]);
        } else if (typeof manufacturerSuppliersValue === 'string') {
          try {
            values.push(JSON.parse(manufacturerSuppliersValue));
          } catch {
            values.push([]);
          }
        } else {
          values.push(manufacturerSuppliersValue);
        }
        paramIndex++;
      }
      
      if (hasTechnicalSpecsRanges) {
        columns.push('technical_specs_ranges');
        // Убеждаемся, что значение правильно сериализовано для JSONB
        const technicalSpecsValue = section.technical_specs_ranges;
        if (technicalSpecsValue === null || technicalSpecsValue === undefined) {
          values.push({});
        } else if (typeof technicalSpecsValue === 'string') {
          try {
            values.push(JSON.parse(technicalSpecsValue));
          } catch {
            values.push({});
          }
        } else {
          values.push(technicalSpecsValue);
        }
        paramIndex++;
      }
      
      if (hasInRegistrySI) {
        columns.push('in_registry_si');
        values.push(section.in_registry_si || false);
        paramIndex++;
      }
      
      // Добавляем базовые поля, если они есть в prod и в данных
      if (hasChannelsCount && section.channels_count !== null && section.channels_count !== undefined) {
        columns.push('channels_count');
        values.push(section.channels_count);
        paramIndex++;
      }
      if (hasDosingVolume && section.dosing_volume !== null) {
        columns.push('dosing_volume');
        values.push(section.dosing_volume);
        paramIndex++;
      }
      if (hasVolumeStep && section.volume_step !== null) {
        columns.push('volume_step');
        values.push(section.volume_step);
        paramIndex++;
      }
      if (hasDosingAccuracy && section.dosing_accuracy !== null) {
        columns.push('dosing_accuracy');
        values.push(section.dosing_accuracy);
        paramIndex++;
      }
      if (hasReproducibility && section.reproducibility !== null) {
        columns.push('reproducibility');
        values.push(section.reproducibility);
        paramIndex++;
      }
      if (hasAutoclavable && section.autoclavable !== null) {
        columns.push('autoclavable');
        values.push(section.autoclavable);
        paramIndex++;
      }
      
      // Формируем UPDATE часть для ON CONFLICT
      const updateParts = columns
        .filter(col => col !== 'name') // name не обновляем, т.к. это ключ конфликта
        .map((col, idx) => `${col} = EXCLUDED.${col}`)
        .join(', ');
      
      const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
      
      const query = `
        INSERT INTO equipment_sections (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (name)
        DO UPDATE SET ${updateParts}, updated_at = NOW()
        RETURNING id
      `;
      
      const result = await prodPool.query(query, values);
      const prodSectionId = result.rows[0].id;
      sectionIdMapping.set(section.id, prodSectionId);
      
      // Проверяем, была ли это новая запись или обновление
      const checkResult = await prodPool.query(
        'SELECT created_at, updated_at FROM equipment_sections WHERE id = $1',
        [prodSectionId]
      );
      const row = checkResult.rows[0];
      const createdAt = new Date(row.created_at);
      const updatedAt = new Date(row.updated_at);
      
      // Если created_at и updated_at почти одинаковы, значит это новая запись
      if (Math.abs(createdAt.getTime() - updatedAt.getTime()) < 2000) {
        created++;
        console.log(`  ✅ Создана категория: ${section.name}`);
      } else {
        updated++;
        console.log(`  🔄 Обновлена категория: ${section.name}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Ошибка при переносе категории "${section.name}":`, error.message);
      if (error.detail) {
        console.error(`     Детали: ${error.detail}`);
      }
      if (error.hint) {
        console.error(`     Подсказка: ${error.hint}`);
      }
      // Пытаемся вставить без проблемных JSONB полей
      try {
        console.log(`  🔄 Попытка вставки без JSONB полей...`);
        const simpleColumns = ['name', 'description', 'manufacturers', 'website', 'supplier_ids'];
        const simpleValues = [
          section.name,
          section.description,
          section.manufacturers || [],
          section.website,
          section.supplier_ids || []
        ];
        
        const simpleQuery = `
          INSERT INTO equipment_sections (${simpleColumns.join(', ')})
          VALUES (${simpleValues.map((_, idx) => `$${idx + 1}`).join(', ')})
          ON CONFLICT (name)
          DO UPDATE SET description = EXCLUDED.description,
                        manufacturers = EXCLUDED.manufacturers,
                        website = EXCLUDED.website,
                        supplier_ids = EXCLUDED.supplier_ids,
                        updated_at = NOW()
          RETURNING id
        `;
        
        const simpleResult = await prodPool.query(simpleQuery, simpleValues);
        const prodSectionId = simpleResult.rows[0].id;
        sectionIdMapping.set(section.id, prodSectionId);
        console.log(`  ✅ Категория "${section.name}" создана/обновлена без JSONB полей`);
        updated++;
      } catch (simpleError: any) {
        console.error(`  ❌ Критическая ошибка при вставке категории "${section.name}":`, simpleError.message);
      }
    }
  }
  
  console.log(`\n📊 Категории: создано ${created}, обновлено ${updated}`);
  return sectionIdMapping;
}

async function syncCards(
  prodPool: Pool,
  devCards: EquipmentCardRow[],
  sectionIdMapping: Map<string, string>
): Promise<void> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const card of devCards) {
    try {
      const prodSectionId = sectionIdMapping.get(card.section_id);
      
      if (!prodSectionId) {
        console.log(`  ⚠️  Пропущена карточка "${card.name}" - категория не найдена в prod`);
        skipped++;
        continue;
      }
      
      const columns: string[] = ['section_id', 'name'];
      const values: any[] = [prodSectionId, card.name];
      
      // Добавляем опциональные поля
      if (card.description !== null) {
        columns.push('description');
        values.push(card.description);
      }
      if (card.manufacturer !== null) {
        columns.push('manufacturer');
        values.push(card.manufacturer);
      }
      // Обрабатываем series/model (model было переименовано в series)
      if (card.series !== null && card.series !== undefined) {
        columns.push('series');
        values.push(card.series);
      } else if (card.model !== null && card.model !== undefined) {
        // Если есть только model (старое поле), используем его как series
        columns.push('series');
        values.push(card.model);
      }
      if (card.channels_count !== null) {
        columns.push('channels_count');
        values.push(card.channels_count);
      }
      if (card.dosing_volume !== null) {
        columns.push('dosing_volume');
        values.push(card.dosing_volume);
      }
      if (card.volume_step !== null) {
        columns.push('volume_step');
        values.push(card.volume_step);
      }
      if (card.dosing_accuracy !== null) {
        columns.push('dosing_accuracy');
        values.push(card.dosing_accuracy);
      }
      if (card.reproducibility !== null) {
        columns.push('reproducibility');
        values.push(card.reproducibility);
      }
      if (card.autoclavable !== null) {
        columns.push('autoclavable');
        values.push(card.autoclavable);
      }
      if (card.specifications !== null && card.specifications !== undefined) {
        columns.push('specifications');
        // Убеждаемся, что значение правильно сериализовано для JSONB
        const specsValue = card.specifications;
        if (typeof specsValue === 'string') {
          try {
            values.push(JSON.parse(specsValue));
          } catch {
            values.push({});
          }
        } else {
          values.push(specsValue || {});
        }
      }
      if (card.image_url !== null) {
        columns.push('image_url');
        values.push(card.image_url);
      }
      if (card.external_url !== null) {
        columns.push('external_url');
        values.push(card.external_url);
      }
      
      const updateParts = columns
        .filter(col => col !== 'section_id' && col !== 'name')
        .map((col, idx) => {
          const colIndex = columns.indexOf(col);
          return `${col} = EXCLUDED.${col}`;
        })
        .join(', ');
      
      const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
      
      const query = `
        INSERT INTO equipment_cards (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (section_id, name)
        DO UPDATE SET ${updateParts}, updated_at = NOW()
        RETURNING id, created_at, updated_at
      `;
      
      const result = await prodPool.query(query, values);
      const row = result.rows[0];
      const createdAt = new Date(row.created_at);
      const updatedAt = new Date(row.updated_at);
      
      if (Math.abs(createdAt.getTime() - updatedAt.getTime()) < 2000) {
        created++;
        console.log(`  ✅ Создана карточка: ${card.name}`);
      } else {
        updated++;
        console.log(`  🔄 Обновлена карточка: ${card.name}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Ошибка при переносе карточки "${card.name}":`, error.message);
    }
  }
  
  console.log(`\n📊 Карточки: создано ${created}, обновлено ${updated}, пропущено ${skipped}`);
}

async function main() {
  console.log('🚀 Начало переноса данных из DEV в PROD\n');
  
  const devPool = createPool(process.env.DEV_DATABASE_URL, 'dev');
  const prodPool = createPool(process.env.PROD_DATABASE_URL, 'prod');
  
  try {
    // Проверка подключений
    console.log('🔍 Проверка подключений...');
    await devPool.query('SELECT NOW()');
    console.log('✅ Подключение к DEV базе установлено');
    await prodPool.query('SELECT NOW()');
    console.log('✅ Подключение к PROD базе установлено\n');
    
    // Загрузка категорий из dev
    console.log('📥 Загрузка категорий из DEV...');
    const devSections = await fetchDevSections(devPool);
    console.log(`✅ Найдено категорий: ${devSections.length}\n`);
    
    if (devSections.length === 0) {
      console.log('⚠️  В dev базе нет категорий для переноса.');
      return;
    }
    
    // Загрузка карточек из dev
    console.log('📥 Загрузка карточек из DEV...');
    const devCards = await fetchDevCards(devPool);
    console.log(`✅ Найдено карточек: ${devCards.length}\n`);
    
    // Синхронизация категорий
    console.log('📤 Синхронизация категорий...');
    const sectionIdMapping = await syncSections(devPool, prodPool, devSections);
    
    // Синхронизация карточек
    if (devCards.length > 0) {
      console.log('\n📤 Синхронизация карточек...');
      await syncCards(prodPool, devCards, sectionIdMapping);
    }
    
    console.log('\n✅ Перенос данных завершен успешно!');
  } catch (error: any) {
    console.error('\n❌ Ошибка при переносе данных:', error);
    process.exit(1);
  } finally {
    await devPool.end();
    await prodPool.end();
  }
}

main().catch((err) => {
  console.error('Критическая ошибка:', err);
  process.exit(1);
});
