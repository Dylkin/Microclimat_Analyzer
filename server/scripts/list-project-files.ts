import { pool } from '../config/database.js';

async function listProjectFiles(projectName: string) {
  try {
    console.log(`Поиск проекта: "${projectName}"...`);
    
    // Находим проект по имени
    const projectResult = await pool.query(
      'SELECT id, name FROM projects WHERE name = $1',
      [projectName]
    );

    if (projectResult.rows.length === 0) {
      console.log(`Проект "${projectName}" не найден.`);
      return;
    }

    const project = projectResult.rows[0];
    console.log(`\nПроект найден: ${project.name} (ID: ${project.id})\n`);
    console.log('='.repeat(80));

    // 1. Файлы из централизованной таблицы project_files
    console.log('\n1. ФАЙЛЫ ИЗ ЦЕНТРАЛИЗОВАННОЙ ТАБЛИЦЫ (project_files):');
    console.log('-'.repeat(80));
    try {
      const projectFilesResult = await pool.query(
        `SELECT 
          id, file_type, file_category, file_name, original_file_name,
          file_url, file_path, file_size, mime_type, related_table, related_id,
          uploaded_at, created_at
        FROM project_files 
        WHERE project_id = $1
        ORDER BY uploaded_at DESC`,
        [project.id]
      );

      if (projectFilesResult.rows.length === 0) {
        console.log('  Нет файлов в централизованной таблице.');
      } else {
        projectFilesResult.rows.forEach((file: any, index: number) => {
          console.log(`\n  ${index + 1}. ${file.file_name}`);
          console.log(`     Тип: ${file.file_type} | Категория: ${file.file_category || 'N/A'}`);
          console.log(`     URL: ${file.file_url || 'N/A'}`);
          console.log(`     Путь: ${file.file_path || 'N/A'}`);
          console.log(`     Размер: ${file.file_size ? (file.file_size / 1024).toFixed(2) + ' KB' : 'N/A'}`);
          console.log(`     MIME: ${file.mime_type || 'N/A'}`);
          console.log(`     Связанная таблица: ${file.related_table || 'N/A'}`);
          console.log(`     Загружено: ${file.uploaded_at ? new Date(file.uploaded_at).toLocaleString('ru-RU') : 'N/A'}`);
        });
      }
    } catch (error: any) {
      if (error.code === '42P01') {
        console.log('  Таблица project_files не существует.');
      } else {
        console.error('  Ошибка:', error.message);
      }
    }

    // 2. Документы проекта (project_documents)
    console.log('\n\n2. ДОКУМЕНТЫ ПРОЕКТА (project_documents):');
    console.log('-'.repeat(80));
    const documentsResult = await pool.query(
      `SELECT 
        id, document_type, file_name, file_url, file_path, 
        file_size, mime_type, approval_status, uploaded_at, created_at
      FROM project_documents 
      WHERE project_id = $1
      ORDER BY uploaded_at DESC`,
      [project.id]
    );

    if (documentsResult.rows.length === 0) {
      console.log('  Нет документов проекта.');
    } else {
      documentsResult.rows.forEach((doc: any, index: number) => {
        console.log(`\n  ${index + 1}. ${doc.file_name}`);
        console.log(`     Тип документа: ${doc.document_type}`);
        console.log(`     URL: ${doc.file_url || 'N/A'}`);
        console.log(`     Путь: ${doc.file_path || 'N/A'}`);
        console.log(`     Размер: ${doc.file_size ? (doc.file_size / 1024).toFixed(2) + ' KB' : 'N/A'}`);
        console.log(`     Статус согласования: ${doc.approval_status}`);
        console.log(`     Загружено: ${doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString('ru-RU') : 'N/A'}`);
      });
    }

    // 3. Файлы планов объектов квалификации
    console.log('\n\n3. ФАЙЛЫ ПЛАНОВ ОБЪЕКТОВ КВАЛИФИКАЦИИ (qualification_objects):');
    console.log('-'.repeat(80));
    
    // Получаем объекты квалификации, связанные с проектом
    const objectsResult = await pool.query(
      `SELECT 
        qo.id, qo.name, qo.plan_file_url, qo.plan_file_name,
        qo.test_data_file_url, qo.test_data_file_name
      FROM qualification_objects qo
      LEFT JOIN project_qualification_objects pqo ON qo.id = pqo.qualification_object_id
      WHERE pqo.project_id = $1 OR qo.project_id = $1
      ORDER BY qo.name`,
      [project.id]
    );

    if (objectsResult.rows.length === 0) {
      console.log('  Нет объектов квалификации, связанных с проектом.');
    } else {
      objectsResult.rows.forEach((obj: any, index: number) => {
        console.log(`\n  Объект ${index + 1}: ${obj.name || 'Без названия'} (ID: ${obj.id})`);
        if (obj.plan_file_url || obj.plan_file_name) {
          console.log(`    План объекта:`);
          console.log(`      Имя: ${obj.plan_file_name || 'N/A'}`);
          console.log(`      URL: ${obj.plan_file_url || 'N/A'}`);
        }
        if (obj.test_data_file_url || obj.test_data_file_name) {
          console.log(`    Тестовые данные:`);
          console.log(`      Имя: ${obj.test_data_file_name || 'N/A'}`);
          console.log(`      URL: ${obj.test_data_file_url || 'N/A'}`);
        }
        if (!obj.plan_file_url && !obj.plan_file_name && !obj.test_data_file_url && !obj.test_data_file_name) {
          console.log(`    Нет файлов.`);
        }
      });
    }

    // 4. Файлы данных логгеров (logger_data_summary)
    console.log('\n\n4. ФАЙЛЫ ДАННЫХ ЛОГГЕРОВ (logger_data_summary):');
    console.log('-'.repeat(80));
    const loggerDataResult = await pool.query(
      `SELECT 
        id, zone_number, measurement_level, logger_name, file_name,
        device_type, device_model, serial_number, start_date, end_date,
        record_count, parsing_status, error_message, created_at
      FROM logger_data_summary 
      WHERE project_id = $1
      ORDER BY created_at DESC`,
      [project.id]
    );

    if (loggerDataResult.rows.length === 0) {
      console.log('  Нет файлов данных логгеров.');
    } else {
      loggerDataResult.rows.forEach((log: any, index: number) => {
        console.log(`\n  ${index + 1}. ${log.file_name || 'Без имени'}`);
        console.log(`     Зона: ${log.zone_number || 'N/A'} | Уровень: ${log.measurement_level || 'N/A'}`);
        console.log(`     Логгер: ${log.logger_name || 'N/A'}`);
        console.log(`     Устройство: ${log.device_model || 'N/A'} (${log.serial_number || 'N/A'})`);
        console.log(`     Период: ${log.start_date ? new Date(log.start_date).toLocaleString('ru-RU') : 'N/A'} - ${log.end_date ? new Date(log.end_date).toLocaleString('ru-RU') : 'N/A'}`);
        console.log(`     Записей: ${log.record_count || 0}`);
        console.log(`     Статус обработки: ${log.parsing_status || 'N/A'}`);
        if (log.error_message) {
          console.log(`     Ошибка: ${log.error_message}`);
        }
      });
    }

    // 5. Загруженные файлы (uploaded_files)
    console.log('\n\n5. ЗАГРУЖЕННЫЕ ФАЙЛЫ (uploaded_files):');
    console.log('-'.repeat(80));
    const uploadedFilesResult = await pool.query(
      `SELECT 
        id, file_name, file_path, file_type, file_size, mime_type,
        status, error_message, created_at
      FROM uploaded_files 
      WHERE project_id = $1
      ORDER BY created_at DESC`,
      [project.id]
    );

    if (uploadedFilesResult.rows.length === 0) {
      console.log('  Нет загруженных файлов.');
    } else {
      uploadedFilesResult.rows.forEach((file: any, index: number) => {
        console.log(`\n  ${index + 1}. ${file.file_name}`);
        console.log(`     Тип: ${file.file_type}`);
        console.log(`     Путь: ${file.file_path}`);
        console.log(`     Размер: ${file.file_size ? (file.file_size / 1024).toFixed(2) + ' KB' : 'N/A'}`);
        console.log(`     Статус: ${file.status}`);
        if (file.error_message) {
          console.log(`     Ошибка: ${file.error_message}`);
        }
        console.log(`     Загружено: ${file.created_at ? new Date(file.created_at).toLocaleString('ru-RU') : 'N/A'}`);
      });
    }

    // Итоговая статистика
    console.log('\n\n' + '='.repeat(80));
    console.log('ИТОГОВАЯ СТАТИСТИКА:');
    console.log('-'.repeat(80));
    console.log(`Проект: ${project.name}`);
    console.log(`ID проекта: ${project.id}`);
    console.log(`Документов проекта: ${documentsResult.rows.length}`);
    console.log(`Объектов квалификации: ${objectsResult.rows.length}`);
    console.log(`Файлов данных логгеров: ${loggerDataResult.rows.length}`);
    console.log(`Загруженных файлов: ${uploadedFilesResult.rows.length}`);
    
    try {
      const projectFilesCount = await pool.query(
        'SELECT COUNT(*) as count FROM project_files WHERE project_id = $1',
        [project.id]
      );
      console.log(`Файлов в централизованной таблице: ${projectFilesCount.rows[0].count}`);
    } catch (error: any) {
      if (error.code !== '42P01') {
        console.log(`Файлов в централизованной таблице: таблица не существует`);
      }
    }

    console.log('='.repeat(80));

  } catch (error) {
    console.error('Ошибка при получении файлов проекта:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Получаем имя проекта из аргументов командной строки или используем значение по умолчанию
let projectName = 'Тест - Склад №2';
if (process.argv.length > 2) {
  // Объединяем все аргументы после имени скрипта
  projectName = process.argv.slice(2).join(' ');
}

listProjectFiles(projectName);

