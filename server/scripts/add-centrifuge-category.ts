/**
 * Скрипт для добавления категории "Лабораторные центрифуги"
 * с предустановленными техническими характеристиками
 */

import { pool } from '../config/database.js';

async function addCentrifugeCategory() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Проверяем, существует ли уже категория
    const checkResult = await client.query(
      'SELECT id FROM equipment_sections WHERE name = $1',
      ['Лабораторные центрифуги']
    );

    if (checkResult.rows.length > 0) {
      console.log('Категория "Лабораторные центрифуги" уже существует');
      await client.query('ROLLBACK');
      return;
    }

    // Создаем технические характеристики
    const technicalSpecsRanges = {
      maxRotationSpeed: {
        enabled: true,
        values: ['4000', '5000', '6000', '7000', '15000']
      },
      centrifugalAcceleration: {
        enabled: true,
        values: ['2325', '2420', '2600', '2680', '4390', '5120', '15100', '21380']
      },
      rotorType: {
        enabled: true,
        values: ['угловой', 'горизонтальный/качающийся', 'блочный', 'зональный', 'вертикальный']
      },
      speedStep: {
        enabled: true,
        values: ['1–10', '10–100', '500-1000']
      },
      seatingPlaces: {
        enabled: true,
        values: []
      },
      accelerationTime: {
        enabled: true,
        values: []
      },
      maxCapacity: {
        enabled: true,
        values: []
      },
      compatibleTubeTypes: {
        enabled: true,
        values: [
          'Eppendorf 0.2 мл',
          'Eppendorf 0.5 мл',
          'Eppendorf 1.5 мл',
          'Eppendorf 2 мл',
          'Falcon 15 мл',
          'Falcon 50 мл',
          'цилиндрические',
          'гематологические',
          'ПЦР',
          'другие'
        ]
      }
    };

    // Вставляем категорию
    const result = await client.query(
      `INSERT INTO equipment_sections 
       (name, description, technical_specs_ranges, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, name`,
      [
        'Лабораторные центрифуги',
        'Категория лабораторных центрифуг с техническими характеристиками',
        JSON.stringify(technicalSpecsRanges)
      ]
    );

    await client.query('COMMIT');
    
    console.log('✅ Категория "Лабораторные центрифуги" успешно добавлена');
    console.log(`ID: ${result.rows[0].id}`);
    console.log(`Название: ${result.rows[0].name}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка при добавлении категории:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addCentrifugeCategory()
  .then(() => {
    console.log('Скрипт выполнен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка выполнения скрипта:', error);
    process.exit(1);
  });


