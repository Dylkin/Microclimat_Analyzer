import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'microclimat',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Таблица для отслеживания примененных миграций
const createMigrationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
};

// Получение списка примененных миграций
const getAppliedMigrations = async (): Promise<string[]> => {
  const result = await pool.query('SELECT filename FROM schema_migrations ORDER BY filename');
  return result.rows.map(row => row.filename);
};

// Применение одной миграции
const applyMigration = async (filename: string, sql: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`✅ Применена миграция: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Основная функция
const main = async () => {
  try {
    console.log('🔄 Создание таблицы миграций...');
    await createMigrationsTable();

    console.log('📋 Получение списка примененных миграций...');
    const appliedMigrations = await getAppliedMigrations();
    console.log(`Найдено примененных миграций: ${appliedMigrations.length}`);

    // Путь к основному SQL файлу
    const setupSqlPath = path.join(__dirname, '../../database_setup.sql');
    
    // Проверяем основной файл
    if (await fs.access(setupSqlPath).then(() => true).catch(() => false)) {
      const setupFilename = 'database_setup.sql';
      if (!appliedMigrations.includes(setupFilename)) {
        console.log(`📄 Применение основного файла: ${setupFilename}`);
        const sql = await fs.readFile(setupSqlPath, 'utf-8');
        await applyMigration(setupFilename, sql);
      } else {
        console.log(`⏭️  Файл ${setupFilename} уже применен`);
      }
    }

    // Путь к папке миграций
    const migrationsDir = path.join(__dirname, '../../supabase/migrations');
    
    // Проверяем наличие папки миграций
    let migrationFiles: string[] = [];
    try {
      const files = await fs.readdir(migrationsDir);
      migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort()
        .filter(file => {
          // Всегда оставляем миграцию для статуса "not_suitable"
          if (file === '20251201000001_add_not_suitable_status.sql') return true;
          // Миграция для добавления типа "термоконтейнер"
          if (file === '20260130000000_add_thermocontainer_type.sql') return true;
          // Миграция для списка "Зоны хранения"
          if (file === '20260130000002_add_storage_zones.sql') return true;

          // Явно пропускаем проблемные/дублирующие миграции,
          // которые в standalone-режиме PostgreSQL вызывают ошибки:
          // - добавление статуса creating_report (мы задаём статус в database_setup.sql)
          // - создание audit_logs (таблица уже создаётся в database_setup.sql, там нет столбца timestamp)
          if (file === '20250101180000_add_creating_report_status.sql') return false;
          if (file === '20250102000000_create_audit_logs.sql') return false;

          // Оставляем все "ранние" структурные миграции (2025-01-01 .. 2025-01-02 и др. до Supabase-пакета)
          if (file < '20250700000000_') return true;

          // Все остальные (Supabase/политики/роль authenticated и т.п.) — пропускаем
          return false;
        });
    } catch (error) {
      console.log('⚠️  Папка миграций не найдена, пропускаем');
    }

    // Применяем миграции из папки
    for (const file of migrationFiles) {
      if (appliedMigrations.includes(file)) {
        console.log(`⏭️  Миграция ${file} уже применена`);
        continue;
      }

      console.log(`📄 Применение миграции: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf-8');
      
      try {
        await applyMigration(file, sql);
      } catch (error: any) {
        console.error(`❌ Ошибка применения миграции ${file}:`, error.message);
        // Продолжаем с другими миграциями
      }
    }

    console.log('✅ Все миграции применены успешно!');

    // Автоматическое добавление тестовых логгеров после миграций
    console.log('\n📦 Добавление тестовых логгеров...');
    await addTestoLoggers();
  } catch (error) {
    console.error('❌ Ошибка применения миграций:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Функция добавления тестовых логгеров
const addTestoLoggers = async () => {
  try {
    // Проверяем, существует ли таблица measurement_equipment
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'measurement_equipment'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⏭️  Таблица measurement_equipment не найдена, пропускаем добавление логгеров');
      return;
    }

    // Проверяем, есть ли уже записи
    const existingCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM measurement_equipment
      WHERE type IN ('Testo 174T', 'Testo 174H')
        AND (name LIKE 'DL-%' OR serial_number LIKE 'DL-%')
    `);

    const existing = parseInt(existingCount.rows[0].count);
    if (existing >= 200) {
      console.log(`⏭️  Логгеры уже добавлены (найдено ${existing} записей), пропускаем`);
      return;
    }

    console.log('Добавление логгеров Testo 174T и Testo 174H...');

    // Добавляем 100 логгеров Testo 174T (DL-001 до DL-100)
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
        AND (name LIKE 'DL-%' OR serial_number LIKE 'DL-%')
      GROUP BY type
    `);

    console.log('\nИтоговая статистика логгеров:');
    countResult.rows.forEach((row: any) => {
      console.log(`  ${row.type}: ${row.count} записей`);
    });

    console.log('✅ Логгеры успешно добавлены!');
  } catch (error: any) {
    console.error('⚠️  Ошибка при добавлении логгеров:', error.message);
    // Не прерываем процесс развертывания из-за ошибки добавления логгеров
    console.log('Продолжаем развертывание...');
  }
};

main();

