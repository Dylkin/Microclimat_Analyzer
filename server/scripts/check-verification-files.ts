import { pool } from '../config/database.js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Скрипт для проверки файлов свидетельств о поверке в базе данных
 */
async function checkVerificationFiles() {
  try {
    console.log('🔍 Проверка файлов свидетельств о поверке в базе данных...\n');

    // 1. Общая статистика
    console.log('📊 Общая статистика:');
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_verifications,
        COUNT(verification_file_url) as verifications_with_file_url,
        COUNT(CASE WHEN verification_file_url IS NOT NULL AND verification_file_url != '' THEN 1 END) as verifications_with_non_empty_url,
        COUNT(CASE WHEN verification_file_url LIKE 'blob:%' THEN 1 END) as verifications_with_blob_url,
        COUNT(CASE WHEN verification_file_url LIKE '/uploads/%' OR verification_file_url LIKE 'http%' THEN 1 END) as verifications_with_server_url
      FROM equipment_verifications
    `);

    const stats = statsResult.rows[0];
    console.log(`  Всего верификаций: ${stats.total_verifications}`);
    console.log(`  С URL файла: ${stats.verifications_with_file_url}`);
    console.log(`  С непустым URL: ${stats.verifications_with_non_empty_url}`);
    console.log(`  ⚠️  С blob URL (требуют перезагрузки): ${stats.verifications_with_blob_url}`);
    console.log(`  ✅ С серверным URL: ${stats.verifications_with_server_url}`);
    console.log('');

    // 2. Оборудование с blob URL
    if (parseInt(stats.verifications_with_blob_url) > 0) {
      console.log('⚠️  Оборудование с blob URL (требует перезагрузки файлов):');
      const blobUrlResult = await pool.query(`
        SELECT 
          me.name as equipment_name,
          me.serial_number,
          ev.verification_file_url,
          ev.verification_file_name,
          ev.verification_start_date,
          ev.verification_end_date
        FROM equipment_verifications ev
        LEFT JOIN measurement_equipment me ON ev.equipment_id = me.id
        WHERE ev.verification_file_url LIKE 'blob:%'
        ORDER BY me.name
      `);

      blobUrlResult.rows.forEach((row: any) => {
        console.log(`  - ${row.equipment_name} (${row.serial_number || 'нет серийного номера'})`);
        console.log(`    Файл: ${row.verification_file_name || 'не указан'}`);
        console.log(`    URL: ${row.verification_file_url}`);
        console.log(`    Период: ${row.verification_start_date} - ${row.verification_end_date}`);
        console.log('');
      });
    }

    // 3. Оборудование с серверными URL
    if (parseInt(stats.verifications_with_server_url) > 0) {
      console.log('✅ Оборудование с серверными URL (файлы загружены на сервер):');
      const serverUrlResult = await pool.query(`
        SELECT 
          me.name as equipment_name,
          me.serial_number,
          ev.verification_file_url,
          ev.verification_file_name,
          ev.verification_start_date,
          ev.verification_end_date
        FROM equipment_verifications ev
        LEFT JOIN measurement_equipment me ON ev.equipment_id = me.id
        WHERE ev.verification_file_url LIKE '/uploads/%' OR ev.verification_file_url LIKE 'http%'
        ORDER BY me.name
      `);

      serverUrlResult.rows.forEach((row: any) => {
        console.log(`  - ${row.equipment_name} (${row.serial_number || 'нет серийного номера'})`);
        console.log(`    Файл: ${row.verification_file_name || 'не указан'}`);
        console.log(`    URL: ${row.verification_file_url}`);
        console.log(`    Период: ${row.verification_start_date} - ${row.verification_end_date}`);
        console.log('');
      });
    }

    // 4. Оборудование без файлов
    const noFileResult = await pool.query(`
      SELECT 
        me.name as equipment_name,
        me.serial_number,
        ev.verification_start_date,
        ev.verification_end_date
      FROM equipment_verifications ev
      LEFT JOIN measurement_equipment me ON ev.equipment_id = me.id
      WHERE ev.verification_file_url IS NULL OR ev.verification_file_url = ''
      ORDER BY me.name
    `);

    if (noFileResult.rows.length > 0) {
      console.log('📋 Оборудование без файлов верификации:');
      noFileResult.rows.forEach((row: any) => {
        console.log(`  - ${row.equipment_name} (${row.serial_number || 'нет серийного номера'})`);
        console.log(`    Период: ${row.verification_start_date} - ${row.verification_end_date}`);
        console.log('');
      });
    }

    // 5. Детальная информация по всем верификациям
    console.log('\n📋 Детальная информация по всем верификациям:');
    const detailResult = await pool.query(`
      SELECT 
        ev.id,
        me.name as equipment_name,
        me.serial_number,
        ev.verification_start_date,
        ev.verification_end_date,
        ev.verification_file_url,
        ev.verification_file_name,
        CASE 
          WHEN ev.verification_file_url IS NULL OR ev.verification_file_url = '' THEN 'Нет файла'
          WHEN ev.verification_file_url LIKE 'blob:%' THEN '⚠️ Blob URL (недействителен)'
          WHEN ev.verification_file_url LIKE '/uploads/%' THEN '✅ Серверный URL'
          WHEN ev.verification_file_url LIKE 'http%' THEN '✅ HTTP URL'
          ELSE '❓ Неизвестный формат'
        END as file_status,
        ev.created_at
      FROM equipment_verifications ev
      LEFT JOIN measurement_equipment me ON ev.equipment_id = me.id
      ORDER BY ev.created_at DESC
    `);

    detailResult.rows.forEach((row: any) => {
      console.log(`  ${row.file_status} ${row.equipment_name} (${row.serial_number || 'нет серийного номера'})`);
      if (row.verification_file_name) {
        console.log(`    Файл: ${row.verification_file_name}`);
      }
      if (row.verification_file_url && !row.verification_file_url.startsWith('blob:')) {
        console.log(`    URL: ${row.verification_file_url}`);
      }
      console.log(`    Период: ${row.verification_start_date} - ${row.verification_end_date}`);
      console.log(`    Создано: ${row.created_at}`);
      console.log('');
    });

    console.log('\n✅ Проверка завершена!');
  } catch (error: any) {
    console.error('❌ Ошибка при проверке файлов верификации:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Запуск скрипта
checkVerificationFiles()
  .then(() => {
    console.log('\n✅ Скрипт выполнен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка выполнения скрипта:', error);
    process.exit(1);
  });
