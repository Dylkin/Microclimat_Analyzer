import { pool } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function addTestoLoggers() {
  try {
    console.log('Добавление логгеров Testo 174T и Testo 174H...');

    // Проверяем, существует ли таблица measurement_equipment
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'measurement_equipment'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('Таблица measurement_equipment не найдена. Сначала создайте таблицу.');
      process.exit(1);
    }

    // Добавляем 100 логгеров Testo 174T (DL-001 до DL-100)
    console.log('Добавление 100 логгеров Testo 174T...');
    const testo174TValues: string[] = [];
    const testo174TParams: any[] = [];
    let paramIndex = 1;

    for (let n = 1; n <= 100; n++) {
      const name = `DL-${String(n).padStart(3, '0')}`;
      const serialNumber = name;
      
      testo174TValues.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      testo174TParams.push('Testo 174T', name, serialNumber);
    }

    await pool.query(`
      INSERT INTO measurement_equipment (type, name, serial_number)
      VALUES ${testo174TValues.join(', ')}
      ON CONFLICT (serial_number) DO NOTHING
    `, testo174TParams);

    console.log('✓ Добавлено 100 логгеров Testo 174T');

    // Добавляем 100 логгеров Testo 174H (DL-201 до DL-300)
    console.log('Добавление 100 логгеров Testo 174H...');
    const testo174HValues: string[] = [];
    const testo174HParams: any[] = [];
    paramIndex = 1;

    for (let n = 1; n <= 100; n++) {
      const name = `DL-${String(n + 200).padStart(3, '0')}`;
      const serialNumber = name;
      
      testo174HValues.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      testo174HParams.push('Testo 174H', name, serialNumber);
    }

    await pool.query(`
      INSERT INTO measurement_equipment (type, name, serial_number)
      VALUES ${testo174HValues.join(', ')}
      ON CONFLICT (serial_number) DO NOTHING
    `, testo174HParams);

    console.log('✓ Добавлено 100 логгеров Testo 174H');

    // Проверяем количество добавленных записей
    const countResult = await pool.query(`
      SELECT type, COUNT(*) as count
      FROM measurement_equipment
      WHERE type IN ('Testo 174T', 'Testo 174H')
      GROUP BY type
    `);

    console.log('\nИтоговая статистика:');
    countResult.rows.forEach((row: any) => {
      console.log(`  ${row.type}: ${row.count} записей`);
    });

    console.log('\n✅ Все логгеры успешно добавлены!');
    process.exit(0);
  } catch (error: any) {
    console.error('Ошибка при добавлении логгеров:', error);
    console.error('Детали:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    process.exit(1);
  }
}

addTestoLoggers();


