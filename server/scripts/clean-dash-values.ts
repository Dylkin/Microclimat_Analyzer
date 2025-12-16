import dotenv from 'dotenv';
import { pool } from '../config/database.js';

dotenv.config();

/**
 * Скрипт для очистки значений "—" и "-" из полей характеристик
 * Заменяет их на NULL
 */
async function cleanDashValues() {
  try {
    console.log('Очистка значений "—" и "-" из полей характеристик...\n');

    const fields = [
      { column: 'volume_step', name: 'Шаг установки объема дозы' },
      { column: 'dosing_accuracy', name: 'Точность дозирования' },
      { column: 'reproducibility', name: 'Воспроизводимость' }
    ];

    let totalUpdated = 0;

    for (const field of fields) {
      const result = await pool.query(`
        UPDATE equipment_cards
        SET ${field.column} = NULL, updated_at = NOW()
        WHERE ${field.column} IN ('—', '-', '')
        RETURNING id, name, ${field.column}
      `);

      const updated = result.rows.length;
      totalUpdated += updated;

      if (updated > 0) {
        console.log(`✓ ${field.name}: очищено ${updated} записей`);
      }
    }

    console.log(`\n✅ Очистка завершена!`);
    console.log(`Всего обновлено записей: ${totalUpdated}`);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanDashValues();



