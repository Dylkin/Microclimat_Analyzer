import { pool } from '../config/database.js';
import { readdir, rename, stat } from 'fs/promises';
import { join } from 'path';

/**
 * Скрипт для исправления имен файлов верификации (замена пробелов на подчеркивания)
 * и обновления URL в базе данных
 */
async function fixVerificationFileNames() {
  try {
    console.log('🔧 Исправление имен файлов верификации...\n');

    const uploadsDir = join(process.cwd(), 'uploads', 'documents', 'equipment-verifications');
    
    // Получаем все файлы верификации
    const files = await readdir(uploadsDir);
    console.log(`Найдено файлов: ${files.length}\n`);

    let renamedCount = 0;
    let updatedCount = 0;

    for (const file of files) {
      // Проверяем, есть ли пробелы в имени файла
      if (file.includes(' ')) {
        const oldPath = join(uploadsDir, file);
        const newFileName = file.replace(/\s+/g, '_');
        const newPath = join(uploadsDir, newFileName);

        try {
          // Переименовываем файл
          await rename(oldPath, newPath);
          console.log(`✅ Переименован: ${file} → ${newFileName}`);

          // Обновляем URL в базе данных
          const oldUrl = `/uploads/documents/equipment-verifications/${file}`;
          const newUrl = `/uploads/documents/equipment-verifications/${newFileName}`;

          const result = await pool.query(
            `UPDATE equipment_verifications 
             SET verification_file_url = $1 
             WHERE verification_file_url = $2`,
            [newUrl, oldUrl]
          );

          if (result.rowCount && result.rowCount > 0) {
            console.log(`   Обновлено записей в БД: ${result.rowCount}`);
            updatedCount += result.rowCount;
          }

          renamedCount++;
        } catch (error: any) {
          console.error(`❌ Ошибка при переименовании ${file}:`, error.message);
        }
      }
    }

    console.log(`\n✅ Завершено!`);
    console.log(`   Переименовано файлов: ${renamedCount}`);
    console.log(`   Обновлено записей в БД: ${updatedCount}`);
  } catch (error: any) {
    console.error('❌ Ошибка при исправлении имен файлов:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Запуск скрипта
fixVerificationFileNames()
  .then(() => {
    console.log('\n✅ Скрипт выполнен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка выполнения скрипта:', error);
    process.exit(1);
  });
